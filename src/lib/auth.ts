import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { getDbClient } from '@/lib/db';

export interface User {
  id: number;
  username: string;
  email?: string;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  session_token: string;
  csrf_token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  message: string;
  requiresPasswordChange?: boolean;
}

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_MIN_LENGTH = 8;


export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(password + salt, 12);
  return { hash, salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  return await bcrypt.compare(password + salt, hash);
}

export async function generateSessionToken(): Promise<string> {
  return randomBytes(64).toString('hex');
}

export async function generateCSRFToken(): Promise<string> {
  return randomBytes(32).toString('hex');
}

export async function logAuditEvent(
  userId: number | null,
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: any,
  ipAddress?: string,
  userAgent?: string,
  success: boolean = true
): Promise<void> {
  const client = await getDbClient();
  
  try {
    await client.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, success)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress, userAgent, success]);
  } finally {
    await client.end();
  }
}

export async function authenticateUser(
  username: string, 
  password: string, 
  ipAddress?: string, 
  userAgent?: string
): Promise<AuthResult> {
  const client = await getDbClient();
  
  try {
    // Get user and check if account is locked
    const userResult = await client.query(`
      SELECT id, username, email, password_hash, salt, is_active, is_super_admin,
             failed_login_attempts, locked_until, password_changed_at,
             last_login_at, created_at
      FROM users 
      WHERE username = $1 OR email = $1
    `, [username]);

    if (userResult.rows.length === 0) {
      await logAuditEvent(null, 'LOGIN_FAILED', 'user', undefined, { username, reason: 'user_not_found' }, ipAddress, userAgent, false);
      return { success: false, message: 'ユーザー名またはパスワードが間違っています。' };
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logAuditEvent(user.id, 'LOGIN_BLOCKED', 'user', user.id, { reason: 'account_locked' }, ipAddress, userAgent, false);
      return { success: false, message: 'アカウントがロックされています。しばらく待ってから再試行してください。' };
    }

    // Check if account is active
    if (!user.is_active) {
      await logAuditEvent(user.id, 'LOGIN_BLOCKED', 'user', user.id, { reason: 'account_inactive' }, ipAddress, userAgent, false);
      return { success: false, message: 'アカウントが無効になっています。管理者にお問い合わせください。' };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash, user.salt);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = user.failed_login_attempts + 1;
      const shouldLock = newFailedAttempts >= MAX_LOGIN_ATTEMPTS;
      const lockUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null;

      await client.query(`
        UPDATE users 
        SET failed_login_attempts = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [newFailedAttempts, lockUntil, user.id]);

      await logAuditEvent(user.id, 'LOGIN_FAILED', 'user', user.id, { 
        reason: 'invalid_password', 
        failed_attempts: newFailedAttempts,
        locked: shouldLock 
      }, ipAddress, userAgent, false);

      if (shouldLock) {
        return { success: false, message: 'ログイン試行回数が上限に達しました。アカウントがロックされました。' };
      }

      return { success: false, message: 'ユーザー名またはパスワードが間違っています。' };
    }

    // Successful authentication - reset failed attempts and update last login
    await client.query(`
      UPDATE users 
      SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Create session
    const sessionToken = await generateSessionToken();
    const csrfToken = await generateCSRFToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    const sessionResult = await client.query(`
      INSERT INTO sessions (user_id, session_token, csrf_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [user.id, sessionToken, csrfToken, expiresAt, ipAddress, userAgent]);

    const session = sessionResult.rows[0];

    await logAuditEvent(user.id, 'LOGIN_SUCCESS', 'user', user.id, { session_id: session.id }, ipAddress, userAgent);

    // Check if password change is required (default password)
    const requiresPasswordChange = user.username === 'admin' && user.password_changed_at === user.created_at;

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_active: user.is_active,
        is_super_admin: user.is_super_admin || false,
        last_login_at: user.last_login_at,
        created_at: user.created_at
      },
      session,
      message: 'ログインしました。',
      requiresPasswordChange
    };

  } finally {
    await client.end();
  }
}

export async function validateSession(sessionToken: string): Promise<{ user: User; session: Session } | null> {
  const client = await getDbClient();
  
  try {
    const result = await client.query(`
      SELECT s.*, u.id as user_id, u.username, u.email, u.is_active, u.is_super_admin, u.last_login_at, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = $1 AND s.is_active = true AND s.expires_at > NOW() AND u.is_active = true
    `, [sessionToken]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    return {
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        is_active: row.is_active,
        is_super_admin: row.is_super_admin || false,
        last_login_at: row.last_login_at,
        created_at: row.created_at
      },
      session: {
        id: row.id,
        user_id: row.user_id,
        session_token: row.session_token,
        csrf_token: row.csrf_token,
        expires_at: row.expires_at,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        is_active: row.is_active
      }
    };

  } finally {
    await client.end();
  }
}

export async function invalidateSession(sessionToken: string, userId?: number): Promise<void> {
  const client = await getDbClient();
  
  try {
    await client.query(`
      UPDATE sessions 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE session_token = $1
    `, [sessionToken]);

    if (userId) {
      await logAuditEvent(userId, 'LOGOUT', 'session', undefined, { session_token: sessionToken.substring(0, 8) + '...' });
    }

  } finally {
    await client.end();
  }
}

export async function changePassword(
  userId: number, 
  currentPassword: string, 
  newPassword: string,
  skipCurrentPasswordCheck: boolean = false
): Promise<{ success: boolean; message: string }> {
  const client = await getDbClient();
  
  try {
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return { success: false, message: `パスワードは${PASSWORD_MIN_LENGTH}文字以上である必要があります。` };
    }

    // Get current user data
    const userResult = await client.query(`
      SELECT password_hash, salt, username
      FROM users WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return { success: false, message: 'ユーザーが見つかりません。' };
    }

    const user = userResult.rows[0];

    // Verify current password (unless skipping for admin reset)
    if (!skipCurrentPasswordCheck) {
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash, user.salt);
      if (!isCurrentPasswordValid) {
        await logAuditEvent(userId, 'PASSWORD_CHANGE_FAILED', 'user', userId, { reason: 'invalid_current_password' });
        return { success: false, message: '現在のパスワードが間違っています。' };
      }
    }

    // Hash new password
    const { hash: newPasswordHash, salt: newSalt } = await hashPassword(newPassword);

    // Update password
    await client.query(`
      UPDATE users 
      SET password_hash = $1, salt = $2, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newPasswordHash, newSalt, userId]);

    await logAuditEvent(userId, 'PASSWORD_CHANGED', 'user', userId, { forced_change: skipCurrentPasswordCheck });

    return { success: true, message: 'パスワードを変更しました。' };

  } finally {
    await client.end();
  }
}

export function getClientInfo(request: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress = request.ip || 
                   request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}