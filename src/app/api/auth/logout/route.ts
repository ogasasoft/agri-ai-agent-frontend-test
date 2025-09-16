import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/auth';
import { invalidateRememberTokensForUser } from '@/lib/auth-enhanced';
import { AuthErrorBuilder, logAuthAttempt } from '@/lib/auth-error-details';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: 'ログアウトしました。'
    });

    response.cookies.delete('session_token');
    response.cookies.delete('csrf_token');
    response.cookies.delete('remember_token');

    // ログアウト成功をログ記録
    if (sessionToken) {
      logAuthAttempt('SUCCESS', 'logout', {});
    }

    return response;

  } catch (error: any) {
    const systemError = new AuthErrorBuilder('ログアウト処理中にエラーが発生しました')
      .addProcessingStep('Cookie Cleanup', 'failed', { error: error.message })
      .addSuggestion('ブラウザのCookieを手動で削除してください')
      .addSuggestion('問題が続く場合は、管理者にお問い合わせください')
      .build();

    return NextResponse.json(systemError, { status: 500 });
  }
}