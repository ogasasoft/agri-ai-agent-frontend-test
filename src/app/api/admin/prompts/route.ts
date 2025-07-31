import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { validateAdminSession, logAdminAction, getClientInfo } from '@/lib/admin-auth';

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

// GET - Get all system prompts
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
      const result = await client.query(`
        SELECT id, category, key, value, description, created_at, updated_at
        FROM system_settings 
        WHERE category LIKE '%prompt%'
        ORDER BY category, key
      `);

      // Log admin action
      const { ipAddress, userAgent } = getClientInfo(request);
      await logAdminAction(
        adminUser.id,
        'view_prompts',
        'system_setting',
        undefined,
        { total_prompts: result.rows.length },
        ipAddress,
        userAgent
      );

      return NextResponse.json({
        success: true,
        prompts: result.rows
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin prompts error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}

// POST - Create new system prompt
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

    const { category, key, value, description } = await request.json();

    if (!category || !key || !value) {
      return NextResponse.json({
        success: false,
        message: 'カテゴリ、キー、値は必須です。'
      }, { status: 400 });
    }

    const client = await getDbClient();
    
    try {
      // Check if key already exists in category
      const existingPrompt = await client.query(
        'SELECT id FROM system_settings WHERE category = $1 AND key = $2',
        [category, key]
      );

      if (existingPrompt.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'このキーは既に存在します。'
        }, { status: 409 });
      }

      const result = await client.query(`
        INSERT INTO system_settings (category, key, value, description, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [category, key, value, description || '', adminUser.id]);

      // Log admin action
      const { ipAddress, userAgent } = getClientInfo(request);
      await logAdminAction(
        adminUser.id,
        'create_prompt',
        'system_setting',
        result.rows[0].id.toString(),
        { category, key, description },
        ipAddress,
        userAgent
      );

      return NextResponse.json({
        success: true,
        message: 'プロンプトを作成しました。',
        prompt: result.rows[0]
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin create prompt error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}

// PUT - Update system prompt
export async function PUT(request: NextRequest) {
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

    const { id, category, key, value, description } = await request.json();

    if (!id || !category || !key || !value) {
      return NextResponse.json({
        success: false,
        message: 'ID、カテゴリ、キー、値は必須です。'
      }, { status: 400 });
    }

    const client = await getDbClient();
    
    try {
      const result = await client.query(`
        UPDATE system_settings 
        SET category = $1, key = $2, value = $3, description = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [category, key, value, description || '', id]);

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'プロンプトが見つかりません。'
        }, { status: 404 });
      }

      // Log admin action
      const { ipAddress, userAgent } = getClientInfo(request);
      await logAdminAction(
        adminUser.id,
        'update_prompt',
        'system_setting',
        id.toString(),
        { category, key, description },
        ipAddress,
        userAgent
      );

      return NextResponse.json({
        success: true,
        message: 'プロンプトを更新しました。',
        prompt: result.rows[0]
      });

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Admin update prompt error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}