import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { validateSession, logAuditEvent, User, Session } from './auth';
import { getDbClient } from '@/lib/db';

export function getClientInfo(request: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress = request.ip || 
                   request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}

// Enhanced security constants
const MAX_LOGIN_ATTEMPTS = 5;
const PROGRESSIVE_LOCKOUT_LEVELS = [
  0,           // No lockout
  5 * 60,      // 5 minutes
  15 * 60,     // 15 minutes
  30 * 60,     // 30 minutes
  60 * 60,     // 1 hour
  2 * 60 * 60, // 2 hours
  4 * 60 * 60, // 4 hours
  8 * 60 * 60, // 8 hours
  24 * 60 * 60 // 24 hours (max)
];

const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes
const MAX_ATTEMPTS_PER_IP = 20; // Per 15 minutes
const REMEMBER_TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days


export interface RememberToken {
  selector: string;
  validator: string;
  expires_at: Date;
}

export interface SecurityEvent {
  event_type: string;
  ip_address?: string;
  user_agent?: string;
  target_username?: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Rate limiting functions
export async function checkRateLimit(ipAddress: string, identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const client = await getDbClient();
  
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (RATE_LIMIT_WINDOW * 1000));
    
    // Get or create rate limit record
    const result = await client.query(`
      INSERT INTO rate_limits (ip_address, identifier, attempt_count, first_attempt_at, last_attempt_at)
      VALUES ($1, $2, 1, $3, $3)
      ON CONFLICT (ip_address, identifier) 
      DO UPDATE SET 
        attempt_count = CASE 
          WHEN rate_limits.first_attempt_at < $4 THEN 1
          ELSE rate_limits.attempt_count + 1
        END,
        first_attempt_at = CASE 
          WHEN rate_limits.first_attempt_at < $4 THEN $3
          ELSE rate_limits.first_attempt_at
        END,
        last_attempt_at = $3
      RETURNING attempt_count, first_attempt_at, blocked_until
    `, [ipAddress, identifier, now, windowStart]);

    const record = result.rows[0];
    const isBlocked = record.blocked_until && new Date(record.blocked_until) > now;
    const exceededLimit = record.attempt_count > MAX_ATTEMPTS_PER_IP;
    
    if (isBlocked || exceededLimit) {
      // Block for progressively longer periods
      const blockDuration = Math.min(record.attempt_count * 60, 24 * 60 * 60); // Max 24 hours
      const blockUntil = new Date(now.getTime() + (blockDuration * 1000));
      
      await client.query(`
        UPDATE rate_limits 
        SET blocked_until = $1
        WHERE ip_address = $2 AND identifier = $3
      `, [blockUntil, ipAddress, identifier]);

      return {
        allowed: false,
        remaining: 0,
        resetTime: blockUntil
      };
    }

    const remaining = Math.max(0, MAX_ATTEMPTS_PER_IP - record.attempt_count);
    const resetTime = new Date(record.first_attempt_at.getTime() + (RATE_LIMIT_WINDOW * 1000));

    return {
      allowed: true,
      remaining,
      resetTime
    };

  } finally {
    await client.end();
  }
}

// Security event logging
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const client = await getDbClient();
  
  try {
    await client.query(`
      INSERT INTO security_events (event_type, ip_address, user_agent, target_username, details, severity)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      event.event_type,
      event.ip_address,
      event.user_agent,
      event.target_username,
      JSON.stringify(event.details),
      event.severity
    ]);
  } finally {
    await client.end();
  }
}

// Enhanced authentication with advanced security
export async function authenticateUserEnhanced(
  username: string,
  password: string,
  ipAddress: string,
  userAgent: string,
  rememberMe: boolean = false
): Promise<{
  success: boolean;
  user?: User;
  session?: Session;
  rememberToken?: RememberToken;
  message: string;
  requiresPasswordChange?: boolean;
  lockoutInfo?: { level: number; unlockTime: Date };
}> {
  
  // Check IP-based rate limiting first
  const rateLimit = await checkRateLimit(ipAddress, 'login_attempt');
  if (!rateLimit.allowed) {
    await logSecurityEvent({
      event_type: 'rate_limit_exceeded',
      ip_address: ipAddress,
      user_agent: userAgent,
      details: { remaining: rateLimit.remaining, reset_time: rateLimit.resetTime },
      severity: 'high'
    });
    
    return {
      success: false,
      message: `ログイン試行回数が上限に達しました。${rateLimit.resetTime.toLocaleString('ja-JP')}にリセットされます。`
    };
  }

  const client = await getDbClient();
  
  try {
    // Check for potential password spray attack
    const recentFailures = await client.query(`
      SELECT COUNT(DISTINCT target_username) as unique_targets
      FROM security_events 
      WHERE ip_address = $1 
        AND event_type = 'login_failed' 
        AND created_at > NOW() - INTERVAL '1 hour'
    `, [ipAddress]);

    if (recentFailures.rows[0].unique_targets > 5) {
      await logSecurityEvent({
        event_type: 'password_spray_detected',
        ip_address: ipAddress,
        user_agent: userAgent,
        target_username: username,
        details: { unique_targets: recentFailures.rows[0].unique_targets },
        severity: 'critical'
      });
    }

    // Get user with enhanced lockout info
    const userResult = await client.query(`
      SELECT id, username, email, password_hash, salt, is_active, is_super_admin,
             failed_login_attempts, locked_until, lockout_level, 
             consecutive_failures, last_failed_ip, password_changed_at,
             last_login_at, created_at
      FROM users 
      WHERE username = $1 OR email = $1
    `, [username]);

    if (userResult.rows.length === 0) {
      // Log potential account enumeration
      await logSecurityEvent({
        event_type: 'account_enumeration_attempt',
        ip_address: ipAddress,
        user_agent: userAgent,
        target_username: username,
        severity: 'medium'
      });

      await logAuditEvent(null, 'LOGIN_FAILED', 'user', undefined, { username, reason: 'user_not_found' }, ipAddress, userAgent, false);
      return { success: false, message: 'ユーザー名またはパスワードが間違っています。' };
    }

    const user = userResult.rows[0];

    // Check progressive lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockoutInfo = {
        level: user.lockout_level,
        unlockTime: new Date(user.locked_until)
      };

      return {
        success: false,
        message: `アカウントがロックされています。${lockoutInfo.unlockTime.toLocaleString('ja-JP')}に解除されます。`,
        lockoutInfo
      };
    }

    // Check if account is active
    if (!user.is_active) {
      await logSecurityEvent({
        event_type: 'inactive_account_access',
        ip_address: ipAddress,
        user_agent: userAgent,
        target_username: username,
        severity: 'medium'
      });

      return { success: false, message: 'アカウントが無効になっています。管理者にお問い合わせください。' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password + user.salt, user.password_hash);

    if (!isPasswordValid) {
      // Calculate progressive lockout
      const newFailures = user.consecutive_failures + 1;
      const newLockoutLevel = Math.min(Math.floor(newFailures / MAX_LOGIN_ATTEMPTS), PROGRESSIVE_LOCKOUT_LEVELS.length - 1);
      const lockoutDuration = PROGRESSIVE_LOCKOUT_LEVELS[newLockoutLevel] * 1000;
      const lockUntil = lockoutDuration > 0 ? new Date(Date.now() + lockoutDuration) : null;

      await client.query(`
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            consecutive_failures = $1,
            lockout_level = $2,
            locked_until = $3,
            last_failed_ip = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [newFailures, newLockoutLevel, lockUntil, ipAddress, user.id]);

      await logSecurityEvent({
        event_type: 'login_failed',
        ip_address: ipAddress,
        user_agent: userAgent,
        target_username: username,
        details: { 
          failures: newFailures, 
          lockout_level: newLockoutLevel,
          locked_until: lockUntil 
        },
        severity: newLockoutLevel > 2 ? 'high' : 'medium'
      });

      if (lockUntil) {
        return {
          success: false,
          message: `パスワードが間違っています。アカウントがロックされました。${lockUntil.toLocaleString('ja-JP')}に解除されます。`,
          lockoutInfo: { level: newLockoutLevel, unlockTime: lockUntil }
        };
      }

      return { success: false, message: 'ユーザー名またはパスワードが間違っています。' };
    }

    // Successful authentication - reset counters
    await client.query(`
      UPDATE users 
      SET failed_login_attempts = 0, 
          consecutive_failures = 0,
          lockout_level = 0,
          locked_until = NULL, 
          last_login_at = CURRENT_TIMESTAMP, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Create session
    const sessionToken = await generateSessionToken();
    const csrfToken = await generateCSRFToken();
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

    const sessionResult = await client.query(`
      INSERT INTO sessions (user_id, session_token, csrf_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [user.id, sessionToken, csrfToken, expiresAt, ipAddress, userAgent]);

    const session = sessionResult.rows[0];

    // Create remember token if requested
    let rememberToken: RememberToken | undefined;
    if (rememberMe) {
      const selector = randomBytes(16).toString('hex');
      const validator = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(validator, 12);
      const rememberExpiresAt = new Date(Date.now() + REMEMBER_TOKEN_DURATION);

      await client.query(`
        INSERT INTO remember_tokens (user_id, token_hash, selector, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [user.id, tokenHash, selector, rememberExpiresAt, ipAddress, userAgent]);

      rememberToken = {
        selector,
        validator,
        expires_at: rememberExpiresAt
      };
    }

    await logAuditEvent(user.id, 'LOGIN_SUCCESS', 'user', user.id, { session_id: session.id, remember_me: rememberMe }, ipAddress, userAgent);

    // Check if password change is required
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
      rememberToken,
      message: 'ログインしました。',
      requiresPasswordChange
    };

  } finally {
    await client.end();
  }
}

// Auto-login with remember token
export async function autoLoginWithRememberToken(
  selector: string,
  validator: string,
  ipAddress: string,
  userAgent: string
): Promise<{
  success: boolean;
  user?: User;
  session?: Session;
  rememberToken?: RememberToken;
  message: string;
}> {
  const client = await getDbClient();
  
  try {
    const result = await client.query(`
      SELECT rt.*, u.id as user_id, u.username, u.email, u.is_active, u.is_super_admin, u.last_login_at, u.created_at
      FROM remember_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.selector = $1 AND rt.expires_at > NOW() AND u.is_active = true
    `, [selector]);

    if (result.rows.length === 0) {
      await logSecurityEvent({
        event_type: 'invalid_remember_token',
        ip_address: ipAddress,
        user_agent: userAgent,
        details: { selector },
        severity: 'medium'
      });
      return { success: false, message: '無効なRemember tokenです。' };
    }

    const tokenData = result.rows[0];
    
    // Verify validator
    const isValidToken = await bcrypt.compare(validator, tokenData.token_hash);
    if (!isValidToken) {
      // Invalid token - possible attack, remove all remember tokens for this user
      await client.query('DELETE FROM remember_tokens WHERE user_id = $1', [tokenData.user_id]);
      
      await logSecurityEvent({
        event_type: 'remember_token_theft',
        ip_address: ipAddress,
        user_agent: userAgent,
        target_username: tokenData.username,
        details: { selector },
        severity: 'critical'
      });
      
      return { success: false, message: 'セキュリティ上の理由によりログアウトしました。再度ログインしてください。' };
    }

    // Create new session
    const sessionToken = await generateSessionToken();
    const csrfToken = await generateCSRFToken();
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000));

    const sessionResult = await client.query(`
      INSERT INTO sessions (user_id, session_token, csrf_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [tokenData.user_id, sessionToken, csrfToken, expiresAt, ipAddress, userAgent]);

    const newSession = sessionResult.rows[0];

    // Create new remember token to replace the used one
    const newSelector = randomBytes(16).toString('hex');
    const newValidator = randomBytes(32).toString('hex');
    const newTokenHash = await bcrypt.hash(newValidator, 12);
    const rememberExpiresAt = new Date(Date.now() + REMEMBER_TOKEN_DURATION);

    // Remove old remember token and create new one
    await client.query('DELETE FROM remember_tokens WHERE selector = $1', [selector]);
    await client.query(`
      INSERT INTO remember_tokens (user_id, token_hash, selector, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tokenData.user_id, newTokenHash, newSelector, rememberExpiresAt, ipAddress, userAgent]);

    await logAuditEvent(tokenData.user_id, 'AUTO_LOGIN_SUCCESS', 'user', tokenData.user_id, { remember_token: true }, ipAddress, userAgent);

    return {
      success: true,
      user: {
        id: tokenData.user_id,
        username: tokenData.username,
        email: tokenData.email,
        is_active: tokenData.is_active,
        is_super_admin: tokenData.is_super_admin || false,
        last_login_at: tokenData.last_login_at,
        created_at: tokenData.created_at
      },
      session: newSession,
      rememberToken: {
        selector: newSelector,
        validator: newValidator,
        expires_at: rememberExpiresAt
      },
      message: '自動ログインしました。'
    };

  } finally {
    await client.end();
  }
}

// Remember token validation
export async function validateRememberToken(selector: string, validator: string): Promise<{ user: User; newSession: Session } | null> {
  const client = await getDbClient();
  
  try {
    const result = await client.query(`
      SELECT rt.*, u.id as user_id, u.username, u.email, u.is_active, u.is_super_admin, u.last_login_at, u.created_at
      FROM remember_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.selector = $1 AND rt.expires_at > NOW() AND u.is_active = true
    `, [selector]);

    if (result.rows.length === 0) {
      return null;
    }

    const tokenData = result.rows[0];
    
    // Verify validator
    const isValidToken = await bcrypt.compare(validator, tokenData.token_hash);
    if (!isValidToken) {
      // Invalid token - possible attack, remove all remember tokens for this user
      await client.query('DELETE FROM remember_tokens WHERE user_id = $1', [tokenData.user_id]);
      
      await logSecurityEvent({
        event_type: 'remember_token_theft',
        target_username: tokenData.username,
        details: { selector },
        severity: 'critical'
      });
      
      return null;
    }

    // Create new session
    const sessionToken = await generateSessionToken();
    const csrfToken = await generateCSRFToken();
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000));

    const sessionResult = await client.query(`
      INSERT INTO sessions (user_id, session_token, csrf_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [tokenData.user_id, sessionToken, csrfToken, expiresAt, tokenData.ip_address, tokenData.user_agent]);

    const newSession = sessionResult.rows[0];

    await logAuditEvent(tokenData.user_id, 'AUTO_LOGIN_SUCCESS', 'user', tokenData.user_id, { remember_token: true });

    return {
      user: {
        id: tokenData.user_id,
        username: tokenData.username,
        email: tokenData.email,
        is_active: tokenData.is_active,
        is_super_admin: tokenData.is_super_admin || false,
        last_login_at: tokenData.last_login_at,
        created_at: tokenData.created_at
      },
      newSession
    };

  } finally {
    await client.end();
  }
}

// Enhanced session validation with auto-extension
export async function validateSessionEnhanced(sessionToken: string, autoExtend: boolean = true): Promise<{ user: User; session: Session } | null> {
  const sessionData = await validateSession(sessionToken);
  
  if (!sessionData) {
    return null;
  }

  // Auto-extend session if it's within 2 hours of expiry
  if (autoExtend) {
    const expiresAt = new Date(sessionData.session.expires_at);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    
    if (expiresAt < twoHoursFromNow) {
      const client = await getDbClient();
      try {
        const newExpiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000));
        await client.query(`
          UPDATE sessions 
          SET expires_at = $1
          WHERE session_token = $2
        `, [newExpiresAt, sessionToken]);
        
        sessionData.session.expires_at = newExpiresAt.toISOString();
      } finally {
        await client.end();
      }
    }
  }

  return sessionData;
}

// Generate secure tokens
async function generateSessionToken(): Promise<string> {
  return randomBytes(64).toString('hex');
}

async function generateCSRFToken(): Promise<string> {
  return randomBytes(32).toString('hex');
}

// Invalidate remember tokens for a user
export async function invalidateRememberTokensForUser(userId: number): Promise<void> {
  const client = await getDbClient();
  
  try {
    await client.query('DELETE FROM remember_tokens WHERE user_id = $1', [userId]);
  } finally {
    await client.end();
  }
}

// Cleanup expired data
export async function cleanupExpiredData(): Promise<void> {
  const client = await getDbClient();
  
  try {
    await client.query('SELECT cleanup_expired_security_data()');
  } finally {
    await client.end();
  }
}