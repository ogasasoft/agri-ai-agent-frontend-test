import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { validateAdminSession } from '@/lib/admin-auth';
import { createErrorResponse } from '@/lib/security';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const { customerEmail, password } = await request.json();

    // Input validation
    if (!customerEmail || !password) {
      return createErrorResponse('お客様のメールアドレスとパスワードは必須です', 400);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return createErrorResponse('有効なメールアドレスを入力してください', 400);
    }

    if (password.length < 6) {
      return createErrorResponse('パスワードは6文字以上である必要があります', 400);
    }

    client = await getDbClient();

    // Check if user exists with the customer email (check both username and email fields)
    const existingUser = await client.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
      [customerEmail]
    );

    if (existingUser.rows.length === 0) {
      return createErrorResponse('お客様のメールアドレスが見つかりません。先にお客様IDを作成してください。', 404);
    }

    const user = existingUser.rows[0];
    
    // Verify current password is "1995"
    const currentPasswordValid = await bcrypt.compare('1995', user.password_hash);
    if (!currentPasswordValid) {
      return createErrorResponse('初期パスワード「1995」が正しくありません。既にパスワードが変更されている可能性があります。', 400);
    }

    // Update password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await client.query(`
      UPDATE users SET 
        password_hash = $1,
        failed_login_attempts = 0,
        account_locked_until = NULL,
        last_failed_attempt = NULL,
        requires_password_change = false,
        is_active = true
      WHERE id = $2
    `, [hashedPassword, user.id]);

    const userId = user.id;
    const userEmail = user.email;

    // Update plain text password for admin access
    await client.query(`
      UPDATE user_passwords 
      SET plain_password = $1, updated_at = NOW()
      WHERE user_id = $2
    `, [password, userId]);

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
      'SETUP_CUSTOMER_PASSWORD',
      'user',
      userId,
      JSON.stringify({
        customer_email: customerEmail,
        action: 'password_updated'
      }),
      request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    ]);

    return NextResponse.json({
      success: true,
      message: 'お客様のパスワードが正常に設定されました',
      user: {
        id: userId,
        username: customerEmail,
        email: userEmail
      }
    });

  } catch (error) {
    console.error('Setup customer password error:', error);
    return createErrorResponse('パスワード設定に失敗しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}