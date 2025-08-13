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

    // Get security events (mock data since we don't have a security_events table yet)
    const mockEvents = [
      {
        id: '1',
        event_type: 'LOGIN_FAILURE',
        severity: 'medium',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { username: 'test@example.com', reason: 'invalid_password' },
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
      },
      {
        id: '2',
        event_type: 'RATE_LIMIT_EXCEEDED',
        severity: 'high',
        ip_address: '10.0.1.50',
        user_agent: 'curl/7.64.1',
        details: { endpoint: '/api/auth/login', limit: 10 },
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 minutes ago
      },
      {
        id: '3',
        event_type: 'SUSPICIOUS_ACTIVITY',
        severity: 'critical',
        ip_address: '203.0.113.45',
        user_agent: 'Python-requests/2.25.1',
        details: { pattern: 'password_spray', attempts: 50 },
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
      }
    ];

    return NextResponse.json({
      success: true,
      events: mockEvents
    });

  } catch (error) {
    console.error('Get security events error:', error);
    return createErrorResponse('サーバーエラーが発生しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}