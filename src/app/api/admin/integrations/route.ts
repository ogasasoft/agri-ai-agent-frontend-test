import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, logAdminAction, getClientInfo, isSuperAdmin } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get all API integrations
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        message: '認証が必要です。'
      }, { status: 401 });
    }

    const adminUser = await validateAdminSession(sessionToken);
    
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json({
        success: false,
        message: 'スーパー管理者権限が必要です。'
      }, { status: 403 });
    }

    const client = await getDbClient();
    
    try {
      const result = await client.query(`
        SELECT id, name, display_name, base_url, 
               CASE WHEN api_key IS NOT NULL AND api_key != '' THEN '[設定済み]' ELSE NULL END as api_key,
               CASE WHEN api_secret IS NOT NULL AND api_secret != '' THEN '[設定済み]' ELSE NULL END as api_secret,
               webhook_url, is_active, configuration, last_sync_at, created_at, updated_at
        FROM api_integrations 
        ORDER BY name
      `);

      // Log admin action
      const { ipAddress, userAgent } = getClientInfo(request);
      await logAdminAction(
        adminUser.id,
        'view_integrations',
        'api_integration',
        undefined,
        { total_integrations: result.rows.length },
        ipAddress,
        userAgent
      );

      return NextResponse.json({
        success: true,
        integrations: result.rows
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin integrations error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}

// PUT - Update API integration
export async function PUT(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        message: '認証が必要です。'
      }, { status: 401 });
    }

    const adminUser = await validateAdminSession(sessionToken);
    
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json({
        success: false,
        message: 'スーパー管理者権限が必要です。'
      }, { status: 403 });
    }

    // CSRF検証 - adminSessionがある場合はcsrf_tokenも存在するはず
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return NextResponse.json({
        success: false,
        message: 'CSRF検証に失敗しました。'
      }, { status: 403 });
    }

    const { 
      id, base_url, api_key, api_secret, webhook_url, 
      configuration, shop_id, seller_id, webhook_secret 
    } = await request.json();

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'IDは必須です。'
      }, { status: 400 });
    }

    const client = await getDbClient();
    
    try {
      // Build update query dynamically to handle optional fields
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (base_url !== undefined) {
        updateFields.push(`base_url = $${paramCount++}`);
        values.push(base_url);
      }
      if (api_key !== undefined) {
        updateFields.push(`api_key = $${paramCount++}`);
        values.push(api_key);
      }
      if (api_secret !== undefined) {
        updateFields.push(`api_secret = $${paramCount++}`);
        values.push(api_secret);
      }
      if (webhook_url !== undefined) {
        updateFields.push(`webhook_url = $${paramCount++}`);
        values.push(webhook_url);
      }
      if (configuration !== undefined) {
        updateFields.push(`configuration = $${paramCount++}`);
        values.push(JSON.stringify(configuration));
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE api_integrations 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'API連携が見つかりません。'
        }, { status: 404 });
      }

      // Log admin action
      const { ipAddress, userAgent } = getClientInfo(request);
      await logAdminAction(
        adminUser.id,
        'update_integration',
        'api_integration',
        id.toString(),
        { name: result.rows[0].name },
        ipAddress,
        userAgent
      );

      // Don't return sensitive data
      const integration = { ...result.rows[0] };
      if (integration.api_key) integration.api_key = '[設定済み]';
      if (integration.api_secret) integration.api_secret = '[設定済み]';

      return NextResponse.json({
        success: true,
        message: 'API連携を更新しました。',
        integration
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin update integration error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}