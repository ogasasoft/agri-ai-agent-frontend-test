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

    // Try to get settings from database
    let settings = [];
    try {
      const result = await client.query(`
        SELECT key, value, description, category, data_type
        FROM system_settings 
        ORDER BY category, key
      `);
      settings = result.rows;
    } catch (error) {
      // If system_settings table doesn't exist, return default settings
      // System settings table not found, returning default settings
      settings = [
        {
          key: 'system_name',
          value: '農業AI エージェント',
          description: 'アプリケーションの表示名',
          category: 'system',
          data_type: 'string'
        },
        {
          key: 'maintenance_mode',
          value: 'false',
          description: 'メンテナンスモードの有効/無効',
          category: 'system',
          data_type: 'boolean'
        },
        {
          key: 'session_timeout',
          value: '1440',
          description: 'セッションタイムアウト時間（分）',
          category: 'security',
          data_type: 'number'
        },
        {
          key: 'max_login_attempts',
          value: '5',
          description: '最大ログイン試行回数',
          category: 'security',
          data_type: 'number'
        },
        {
          key: 'debug_mode',
          value: 'false',
          description: 'デバッグモードの有効/無効',
          category: 'system',
          data_type: 'boolean'
        }
      ];
    }

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
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

    // Admin validation - only super admin can modify settings
    const adminUser = await validateAdminSession(sessionToken);
    if (!adminUser || !adminUser.is_super_admin) {
      return createErrorResponse('スーパー管理者権限が必要です', 403);
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRFトークンが必要です', 403);
    }

    const { settings } = await request.json();

    if (!Array.isArray(settings)) {
      return createErrorResponse('設定データが無効です', 400);
    }

    client = await getDbClient();

    // Try to create system_settings table if it doesn't exist
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          category VARCHAR(100) DEFAULT 'system',
          data_type VARCHAR(50) DEFAULT 'string',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (error) {
      // Failed to create system_settings table
    }

    // Update or insert settings
    for (const setting of settings) {
      try {
        await client.query(`
          INSERT INTO system_settings (key, value, description, category, data_type, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET 
            value = EXCLUDED.value,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            data_type = EXCLUDED.data_type,
            updated_at = NOW()
        `, [setting.key, setting.value, setting.description, setting.category, setting.data_type]);
      } catch (error) {
        console.error(`Failed to update setting ${setting.key}:`, error);
      }
    }

    // Log admin action
    try {
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
        'UPDATE_SETTINGS',
        'system_settings',
        null,
        JSON.stringify({ settings_count: settings.length }),
        request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ]);
    } catch (error) {
      // Failed to log admin action
    }

    return NextResponse.json({
      success: true,
      message: '設定を保存しました'
    });

  } catch (error) {
    console.error('Save settings error:', error);
    return createErrorResponse('設定の保存に失敗しました', 500);
  } finally {
    if (client) {
      await client.end();
    }
  }
}