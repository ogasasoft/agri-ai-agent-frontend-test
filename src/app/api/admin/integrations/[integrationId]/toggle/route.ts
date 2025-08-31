import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, isSuperAdmin } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';
import { addSecurityHeaders, createErrorResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { integrationId: string } }
) {
  try {
    const sessionToken = request.headers.get('x-session-token') || 
                         request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return createErrorResponse('認証が必要です。', 401);
    }

    const adminUser = await validateAdminSession(sessionToken);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return createErrorResponse('スーパー管理者権限が必要です。', 403);
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRF token is required', 403);
    }

    const integrationId = parseInt(params.integrationId);
    if (isNaN(integrationId)) {
      return createErrorResponse('無効な統合設定IDです。', 400);
    }

    const client = await getDbClient();
    try {
      // Check if integration exists
      const integrationCheck = await client.query(
        'SELECT id, name, is_active FROM api_integrations WHERE id = $1',
        [integrationId]
      );

      if (integrationCheck.rows.length === 0) {
        return createErrorResponse('統合設定が見つかりません。', 404);
      }

      const integration = integrationCheck.rows[0];
      const newStatus = !integration.is_active;

      // Toggle the integration status
      await client.query(
        'UPDATE api_integrations SET is_active = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, integrationId]
      );

      // Log admin action
      await client.query(
        `INSERT INTO admin_audit_logs (admin_id, action, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          adminUser.id,
          'TOGGLE_INTEGRATION',
          JSON.stringify({
            integrationId,
            integrationName: integration.name,
            previousStatus: integration.is_active,
            newStatus: newStatus
          }),
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        ]
      );

      const response = NextResponse.json({
        success: true,
        message: `統合設定「${integration.name}」を${newStatus ? '有効' : '無効'}にしました。`,
        integration: {
          id: integrationId,
          name: integration.name,
          is_active: newStatus
        }
      });

      return addSecurityHeaders(response);

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Toggle integration error:', error);
    return createErrorResponse('統合設定の切り替えに失敗しました。', 500);
  }
}