import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { DatabaseErrorBuilder, logDatabaseOperation } from '@/lib/api-error-details';

export const dynamic = 'force-dynamic';

/**
 * 発送済注文の最新日付取得API
 * ダッシュボードのデフォルト日付範囲設定に使用
 */
export async function GET(request: NextRequest) {
  let userId = 'unknown';

  try {
    // Session validation
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      const authError = AuthErrorBuilder.sessionError('INVALID_SESSION');
      return NextResponse.json(authError, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      const authError = AuthErrorBuilder.sessionError('EXPIRED_SESSION', { token: sessionToken });
      return NextResponse.json(authError, { status: 401 });
    }

    userId = sessionData.user.id.toString();

    const client = await getDbClient();

    try {
      // 発送済注文の最新日付を取得
      const result = await client.query(`
        SELECT MAX(order_date) as latest_date
        FROM orders
        WHERE user_id = $1
          AND status = 'shipped'
      `, [userId]);

      logDatabaseOperation('SELECT', 'orders', true, {
        operation: 'get_latest_shipped_date'
      }, userId);

      const latestDate = result.rows[0]?.latest_date;

      // データがない場合は今日の日付を返す
      const dateStr = latestDate
        ? new Date(latestDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return NextResponse.json({
        success: true,
        latestDate: dateStr
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    logDatabaseOperation('SELECT', 'orders', false, { error: error.message }, userId);

    const dbError = DatabaseErrorBuilder.queryError(
      'SELECT latest shipped date',
      error,
      {
        table: 'orders',
        operation: 'SELECT',
        userId: userId
      }
    );

    return NextResponse.json(dbError, { status: 500 });
  }
}
