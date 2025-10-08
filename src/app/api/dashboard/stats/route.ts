import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { DatabaseErrorBuilder, logDatabaseOperation } from '@/lib/api-error-details';

export const dynamic = 'force-dynamic';

/**
 * ダッシュボード統計API
 * 発送済注文データに基づく経営分析データを提供
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

    // Get date range from query parameters
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = searchParams.get('to') || new Date().toISOString().split('T')[0];

    const client = await getDbClient();

    try {
      // 1. 基本統計（発送済のみ）
      const basicStats = await client.query(`
        SELECT
          COUNT(*) as total_shipped,
          COALESCE(SUM(price), 0) as total_revenue,
          COALESCE(AVG(price), 0) as avg_order_value,
          COUNT(DISTINCT customer_name) as unique_customers
        FROM orders
        WHERE user_id = $1
          AND status = 'shipped'
          AND order_date >= $2::date
          AND order_date <= $3::date
      `, [userId, fromDate, toDate]);

      // 2. 日別売上推移
      const dailyTrend = await client.query(`
        SELECT
          DATE(order_date) as date,
          COUNT(*) as order_count,
          COALESCE(SUM(price), 0) as revenue
        FROM orders
        WHERE user_id = $1
          AND status = 'shipped'
          AND order_date >= $2::date
          AND order_date <= $3::date
        GROUP BY DATE(order_date)
        ORDER BY DATE(order_date)
      `, [userId, fromDate, toDate]);

      // 3. カテゴリ別統計
      const categoryStats = await client.query(`
        SELECT
          c.id as category_id,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          COUNT(o.id) as order_count,
          COALESCE(SUM(o.price), 0) as revenue
        FROM orders o
        LEFT JOIN categories c ON o.category_id = c.id
        WHERE o.user_id = $1
          AND o.status = 'shipped'
          AND o.order_date >= $2::date
          AND o.order_date <= $3::date
        GROUP BY c.id, c.name, c.color, c.icon
        ORDER BY revenue DESC
      `, [userId, fromDate, toDate]);

      // 4. 顧客別ランキング（トップ10）
      const topCustomers = await client.query(`
        SELECT
          customer_name,
          COUNT(*) as order_count,
          COALESCE(SUM(price), 0) as total_spent,
          COALESCE(AVG(price), 0) as avg_order_value
        FROM orders
        WHERE user_id = $1
          AND status = 'shipped'
          AND order_date >= $2::date
          AND order_date <= $3::date
        GROUP BY customer_name
        ORDER BY total_spent DESC
        LIMIT 10
      `, [userId, fromDate, toDate]);

      // 5. リピート顧客分析
      const repeatCustomers = await client.query(`
        SELECT
          COUNT(CASE WHEN order_count = 1 THEN 1 END) as new_customers,
          COUNT(CASE WHEN order_count > 1 THEN 1 END) as repeat_customers
        FROM (
          SELECT customer_name, COUNT(*) as order_count
          FROM orders
          WHERE user_id = $1
            AND status = 'shipped'
            AND order_date >= $2::date
            AND order_date <= $3::date
          GROUP BY customer_name
        ) customer_orders
      `, [userId, fromDate, toDate]);

      // 6. 曜日別統計
      const weekdayStats = await client.query(`
        SELECT
          EXTRACT(DOW FROM order_date) as weekday,
          COUNT(*) as order_count,
          COALESCE(SUM(price), 0) as revenue
        FROM orders
        WHERE user_id = $1
          AND status = 'shipped'
          AND order_date >= $2::date
          AND order_date <= $3::date
        GROUP BY EXTRACT(DOW FROM order_date)
        ORDER BY weekday
      `, [userId, fromDate, toDate]);

      // 7. 前期比較データ（前月）
      const dateDiff = Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24));
      const previousFromDate = new Date(new Date(fromDate).getTime() - dateDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const previousToDate = new Date(new Date(toDate).getTime() - dateDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const previousStats = await client.query(`
        SELECT
          COUNT(*) as total_shipped,
          COALESCE(SUM(price), 0) as total_revenue
        FROM orders
        WHERE user_id = $1
          AND status = 'shipped'
          AND order_date >= $2::date
          AND order_date <= $3::date
      `, [userId, previousFromDate, previousToDate]);

      logDatabaseOperation('SELECT', 'orders', true, {
        stats: 'dashboard',
        dateRange: `${fromDate} to ${toDate}`
      }, userId);

      const stats = basicStats.rows[0];
      const prevStats = previousStats.rows[0];

      // 成長率計算
      const revenueGrowth = prevStats.total_revenue > 0
        ? ((stats.total_revenue - prevStats.total_revenue) / prevStats.total_revenue) * 100
        : 0;

      const orderGrowth = prevStats.total_shipped > 0
        ? ((stats.total_shipped - prevStats.total_shipped) / prevStats.total_shipped) * 100
        : 0;

      return NextResponse.json({
        success: true,
        dateRange: { from: fromDate, to: toDate },
        stats: {
          totalShipped: parseInt(stats.total_shipped),
          totalRevenue: parseFloat(stats.total_revenue),
          avgOrderValue: parseFloat(stats.avg_order_value),
          uniqueCustomers: parseInt(stats.unique_customers),
          revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
          orderGrowth: parseFloat(orderGrowth.toFixed(2))
        },
        dailyTrend: dailyTrend.rows.map(row => ({
          date: row.date,
          orderCount: parseInt(row.order_count),
          revenue: parseFloat(row.revenue)
        })),
        categoryStats: categoryStats.rows.map(row => ({
          categoryId: row.category_id,
          categoryName: row.category_name || '未分類',
          categoryColor: row.category_color,
          categoryIcon: row.category_icon,
          orderCount: parseInt(row.order_count),
          revenue: parseFloat(row.revenue)
        })),
        topCustomers: topCustomers.rows.map(row => ({
          customerName: row.customer_name,
          orderCount: parseInt(row.order_count),
          totalSpent: parseFloat(row.total_spent),
          avgOrderValue: parseFloat(row.avg_order_value)
        })),
        customerAnalysis: {
          newCustomers: parseInt(repeatCustomers.rows[0]?.new_customers || 0),
          repeatCustomers: parseInt(repeatCustomers.rows[0]?.repeat_customers || 0)
        },
        weekdayStats: weekdayStats.rows.map(row => ({
          weekday: parseInt(row.weekday),
          orderCount: parseInt(row.order_count),
          revenue: parseFloat(row.revenue)
        }))
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    logDatabaseOperation('SELECT', 'orders', false, { error: error.message }, userId);

    const dbError = DatabaseErrorBuilder.queryError(
      'SELECT dashboard stats',
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
