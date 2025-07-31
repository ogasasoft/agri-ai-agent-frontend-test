import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { validateAdminSession } from '@/lib/admin-auth';

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

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
      // Get system statistics
      const [
        usersResult,
        ordersResult,
        customersResult,
        integrationsResult,
        todayOrdersResult
      ] = await Promise.all([
        client.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
        client.query('SELECT COUNT(*) FROM orders'),
        client.query('SELECT COUNT(DISTINCT customer_name) FROM orders'),
        client.query('SELECT COUNT(*) FROM api_integrations WHERE is_active = true'),
        client.query(`
          SELECT COUNT(*) FROM orders 
          WHERE DATE(created_at) = CURRENT_DATE
        `)
      ]);

      const stats = {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalOrders: parseInt(ordersResult.rows[0].count),
        totalCustomers: parseInt(customersResult.rows[0].count),
        activeIntegrations: parseInt(integrationsResult.rows[0].count),
        todayOrders: parseInt(todayOrdersResult.rows[0].count),
        weeklyGrowth: 0, // TODO: Calculate actual growth
        systemHealth: 'healthy',
        lastBackup: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        stats
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin dashboard stats error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}