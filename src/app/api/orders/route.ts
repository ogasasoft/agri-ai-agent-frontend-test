import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { DatabaseErrorBuilder, logDatabaseOperation } from '@/lib/api-error-details';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  let userId = 'unknown';

  try {
    // **CRITICAL: Admin cannot access customer orders API**
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      const authError = AuthErrorBuilder.sessionError('INVALID_SESSION');
      return NextResponse.json(authError, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      const authError = AuthErrorBuilder.sessionError('EXPIRED_SESSION', { token: sessionToken });
      return NextResponse.json(authError, { status: 401 });
    }

    // **NOTE: Allow regular users and admin users to access their orders**
    // Super admin users (silentogasasoft@gmail.com) should use admin APIs instead
    // But regular admin users (admin/admin123) can access their own orders

    userId = sessionData.user.id.toString();
    console.log('🔍 CURRENT USER:', {
      id: sessionData.user.id,
      username: sessionData.user.username,
      email: sessionData.user.email
    });

    const client = await getDbClient();
    
    try {
      // DEBUG: Check all orders and users
      const debugUsers = await client.query('SELECT id, username, email FROM users');
      console.log('🔍 ALL USERS:', debugUsers.rows);
      
      const debugAllOrders = await client.query(`
        SELECT o.id, o.order_code, o.customer_name, o.user_id, u.username, u.email
        FROM orders o
        LEFT JOIN users u ON o.user_id::integer = u.id
        ORDER BY o.created_at DESC LIMIT 10
      `);
      console.log('🔍 ALL ORDERS:', debugAllOrders.rows);
      
      // Only fetch orders belonging to the authenticated user
      const result = await client.query(`
        SELECT
          o.id,
          o.order_code as order_number,
          o.customer_name,
          o.phone as customer_phone,
          o.address as customer_address,
          o.price as total_amount,
          o.order_date,
          o.delivery_date,
          COALESCE(o.status, 'pending') as status,
          o.shipped_at,
          o.tracking_number,
          CASE WHEN o.notes IS NOT NULL AND o.notes != '' THEN true ELSE false END as has_memo,
          o.notes as memo,
          o.category_id,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          o.created_at,
          o.updated_at
        FROM orders o
        LEFT JOIN categories c ON o.category_id = c.id AND c.user_id = $1::integer
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
      `, [userId]);

      logDatabaseOperation('SELECT', 'orders', true, { count: result.rows.length }, userId);

      return NextResponse.json(result.rows);
    } finally {
      await client.end();
    }
  } catch (error: any) {
    logDatabaseOperation('SELECT', 'orders', false, { error: error.message }, userId);

    // データベースエラーの詳細分析
    const dbError = DatabaseErrorBuilder.queryError(
      'SELECT orders with categories',
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

export async function POST(request: NextRequest) {
  try {
    // Session validation
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ 
        success: false, 
        message: '認証が必要です。'
      }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'セッションが無効です。'
      }, { status: 401 });
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

    const data = await request.json();
    
    const client = await getDbClient();
    
    try {
      // Check for duplicate order code within the user's orders
      const duplicateCheck = await client.query(
        'SELECT id FROM orders WHERE order_code = $1 AND user_id = $2',
        [data.order_code || data.order_number, userId]
      );
      
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json({ 
          success: false, 
          message: `注文番号「${data.order_code || data.order_number}」は既に存在します。別の注文番号をご使用ください。`
        }, { status: 409 });
      }

      // Verify category belongs to user if specified
      if (data.category_id) {
        const categoryCheck = await client.query(
          'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
          [data.category_id, userId]
        );
        
        if (categoryCheck.rows.length === 0) {
          return NextResponse.json({ 
            success: false, 
            message: '指定されたカテゴリが見つかりません。'
          }, { status: 404 });
        }
      }

      const result = await client.query(`
        INSERT INTO orders (
          order_code, customer_name, phone, address, price, 
          order_date, delivery_date, notes, category_id, source, extra_data, user_id, product_category
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        data.order_code || data.order_number,
        data.customer_name,
        data.phone || data.customer_phone || '',
        data.address || data.customer_address || '',
        data.price || data.total_amount,
        data.order_date,
        data.delivery_date || null,
        data.notes || data.memo || '',
        data.category_id || null,
        data.source || 'manual_entry',
        JSON.stringify({ registration_method: data.source || 'manual_entry' }),
        userId,
        data.product_category || 'other'
      ]);
      
      const newOrder = result.rows[0];
      
      return NextResponse.json({ 
        id: newOrder.id,
        success: true,
        order: {
          id: newOrder.id,
          order_number: newOrder.order_code,
          customer_name_masked: newOrder.customer_name,
          total_amount: newOrder.price,
          order_date: newOrder.order_date,
          delivery_date: newOrder.delivery_date,
          status: 'pending',
          has_memo: !!newOrder.notes,
          memo: newOrder.notes,
          created_at: newOrder.created_at,
          updated_at: newOrder.updated_at
        }
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error('Database error:', error);
    
    // Handle specific database errors
    if (error.code === '23505') {
      // Unique constraint violation
      if (error.constraint === 'orders_order_code_key' || error.constraint === 'orders_order_code_user_id_key') {
        return NextResponse.json({ 
          success: false, 
          message: '注文番号が既に存在します。別の注文番号をご使用ください。'
        }, { status: 409 });
      }
    } else if (error.code === '23502') {
      // Not null constraint violation
      return NextResponse.json({ 
        success: false, 
        message: '必須項目が入力されていません。'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'データベースエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // セッション検証
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: '認証が必要です' }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ success: false, message: '無効なセッションです' }, { status: 401 });
    }

    // CSRF検証
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken !== sessionData.session.csrf_token) {
      return NextResponse.json({
        success: false,
        message: 'CSRF検証に失敗しました。'
      }, { status: 403 });
    }

    const data = await request.json();
    const { id, status, shipped_at, tracking_number } = data;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: '注文IDが指定されていません' 
      }, { status: 400 });
    }
    
    const client = await getDbClient();
    
    try {
      // 注文ステータスを更新 (テーブル構造は migrate-auth で既に作成済み)
      const updateFields = ['updated_at = NOW()'];
      const values = [id];
      let paramIndex = 2;
      
      if (status) {
        updateFields.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }
      
      if (shipped_at) {
        updateFields.push(`shipped_at = $${paramIndex}`);
        values.push(shipped_at);
        paramIndex++;
      }
      
      if (tracking_number) {
        updateFields.push(`tracking_number = $${paramIndex}`);
        values.push(tracking_number);
        paramIndex++;
      }
      
      const result = await client.query(`
        UPDATE orders 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `, values);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: '指定された注文が見つかりません' 
        }, { status: 404 });
      }
      
      const updatedOrder = result.rows[0];
      
      return NextResponse.json({ 
        success: true,
        order: {
          id: updatedOrder.id,
          order_number: updatedOrder.order_code,
          customer_name_masked: updatedOrder.customer_name,
          total_amount: updatedOrder.price,
          order_date: updatedOrder.order_date,
          delivery_date: updatedOrder.delivery_date,
          status: updatedOrder.status || 'pending',
          has_memo: !!updatedOrder.notes,
          memo: updatedOrder.notes,
          shipped_at: updatedOrder.shipped_at,
          tracking_number: updatedOrder.tracking_number,
          created_at: updatedOrder.created_at,
          updated_at: updatedOrder.updated_at
        }
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'データベースエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}