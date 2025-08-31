import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, isSuperAdmin } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';
import { addSecurityHeaders, createErrorResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const sessionToken = request.headers.get('x-session-token') || 
                         request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return createErrorResponse('認証が必要です。', 401);
    }

    const adminUser = await validateAdminSession(sessionToken);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return createErrorResponse('スーパー管理者権限が必要です。', 403);
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRF token is required', 403);
    }

    const promptId = parseInt(params.promptId);
    if (isNaN(promptId)) {
      return createErrorResponse('無効なプロンプトIDです。', 400);
    }

    const client = await getDbClient();
    try {
      // Check if prompt exists
      const promptCheck = await client.query(
        'SELECT id, name, category FROM system_prompts WHERE id = $1',
        [promptId]
      );

      if (promptCheck.rows.length === 0) {
        return createErrorResponse('プロンプトが見つかりません。', 404);
      }

      const prompt = promptCheck.rows[0];

      // Delete the prompt
      const deleteResult = await client.query(
        'DELETE FROM system_prompts WHERE id = $1',
        [promptId]
      );

      if (deleteResult.rowCount === 0) {
        return createErrorResponse('プロンプトの削除に失敗しました。', 500);
      }

      // Log admin action
      await client.query(
        `INSERT INTO admin_audit_logs (admin_id, action, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          adminUser.id,
          'DELETE_PROMPT',
          JSON.stringify({
            promptId: promptId,
            promptName: prompt.name,
            promptCategory: prompt.category
          }),
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        ]
      );

      const response = NextResponse.json({
        success: true,
        message: `プロンプト「${prompt.name}」が正常に削除されました。`
      });

      return addSecurityHeaders(response);

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Delete prompt error:', error);
    return createErrorResponse('プロンプトの削除に失敗しました。', 500);
  }
}