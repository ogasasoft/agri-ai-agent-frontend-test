import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { validateSession } from '@/lib/auth';

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

// PUT - 注文情報の更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let client: Client | null = null;
  
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

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken !== sessionData.session?.csrf_token) {
      return NextResponse.json({ success: false, message: 'CSRF token mismatch' }, { status: 403 });
    }

    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ 
        success: false, 
        message: '無効な注文IDです' 
      }, { status: 400 });
    }

    const updateData = await request.json();
    
    client = await getDbClient();
    
    // 既存の注文を確認（ユーザー固有）
    const existingOrder = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, sessionData.user.id]
    );

    if (existingOrder.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '注文が見つからないか、アクセス権限がありません' 
      }, { status: 404 });
    }

    // 更新可能なフィールドを定義
    const allowedFields = [
      'status', 'delivery_date', 'notes', 'item_name', 'price', 
      'customer_name', 'phone', 'address', 'shipped_at'
    ];
    
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 3; // $1=orderId, $2=user_id, $3から開始

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${valueIndex}`);
        updateValues.push(value);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '更新するフィールドがありません' 
      }, { status: 400 });
    }

    // 更新日時を追加
    updateFields.push('updated_at = NOW()');

    const updateQuery = `
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await client.query(updateQuery, [orderId, sessionData.user.id, ...updateValues]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '注文の更新に失敗しました' 
      }, { status: 500 });
    }

    const updatedOrder = result.rows[0];

    return NextResponse.json({
      success: true,
      message: '注文情報を更新しました',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({
      success: false,
      message: '注文の更新中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// GET - 個別注文の取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let client: Client | null = null;
  
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

    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ 
        success: false, 
        message: '無効な注文IDです' 
      }, { status: 400 });
    }

    client = await getDbClient();
    
    const result = await client.query(`
      SELECT o.*, c.name as category_name, c.color as category_color 
      FROM orders o
      LEFT JOIN categories c ON o.category_id = c.id
      WHERE o.id = $1 AND o.user_id = $2
    `, [orderId, sessionData.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '注文が見つからないか、アクセス権限がありません' 
      }, { status: 404 });
    }

    const order = result.rows[0];

    return NextResponse.json({
      success: true,
      order: order
    });

  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json({
      success: false,
      message: '注文の取得中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}