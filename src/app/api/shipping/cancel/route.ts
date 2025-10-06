import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { DatabaseErrorBuilder, logDatabaseOperation } from '@/lib/api-error-details';

export const dynamic = 'force-dynamic';

/**
 * 発送取り消しAPI
 * 発送済み注文を発送待ちに戻す
 */
export async function POST(request: NextRequest) {
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

    // CSRF validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken !== sessionData.session.csrf_token) {
      return NextResponse.json({
        success: false,
        message: 'CSRF検証に失敗しました。'
      }, { status: 403 });
    }

    const userId = sessionData.user.id.toString();
    const body = await request.json();
    const { order_ids } = body;

    if (!order_ids || order_ids.length === 0) {
      return NextResponse.json(
        { success: false, message: '注文IDが指定されていません' },
        { status: 400 }
      );
    }

    const client = await getDbClient();

    try {
      // Verify all orders belong to the user and are shipped
      const verifyResult = await client.query(`
        SELECT id, order_code, status
        FROM orders
        WHERE id = ANY($1::int[]) AND user_id = $2
      `, [order_ids, userId]);

      if (verifyResult.rows.length !== order_ids.length) {
        return NextResponse.json(
          { success: false, message: '指定された注文が見つからないか、アクセス権限がありません' },
          { status: 404 }
        );
      }

      // Check if any order is not in 'shipped' status
      const nonShippedOrders = verifyResult.rows.filter(order => order.status !== 'shipped');
      if (nonShippedOrders.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: '発送済みステータスではない注文が含まれています',
            non_shipped_orders: nonShippedOrders.map(o => o.order_code)
          },
          { status: 400 }
        );
      }

      // Update orders back to 'pending' status
      const updateResult = await client.query(`
        UPDATE orders
        SET status = 'pending',
            shipped_at = NULL,
            tracking_number = NULL,
            updated_at = NOW()
        WHERE id = ANY($1::int[]) AND user_id = $2
        RETURNING id, order_code, customer_name, status
      `, [order_ids, userId]);

      logDatabaseOperation('UPDATE', 'orders', true, {
        count: updateResult.rows.length,
        action: 'cancel_shipping'
      }, userId);

      return NextResponse.json({
        success: true,
        message: `${updateResult.rows.length}件の注文を発送待ちに戻しました`,
        orders: updateResult.rows
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Shipping cancel API error:', error);

    const dbError = DatabaseErrorBuilder.queryError(
      'UPDATE orders - cancel shipping',
      error,
      {
        table: 'orders',
        operation: 'UPDATE'
      }
    );

    return NextResponse.json(dbError, { status: 500 });
  }
}
