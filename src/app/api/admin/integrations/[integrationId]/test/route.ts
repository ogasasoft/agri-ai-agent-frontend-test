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
      // Get integration details
      const integrationQuery = await client.query(
        'SELECT id, name, type, api_endpoint, api_key, settings FROM api_integrations WHERE id = $1',
        [integrationId]
      );

      if (integrationQuery.rows.length === 0) {
        return createErrorResponse('統合設定が見つかりません。', 404);
      }

      const integration = integrationQuery.rows[0];
      let testResult = {
        success: false,
        message: '',
        responseTime: 0,
        status: 'unknown'
      };

      const startTime = Date.now();

      try {
        // Perform connection test based on integration type
        if (integration.type === 'colormi') {
          // Test ColorMi API connection
          const testResponse = await fetch(`${integration.api_endpoint}/api/test`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          testResult.responseTime = Date.now() - startTime;
          testResult.success = testResponse.ok;
          testResult.status = testResponse.status.toString();
          testResult.message = testResponse.ok 
            ? 'ColorMi API接続テストに成功しました。' 
            : `ColorMi API接続テストに失敗しました。(${testResponse.status})`;

        } else if (integration.type === 'tabechoku') {
          // Test Tabechoku API connection
          const testResponse = await fetch(`${integration.api_endpoint}/health`, {
            method: 'GET',
            headers: {
              'X-API-Key': integration.api_key,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          testResult.responseTime = Date.now() - startTime;
          testResult.success = testResponse.ok;
          testResult.status = testResponse.status.toString();
          testResult.message = testResponse.ok 
            ? 'Tabechoku API接続テストに成功しました。' 
            : `Tabechoku API接続テストに失敗しました。(${testResponse.status})`;

        } else {
          // Generic API test
          const testResponse = await fetch(integration.api_endpoint, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          testResult.responseTime = Date.now() - startTime;
          testResult.success = testResponse.ok;
          testResult.status = testResponse.status.toString();
          testResult.message = testResponse.ok 
            ? 'API接続テストに成功しました。' 
            : `API接続テストに失敗しました。(${testResponse.status})`;
        }

      } catch (testError: any) {
        testResult.responseTime = Date.now() - startTime;
        testResult.success = false;
        testResult.message = `接続テストに失敗しました: ${testError.message}`;
        testResult.status = 'error';
      }

      // Update last_tested timestamp
      await client.query(
        'UPDATE api_integrations SET last_tested_at = NOW() WHERE id = $1',
        [integrationId]
      );

      // Log admin action
      await client.query(
        `INSERT INTO admin_audit_logs (admin_id, action, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          adminUser.id,
          'TEST_INTEGRATION',
          JSON.stringify({
            integrationId,
            integrationName: integration.name,
            integrationType: integration.type,
            testResult
          }),
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        ]
      );

      const response = NextResponse.json({
        success: true,
        testResult,
        integration: {
          id: integrationId,
          name: integration.name,
          type: integration.type
        }
      });

      return addSecurityHeaders(response);

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Test integration error:', error);
    return createErrorResponse('統合設定のテストに失敗しました。', 500);
  }
}