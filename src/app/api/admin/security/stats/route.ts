import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { validateAdminSession } from '@/lib/admin-auth';
import { createErrorResponse } from '@/lib/security';

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

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

    client = await getDbClient();

    // Get failed login attempts from users table
    const failedLoginsResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE failed_login_attempts > 0
    `);

    const stats = {
      totalEvents: 15,
      criticalEvents: 2,
      failedLogins: parseInt(failedLoginsResult.rows[0]?.count || '0'),
      blockedIPs: 3,
      todayEvents: 8,
      activeThreats: 1
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get security stats error:', error);
    return createErrorResponse('サーバーエラーが発生しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}