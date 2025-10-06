import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

/**
 * マイグレーション: ordersテーブルに発送関連カラムを追加
 *
 * 追加カラム:
 * - status: 注文ステータス (pending, processing, shipped, delivered)
 * - shipped_at: 発送日時
 * - tracking_number: 追跡番号
 * - product_category: 商品カテゴリ
 */
export async function POST(request: NextRequest) {
  const client = await getDbClient();

  try {
    console.log('🚀 Starting orders table shipping migration...');

    // Add status column
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
    `);
    console.log('✅ Added status column');

    // Add shipped_at column
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP
    `);
    console.log('✅ Added shipped_at column');

    // Add tracking_number column
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100)
    `);
    console.log('✅ Added tracking_number column');

    // Add product_category column
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS product_category VARCHAR(100)
    `);
    console.log('✅ Added product_category column');

    // Create index on status for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `);
    console.log('✅ Created index on status column');

    // Create index on user_id and status for faster filtered queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status)
    `);
    console.log('✅ Created index on user_id and status columns');

    console.log('✅ Orders shipping migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Orders shipping migration completed successfully',
      changes: [
        'Added status column (VARCHAR(50), DEFAULT \'pending\')',
        'Added shipped_at column (TIMESTAMP)',
        'Added tracking_number column (VARCHAR(100))',
        'Added product_category column (VARCHAR(100))',
        'Created index on status',
        'Created index on user_id and status'
      ]
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);

    return NextResponse.json({
      success: false,
      message: 'Migration failed',
      error: error.message,
      stack: error.stack
    }, { status: 500 });

  } finally {
    await client.end();
  }
}
