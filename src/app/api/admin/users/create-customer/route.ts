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

    const { customerEmail } = await request.json();

    // Input validation
    if (!customerEmail) {
      return createErrorResponse('お客様のメールアドレスは必須です', 400);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return createErrorResponse('有効なメールアドレスを入力してください', 400);
    }

    client = await getDbClient();

    // Check if email already exists (both username and email fields)
    const existingUser = await client.query(
      'SELECT id, username, email FROM users WHERE username = $1 OR email = $1',
      [customerEmail]
    );

    if (existingUser.rows.length > 0) {
      return createErrorResponse('そのメールアドレスは既に使用されています', 400);
    }

    // Hash initial password "1995"
    const saltRounds = 12;
    const initialPassword = '1995';
    const hashedPassword = await bcrypt.hash(initialPassword, saltRounds);

    // Create customer user with initial password "1995"
    const result = await client.query(`
      INSERT INTO users (
        username, 
        email, 
        password_hash, 
        is_admin,
        is_super_admin,
        is_active,
        requires_password_change,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, username, email, created_at
    `, [
      customerEmail, // Use email as username too
      customerEmail, // Email field
      hashedPassword, 
      false, 
      false, 
      true,
      true // Requires password change on first login
    ]);

    const newUser = result.rows[0];

    // Store plain text password for admin access
    await client.query(`
      INSERT INTO user_passwords (user_id, plain_password)
      VALUES ($1, $2)
    `, [newUser.id, initialPassword]);

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
      'CREATE_CUSTOMER_ID',
      'user',
      newUser.id,
      JSON.stringify({
        customer_email: customerEmail,
        initial_password_set: true
      }),
      request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    ]);

    return NextResponse.json({
      success: true,
      message: 'お客様IDが正常に作成されました',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at,
        initial_password: initialPassword
      }
    });

  } catch (error) {
    console.error('Create customer ID error:', error);
    return createErrorResponse('お客様ID作成に失敗しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}