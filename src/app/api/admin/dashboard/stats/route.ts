import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionToken =
      request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: '認証が必要です。',
        },
        { status: 401 }
      );
    }

    const adminUser = await validateAdminSession(sessionToken);

    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          message: '管理者権限が必要です。',
        },
        { status: 403 }
      );
    }

    const client = await getDbClient();

    try {
      // Get system statistics
      const [
        usersResult,
        ordersResult,
        customersResult,
        integrationsResult,
        todayOrdersResult,
        lastWeekOrdersResult,
        lastWeekUsersResult,
        activeOrdersResult,
      ] = await Promise.all([
        client.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
        client.query('SELECT COUNT(*) FROM orders'),
        client.query('SELECT COUNT(DISTINCT customer_name) FROM orders'),
        client.query('SELECT COUNT(*) FROM api_integrations WHERE is_active = true'),
        client.query(`
          SELECT COUNT(*) FROM orders
          WHERE DATE(created_at) = CURRENT_DATE
        `),
        client.query(`
          SELECT COUNT(*) FROM orders
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `),
        client.query(`
          SELECT COUNT(*) FROM users
          WHERE is_active = true AND created_at >= NOW() - INTERVAL '7 days'
        `),
        client.query(`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
            COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
            COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded
          FROM orders
        `),
      ]);

      const totalOrders = parseInt(ordersResult.rows[0].count);
      const lastWeekOrders = parseInt(lastWeekOrdersResult.rows[0].count);
      const lastWeekUsers = parseInt(lastWeekUsersResult.rows[0].count);
      const weeklyGrowth =
        lastWeekOrders > 0
          ? ((lastWeekOrders - lastWeekUsers) / lastWeekUsers) * 100
          : lastWeekOrders > 0
            ? 100
            : 0;

      const statusStats = activeOrdersResult.rows[0];

      const stats = {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalOrders,
        totalCustomers: parseInt(customersResult.rows[0].count),
        activeIntegrations: parseInt(integrationsResult.rows[0].count),
        todayOrders: parseInt(todayOrdersResult.rows[0].count),
        weeklyGrowth: parseFloat(weeklyGrowth.toFixed(2)),
        systemHealth: 'healthy',
        lastBackup: new Date().toISOString(),
        statusStats,
      };

      return NextResponse.json({
        success: true,
        stats,
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error('Admin dashboard stats error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'サーバーエラーが発生しました。',
      },
      { status: 500 }
    );
  }
}
