import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, logAdminAction, getClientInfo } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get all customers with statistics
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
      // Get customers with order statistics from all users
      const result = await client.query(`
        SELECT 
          DISTINCT o.customer_name,
          o.phone,
          o.address,
          o.user_id,
          u.username,
          MIN(o.id) as id,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(o.price), 0) as total_spent,
          MAX(o.order_date) as last_order_date,
          MIN(o.created_at) as created_at
        FROM orders o
        JOIN users u ON o.user_id = u.id
        GROUP BY o.customer_name, o.phone, o.address, o.user_id, u.username
        ORDER BY MIN(o.created_at) DESC
      `);

      // Log admin action
      const { ipAddress, userAgent } = getClientInfo(request);
      await logAdminAction(
        adminUser.id,
        'view_customers',
        'customer',
        undefined,
        { total_customers: result.rows.length },
        ipAddress,
        userAgent
      );

      return NextResponse.json({
        success: true,
        customers: result.rows
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin customers error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}

// POST - Add new customer
export async function POST(request: NextRequest) {
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

    const { customer_name, phone, address, email, user_id } = await request.json();

    if (!customer_name || !user_id) {
      return NextResponse.json({
        success: false,
        message: '顧客名とユーザーIDは必須です。'
      }, { status: 400 });
    }

    const client = await getDbClient();
    
    try {
      // Verify user exists
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [user_id]);
      if (userCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: '指定されたユーザーが見つかりません。'
        }, { status: 404 });
      }

      // Create a placeholder order for the customer
      const result = await client.query(`
        INSERT INTO orders (
          order_code, customer_name, phone, address, price, 
          order_date, user_id, source, notes, extra_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        `ADMIN-${Date.now()}`,
        customer_name,
        phone || '',
        address || '',
        0, // Placeholder price
        new Date().toISOString().split('T')[0],
        user_id,
        'admin_created',
        '管理者により手動作成された顧客データ',
        JSON.stringify({ created_by_admin: adminUser.id, email: email || null })
      ]);

      // Log admin action
      const { ipAddress, userAgent } = getClientInfo(request);
      await logAdminAction(
        adminUser.id,
        'create_customer',
        'customer',
        result.rows[0].id.toString(),
        { customer_name, phone, address, user_id },
        ipAddress,
        userAgent
      );

      return NextResponse.json({
        success: true,
        message: '顧客を作成しました。',
        customer_id: result.rows[0].id
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin create customer error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}