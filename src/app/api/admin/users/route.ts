import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { validateAdminSession } from '@/lib/admin-auth';
import { createErrorResponse } from '@/lib/security';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    // Session validation
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return createErrorResponse('認証が必要です', 401);
    }

    // Admin validation
    const adminUser = await validateAdminSession(sessionToken);
    if (!adminUser) {
      return createErrorResponse('管理者権限が必要です', 403);
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRFトークンが必要です', 403);
    }

    client = await getDbClient();

    // Get all users with basic info
    const result = await client.query(`
      SELECT 
        id, 
        username, 
        email, 
        created_at, 
        last_login_at as last_login,
        role,
        CASE WHEN role = 'admin' OR role = 'super_admin' THEN true ELSE false END as is_admin,
        is_super_admin,
        failed_login_attempts,
        locked_until as account_locked_until,
        is_active
      FROM users 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('Get users error:', error);
    return createErrorResponse('サーバーエラーが発生しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

export async function POST(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    // Session validation
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return createErrorResponse('認証が必要です', 401);
    }

    // Admin validation - only super admin can create users
    const adminUser = await validateAdminSession(sessionToken);
    if (!adminUser || !adminUser.is_super_admin) {
      return createErrorResponse('スーパー管理者権限が必要です', 403);
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRFトークンが必要です', 403);
    }

    const { email, username, password, isAdmin } = await request.json();

    // Input validation
    if (!email || !username || !password) {
      return createErrorResponse('メールアドレス、ユーザー名、パスワードは必須です', 400);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createErrorResponse('有効なメールアドレスを入力してください', 400);
    }

    // Password strength validation
    if (password.length < 6) {
      return createErrorResponse('パスワードは6文字以上である必要があります', 400);
    }

    client = await getDbClient();

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return createErrorResponse('そのメールアドレスまたはユーザー名は既に使用されています', 400);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await client.query(`
      INSERT INTO users (
        username, 
        email, 
        password_hash, 
        is_admin,
        is_super_admin,
        is_active,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, username, email, created_at, is_admin, is_super_admin
    `, [username, email, hashedPassword, isAdmin, false, true]);

    const newUser = result.rows[0];

    // Store plain text password for admin access
    await client.query(`
      INSERT INTO user_passwords (user_id, plain_password)
      VALUES ($1, $2)
    `, [newUser.id, password]);

    // Log admin action
    await client.query(`
      INSERT INTO admin_audit_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        details,
        ip_address,
        user_agent,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      adminUser.id,
      'CREATE_USER',
      'user',
      newUser.id,
      JSON.stringify({
        username: newUser.username,
        email: newUser.email,
        is_admin: newUser.is_admin
      }),
      request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    ]);

    return NextResponse.json({
      success: true,
      message: 'ユーザーが正常に作成されました',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at,
        is_admin: newUser.is_admin,
        is_super_admin: newUser.is_super_admin
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    return createErrorResponse('ユーザー作成に失敗しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}