import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserEnhanced, getClientInfo } from '@/lib/auth-enhanced';
import { AuthErrorBuilder, logAuthAttempt, logSecurityEvent } from '@/lib/auth-error-details';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, password, rememberMe } = await request.json();
    const { ipAddress, userAgent } = getClientInfo(request);

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: 'ユーザー名とパスワードは必須です。'
      }, { status: 400 });
    }

    const authResult = await authenticateUserEnhanced(
      username, 
      password, 
      ipAddress, 
      userAgent, 
      rememberMe || false
    );

    if (!authResult.success) {
      // ログイン失敗の詳細分析とログ記録
      const context = {
        username,
        ipAddress,
        userAgent,
        attemptCount: authResult.lockoutInfo?.level,
        lockoutDuration: undefined
      };

      logAuthAttempt('FAILURE', username, context);

      // 攻撃パターンの検出
      if (authResult.lockoutInfo?.level && authResult.lockoutInfo.level > 5) {
        logSecurityEvent('BRUTE_FORCE', { authResult }, context);
      }

      // AI判断型エラーレスポンス生成
      let reason: 'INVALID_CREDENTIALS' | 'USER_NOT_FOUND' | 'ACCOUNT_LOCKED' | 'RATE_LIMITED' = 'INVALID_CREDENTIALS';

      if (authResult.message?.includes('見つかりません')) {
        reason = 'USER_NOT_FOUND';
      } else if (authResult.message?.includes('ロック')) {
        reason = 'ACCOUNT_LOCKED';
      } else if (authResult.message?.includes('制限')) {
        reason = 'RATE_LIMITED';
      }

      const detailedError = AuthErrorBuilder.loginFailure(username, reason, context);

      return NextResponse.json(detailedError, { status: 401 });
    }

    // Set secure HTTP-only cookies
    const response = NextResponse.json({
      success: true,
      message: authResult.message,
      user: authResult.user,
      requiresPasswordChange: authResult.requiresPasswordChange
    });

    // Set session cookie (HTTP-only, secure, SameSite)
    response.cookies.set('session_token', authResult.session!.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    // Set CSRF token cookie (accessible to JavaScript for CSRF protection)
    response.cookies.set('csrf_token', authResult.session!.csrf_token, {
      httpOnly: false, // Accessible to JS for CSRF headers
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    // Set remember token if requested (30 days)
    if (authResult.rememberToken) {
      const rememberValue = `${authResult.rememberToken.selector}:${authResult.rememberToken.validator}`;
      response.cookies.set('remember_token', rememberValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/'
      });
    }

    // ログイン成功をログ記録
    logAuthAttempt('SUCCESS', username, { ipAddress, userAgent });

    return response;

  } catch (error: any) {
    // システムエラーの詳細分析
    const context = { ipAddress: getClientInfo(request).ipAddress, userAgent: getClientInfo(request).userAgent };

    const systemError = new AuthErrorBuilder('システムエラーが発生しました')
      .setAuthContext(context)
      .addProcessingStep('Request Processing', 'failed', { error: error.message })
      .addSuggestion('一時的なサーバーエラーの可能性があります。しばらく時間をおいてから再試行してください')
      .addSuggestion('問題が続く場合は、管理者にお問い合わせください')
      .build();

    return NextResponse.json(systemError, { status: 500 });
  }
}