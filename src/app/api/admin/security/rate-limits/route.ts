import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
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

    client = await getDbClient();

    // Try to get rate limits from database
    let rateLimits = [];
    try {
      const result = await client.query(`
        SELECT 
          identifier,
          category,
          attempts,
          window_start,
          last_attempt
        FROM rate_limits 
        WHERE window_start > NOW() - INTERVAL '1 hour'
        ORDER BY last_attempt DESC
      `);
      rateLimits = result.rows;
    } catch (error) {
      // If rate_limits table doesn't exist, return empty array
      // Rate limits table not found, returning empty array
    }

    return NextResponse.json({
      success: true,
      rateLimits
    });

  } catch (error) {
    console.error('Get rate limits error:', error);
    return createErrorResponse('サーバーエラーが発生しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}