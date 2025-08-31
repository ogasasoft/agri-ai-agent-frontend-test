import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { validateAdminSession } from '@/lib/admin-auth';
import { createErrorResponse } from '@/lib/security';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get user passwords (admin only)
export async function GET(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    // Session validation
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return createErrorResponse('認証が必要です', 401);
    }

    // Admin validation - only super admin can view passwords
    const adminUser = await validateAdminSession(sessionToken);
    if (!adminUser || !adminUser.is_super_admin) {
      return createErrorResponse('スーパー管理者権限が必要です', 403);
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRFトークンが必要です', 403);
    }

    client = await getDbClient();

    // Get users with their plain text passwords (stored in a separate secure table for admin access)
    // Note: In production, we store plain text passwords separately for admin viewing only
    const result = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        COALESCE(up.plain_password, '生成済み') as password,
        u.created_at, 
        u.last_login_at as last_login,
        u.role,
        CASE WHEN u.role = 'admin' OR u.role = 'super_admin' THEN true ELSE false END as is_admin,
        u.is_super_admin,
        u.failed_login_attempts,
        u.locked_until as account_locked_until,
        u.is_active
      FROM users u
      LEFT JOIN user_passwords up ON u.id = up.user_id
      ORDER BY u.created_at DESC
    `);

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
      'VIEW_USER_PASSWORDS',
      'user',
      null,
      JSON.stringify({
        viewed_users_count: result.rows.length
      }),
      request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    ]);

    return NextResponse.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('Get user passwords error:', error);
    return createErrorResponse('サーバーエラーが発生しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}