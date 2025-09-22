import { NextRequest, NextResponse } from 'next/server';
import { changePassword, validateSession } from '@/lib/auth';
import { AuthErrorBuilder, logAuthAttempt } from '@/lib/auth-error-details';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      const authError = AuthErrorBuilder.sessionError('INVALID_SESSION');
      return NextResponse.json(authError, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      const authError = AuthErrorBuilder.sessionError('EXPIRED_SESSION', { token: sessionToken });
      return NextResponse.json(authError, { status: 401 });
    }

    // CSRF検証
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken !== sessionData.session.csrf_token) {
      const authError = AuthErrorBuilder.sessionError('CSRF_MISMATCH', {
        token: sessionToken,
        userId: sessionData.user.id.toString()
      });
      return NextResponse.json(authError, { status: 403 });
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!newPassword || !confirmPassword) {
      return NextResponse.json({
        success: false,
        message: '新しいパスワードと確認パスワードは必須です。'
      }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({
        success: false,
        message: '新しいパスワードと確認パスワードが一致しません。'
      }, { status: 400 });
    }

    // For admin user's first password change, skip current password check
    const skipCurrentPasswordCheck = sessionData.user.username === 'admin' && !currentPassword;

    const result = await changePassword(
      sessionData.user.id, 
      currentPassword || '', 
      newPassword,
      skipCurrentPasswordCheck
    );

    if (!result.success) {
      const passwordError = new AuthErrorBuilder('パスワード変更に失敗しました')
        .setAuthContext({ username: sessionData.user.username })
        .addProcessingStep('Current Password Validation', 'failed', { reason: result.message })
        .addSuggestion('現在のパスワードを正しく入力してください')
        .addSuggestion('パスワードを忘れた場合は、管理者にお問い合わせください')
        .build();

      logAuthAttempt('FAILURE', sessionData.user.username, {});
      return NextResponse.json(passwordError, { status: 400 });
    }

    logAuthAttempt('SUCCESS', sessionData.user.username, {});

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error: any) {
    const systemError = new AuthErrorBuilder('パスワード変更処理中にエラーが発生しました')
      .addProcessingStep('Password Change Operation', 'failed', { error: error.message })
      .addSuggestion('一時的なサーバーエラーの可能性があります。しばらく時間をおいてから再試行してください')
      .addSuggestion('問題が続く場合は、管理者にお問い合わせください')
      .build();

    return NextResponse.json(systemError, { status: 500 });
  }
}