import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { AuthErrorBuilder } from '@/lib/auth-error-details';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Try multiple sources for session token
    const sessionToken = request.headers.get('x-session-token') || 
                         request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      const authError = AuthErrorBuilder.sessionError('INVALID_SESSION');
      return NextResponse.json(authError, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      const authError = AuthErrorBuilder.sessionError('EXPIRED_SESSION', { token: sessionToken });
      return NextResponse.json(authError, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: sessionData.user,
      session: sessionData.session,
      isAdmin: sessionData.user.is_super_admin || false
    });

  } catch (error: any) {
    const systemError = new AuthErrorBuilder('ユーザー情報取得中にエラーが発生しました')
      .addProcessingStep('Session Validation', 'failed', { error: error.message })
      .addSuggestion('セッションが破損している可能性があります。再ログインしてください')
      .addSuggestion('問題が続く場合は、管理者にお問い合わせください')
      .build();

    return NextResponse.json(systemError, { status: 500 });
  }
}