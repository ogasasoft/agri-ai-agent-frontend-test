import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Database Migration: Drop Categories Feature
 *
 * This migration removes the category feature from the system:
 * 1. Drops foreign key constraint on orders.category_id
 * 2. Drops orders.category_id column
 * 3. Drops orders.product_category column (if exists)
 * 4. Drops categories table completely
 *
 * WARNING: This operation is irreversible. All category data will be permanently lost.
 */
export async function POST(request: NextRequest) {
  const steps: string[] = [];
  const errors: string[] = [];

  try {
    const client = await getDbClient();

    try {
      console.log('🗑️  Starting category feature removal migration...');

      // Step 1: Drop foreign key constraint
      try {
        await client.query(`
          ALTER TABLE orders
          DROP CONSTRAINT IF EXISTS orders_category_id_fkey
        `);
        steps.push('✓ Dropped foreign key constraint: orders_category_id_fkey');
        console.log('✓ Foreign key constraint dropped');
      } catch (error: any) {
        const errorMsg = `Failed to drop FK constraint: ${error.message}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // Step 2: Drop category_id column from orders table
      try {
        await client.query(`
          ALTER TABLE orders
          DROP COLUMN IF EXISTS category_id CASCADE
        `);
        steps.push('✓ Dropped column: orders.category_id (CASCADE)');
        console.log('✓ category_id column dropped from orders table');
      } catch (error: any) {
        const errorMsg = `Failed to drop category_id column: ${error.message}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // Step 3: Drop product_category column from orders table (if exists)
      try {
        await client.query(`
          ALTER TABLE orders
          DROP COLUMN IF EXISTS product_category CASCADE
        `);
        steps.push('✓ Dropped column: orders.product_category (CASCADE)');
        console.log('✓ product_category column dropped from orders table');
      } catch (error: any) {
        const errorMsg = `Failed to drop product_category column: ${error.message}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // Step 4: Drop categories table completely
      try {
        await client.query(`
          DROP TABLE IF EXISTS categories CASCADE
        `);
        steps.push('✓ Dropped table: categories (CASCADE)');
        console.log('✓ categories table dropped');
      } catch (error: any) {
        const errorMsg = `Failed to drop categories table: ${error.message}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // Step 5: Drop index if it exists
      try {
        await client.query(`
          DROP INDEX IF EXISTS idx_orders_category_id
        `);
        steps.push('✓ Dropped index: idx_orders_category_id');
        console.log('✓ Index dropped');
      } catch (error: any) {
        // Index might not exist, this is not critical
        console.log('ℹ️  Index might not exist, skipping');
      }

      console.log('✅ Category feature removal migration completed successfully');

      return NextResponse.json({
        success: true,
        message: 'Category feature successfully removed from database',
        steps,
        errors: errors.length > 0 ? errors : undefined,
        warning: errors.length > 0
          ? 'Some steps failed but migration partially completed. Check errors array.'
          : undefined
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('❌ Migration failed with critical error:', error);

    return NextResponse.json({
      success: false,
      message: 'Migration failed with critical error',
      error: error.message,
      steps,
      errors
    }, { status: 500 });
  }
}
