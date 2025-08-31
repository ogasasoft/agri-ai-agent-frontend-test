import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { addSecurityHeaders, createErrorResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token') || 
                         request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return createErrorResponse('認証が必要です。', 401);
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      return createErrorResponse('セッションが無効です。', 401);
    }

    const client = await getDbClient();
    try {
      // Get user's custom prompts (if any) and system prompts
      const promptsQuery = await client.query(`
        SELECT id, name, category, prompt_text, is_active, created_at, updated_at
        FROM system_prompts 
        WHERE is_active = true 
        ORDER BY category, name
      `);

      const response = NextResponse.json({
        success: true,
        prompts: promptsQuery.rows
      });

      return addSecurityHeaders(response);

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Get prompts error:', error);
    return createErrorResponse('プロンプトの取得に失敗しました。', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token') || 
                         request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return createErrorResponse('認証が必要です。', 401);
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      return createErrorResponse('セッションが無効です。', 401);
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken !== sessionData.session.csrf_token) {
      return createErrorResponse('CSRF token validation failed', 403);
    }

    const { name, category, prompt_text } = await request.json();

    if (!name || !category || !prompt_text) {
      return createErrorResponse('名前、カテゴリ、プロンプト内容は必須です。', 400);
    }

    const client = await getDbClient();
    try {
      // Note: Regular users cannot create system prompts, only admins can
      // This is just a placeholder for potential user-specific prompts in future
      return createErrorResponse('一般ユーザーはプロンプトを作成できません。管理者にお問い合わせください。', 403);

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Create prompt error:', error);
    return createErrorResponse('プロンプトの作成に失敗しました。', 500);
  }
}