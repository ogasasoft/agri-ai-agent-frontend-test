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
      const [usersResult, ordersResult, customersResult, integrationsResult, todayOrdersResult] =
        await Promise.all([
          client.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
          client.query('SELECT COUNT(*) FROM orders'),
          client.query('SELECT COUNT(DISTINCT customer_name) FROM orders'),
          client.query('SELECT COUNT(*) FROM api_integrations WHERE is_active = true'),
          client.query('SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE'),
        ]);

      // Calculate weekly growth (last 7 days vs previous 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const previousSevenDaysAgo = new Date(sevenDaysAgo);
      previousSevenDaysAgo.setDate(previousSevenDaysAgo.getDate() - 7);

      const [currentWeekOrdersResult, previousWeekOrdersResult] = await Promise.all([
        client.query('SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at < $2', [
          sevenDaysAgo,
          previousSevenDaysAgo,
        ]),
        client.query('SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at < $2', [
          previousSevenDaysAgo,
          new Date(sevenDaysAgo),
        ]),
      ]);

      const currentWeekOrders = parseInt(currentWeekOrdersResult.rows[0].count);
      const previousWeekOrders = parseInt(previousWeekOrdersResult.rows[0].count);

      let weeklyGrowth = 0;
      if (previousWeekOrders > 0) {
        weeklyGrowth = Math.round(
          ((currentWeekOrders - previousWeekOrders) / previousWeekOrders) * 100
        );
      }

      const stats = {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalOrders: parseInt(ordersResult.rows[0].count),
        totalCustomers: parseInt(customersResult.rows[0].count),
        activeIntegrations: parseInt(integrationsResult.rows[0].count),
        todayOrders: parseInt(todayOrdersResult.rows[0].count),
        weeklyGrowth,
        systemHealth: 'healthy',
        lastBackup: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        stats: {
          ...stats,
          weeklyGrowth,
        },
      });
    } catch (dbError: any) {
      console.error('Database error in admin dashboard stats:', dbError.message);
      return NextResponse.json(
        {
          success: false,
          message: 'データベースエラーが発生しました。',
        },
        { status: 500 }
      );
    } finally {
      try {
        await client.end();
      } catch (endError) {
        console.error('Error closing client:', endError);
      }
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
