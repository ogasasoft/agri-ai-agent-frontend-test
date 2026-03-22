import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { validateSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Get all categories
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: '認証が必要です' }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ success: false, message: '無効なセッションです' }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const client = await getDbClient();

    try {
      const result = await client.query(`
        SELECT
          id,
          name,
          description,
          color,
          icon,
          display_order,
          is_active,
          created_at,
          updated_at,
          (SELECT COUNT(*) FROM orders WHERE category_id = categories.id AND user_id = $1) as order_count
        FROM categories
        WHERE is_active = true AND user_id = $1
        ORDER BY display_order ASC, name ASC
      `, [userId]);

      return NextResponse.json({
        success: true,
        categories: result.rows
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'データベースエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: '認証が必要です' }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ success: false, message: '無効なセッションです' }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const data = await request.json();
    const { name, description, color, icon } = data;

    if (!name || name.trim() === '') {
      return NextResponse.json({
        success: false,
        message: 'カテゴリ名は必須です。'
      }, { status: 400 });
    }

    const client = await getDbClient();

    try {
      const existingCategory = await client.query(
        'SELECT id FROM categories WHERE name = $1 AND is_active = true AND user_id = $2',
        [name.trim(), userId]
      );

      if (existingCategory.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'このカテゴリ名は既に存在します。'
        }, { status: 409 });
      }

      const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM categories WHERE user_id = $1',
        [userId]
      );
      const nextOrder = maxOrderResult.rows[0].next_order;

      const result = await client.query(`
        INSERT INTO categories (name, description, color, icon, display_order, user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        name.trim(),
        description?.trim() || '',
        color || 'gray',
        icon || 'Package',
        nextOrder,
        userId
      ]);

      return NextResponse.json({
        success: true,
        message: 'カテゴリを作成しました。',
        category: result.rows[0]
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'データベースエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, name, description, color, icon, display_order } = data;

    if (!id || !name || name.trim() === '') {
      return NextResponse.json({
        success: false,
        message: 'IDとカテゴリ名は必須です。'
      }, { status: 400 });
    }

    const client = await getDbClient();

    try {
      const existingCategory = await client.query(
        'SELECT id FROM categories WHERE id = $1 AND is_active = true',
        [id]
      );

      if (existingCategory.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'カテゴリが見つかりません。'
        }, { status: 404 });
      }

      const nameConflict = await client.query(
        'SELECT id FROM categories WHERE name = $1 AND id != $2 AND is_active = true',
        [name.trim(), id]
      );

      if (nameConflict.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'このカテゴリ名は既に存在します。'
        }, { status: 409 });
      }

      const result = await client.query(`
        UPDATE categories
        SET
          name = $1,
          description = $2,
          color = $3,
          icon = $4,
          display_order = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [
        name.trim(),
        description?.trim() || '',
        color || 'gray',
        icon || 'Package',
        display_order || 0,
        id
      ]);

      return NextResponse.json({
        success: true,
        message: 'カテゴリを更新しました。',
        category: result.rows[0]
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'データベースエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Soft delete category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'カテゴリIDが必要です。'
      }, { status: 400 });
    }

    const client = await getDbClient();

    try {
      const existingCategory = await client.query(
        'SELECT id, name FROM categories WHERE id = $1 AND is_active = true',
        [id]
      );

      if (existingCategory.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'カテゴリが見つかりません。'
        }, { status: 404 });
      }

      const orderCount = await client.query(
        'SELECT COUNT(*) FROM orders WHERE category_id = $1',
        [id]
      );

      if (parseInt(orderCount.rows[0].count) > 0) {
        return NextResponse.json({
          success: false,
          message: 'このカテゴリには注文データが関連付けられているため削除できません。'
        }, { status: 409 });
      }

      await client.query(`
        UPDATE categories
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);

      return NextResponse.json({
        success: true,
        message: 'カテゴリを削除しました。'
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'データベースエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}
