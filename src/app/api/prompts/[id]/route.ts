import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { addSecurityHeaders, createErrorResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Note: Regular users cannot delete system prompts
    // This endpoint exists to prevent 404 errors but restricts access
    return createErrorResponse('一般ユーザーはシステムプロンプトを削除できません。', 403);

  } catch (error: any) {
    console.error('Delete prompt error:', error);
    return createErrorResponse('プロンプトの削除に失敗しました。', 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const promptId = parseInt(params.id);
    if (isNaN(promptId)) {
      return createErrorResponse('無効なプロンプトIDです。', 400);
    }

    const client = await getDbClient();
    try {
      // Get specific prompt details
      const promptQuery = await client.query(
        'SELECT id, name, category, prompt_text, is_active FROM system_prompts WHERE id = $1 AND is_active = true',
        [promptId]
      );

      if (promptQuery.rows.length === 0) {
        return createErrorResponse('プロンプトが見つかりません。', 404);
      }

      const response = NextResponse.json({
        success: true,
        prompt: promptQuery.rows[0]
      });

      return addSecurityHeaders(response);

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Get prompt error:', error);
    return createErrorResponse('プロンプトの取得に失敗しました。', 500);
  }
}