import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// データベース接続
async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

function maskPersonalInfo(text: string): string {
  if (!text || text.length <= 2) return text;
  const first = text.charAt(0);
  const last = text.charAt(text.length - 1);
  const middle = '*'.repeat(text.length - 2);
  return `${first}${middle}${last}`;
}

export async function GET() {
  try {
    const client = await getDbClient();
    
    try {
      const result = await client.query(`
        SELECT 
          id,
          order_code as order_number,
          customer_name as customer_name_masked,
          price as total_amount,
          order_date,
          delivery_date,
          'pending' as status,
          CASE WHEN notes IS NOT NULL AND notes != '' THEN true ELSE false END as has_memo,
          notes as memo,
          created_at,
          updated_at
        FROM orders 
        ORDER BY created_at DESC
      `);
      
      return NextResponse.json(result.rows);
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Database error:', error);
    // フォールバック: 空配列を返す
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Mask personal information
    const maskedName = maskPersonalInfo(data.customer_name);
    
    const client = await getDbClient();
    
    try {
      const result = await client.query(`
        INSERT INTO orders (order_code, customer_name, phone, address, price, order_date, delivery_date, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        data.order_number,
        maskedName,
        data.customer_phone || '',
        data.customer_address || '',
        data.total_amount,
        data.order_date,
        data.delivery_date || null,
        data.memo || ''
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
    return NextResponse.json({ 
      success: false, 
      message: 'データベースエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}