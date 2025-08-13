import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    
    if (!adminUser) {
      return NextResponse.json({
        success: false,
        message: '管理者権限が必要です。'
      }, { status: 403 });
    }

    const client = await getDbClient();
    
    try {
      // Get recent admin activities
      const result = await client.query(`
        SELECT 
          aal.id,
          aal.action,
          aal.target_type,
          aal.target_id,
          aal.details,
          aal.created_at,
          u.username as admin_username
        FROM admin_audit_logs aal
        JOIN users u ON aal.admin_user_id = u.id
        ORDER BY aal.created_at DESC
        LIMIT 20
      `);

      // Transform activities for frontend
      const activities = result.rows.map(row => {
        let message = '';
        let severity: 'info' | 'warning' | 'error' | 'success' = 'info';

        switch (row.action) {
          case 'view_customers':
            message = `${row.admin_username}が顧客リストを閲覧しました`;
            severity = 'info';
            break;
          case 'create_customer':
            message = `${row.admin_username}が新しい顧客を作成しました`;
            severity = 'success';
            break;
          case 'view_prompts':
            message = `${row.admin_username}がシステムプロンプトを閲覧しました`;
            severity = 'info';
            break;
          case 'create_prompt':
            message = `${row.admin_username}が新しいプロンプトを作成しました`;
            severity = 'success';
            break;
          case 'update_prompt':
            message = `${row.admin_username}がプロンプトを更新しました`;
            severity = 'success';
            break;
          case 'view_integrations':
            message = `${row.admin_username}がAPI連携設定を閲覧しました`;
            severity = 'info';
            break;
          case 'update_integration':
            message = `${row.admin_username}がAPI連携設定を更新しました`;
            severity = 'success';
            break;
          default:
            message = `${row.admin_username}が${row.action}を実行しました`;
            severity = 'info';
        }

        return {
          id: row.id.toString(),
          type: row.action,
          message,
          timestamp: new Date(row.created_at).toLocaleString('ja-JP'),
          severity
        };
      });

      return NextResponse.json({
        success: true,
        activities
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin dashboard activities error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}