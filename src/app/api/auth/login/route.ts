import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserEnhanced, getClientInfo } from '@/lib/auth-enhanced';
import { AuthErrorBuilder, logAuthAttempt, logSecurityEvent } from '@/lib/auth-error-details';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let authResult: any;
  let username: string = '';
  let ipAddress: string = '';
  let userAgent: string = '';

  try {
    const { username: rawUsername, password, rememberMe } = await request.json();
    const clientInfo = getClientInfo(request);
    username = rawUsername || '';
    ipAddress = clientInfo.ipAddress;
    userAgent = clientInfo.userAgent;


    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'ユーザー名とパスワードは必須です。',
        },
        { status: 400 }
      );
    }


    authResult = await authenticateUserEnhanced(
      username,
      password,
      ipAddress,
      userAgent,
      rememberMe || false
    );


    if (!authResult?.success) {
      // ログイン失敗の詳細分析とログ記録
      const context = {
        username,
        ipAddress,
        userAgent,
        attemptCount: authResult?.lockoutInfo?.level,
        lockoutDuration: undefined,
      };

      logAuthAttempt('FAILURE', username, context);

      // 攻撃パターンの検出
      if (authResult?.lockoutInfo?.level && authResult.lockoutInfo.level > 5) {
        logSecurityEvent('BRUTE_FORCE', { authResult }, context);
      }

      // AI判断型エラーレスポンス生成
      let reason: 'INVALID_CREDENTIALS' | 'USER_NOT_FOUND' | 'ACCOUNT_LOCKED' | 'RATE_LIMITED' =
        'INVALID_CREDENTIALS';

      if (authResult?.message?.includes('ロック')) {
        reason = 'ACCOUNT_LOCKED';
      } else if (authResult?.message?.includes('制限')) {
        reason = 'RATE_LIMITED';
      }

      const detailedError = AuthErrorBuilder.loginFailure(username, reason, context);

      const statusCode = reason === 'ACCOUNT_LOCKED' ? 423 : 401;
      return NextResponse.json(detailedError, { status: statusCode });
    }

    // Check if authResult and required fields are defined
    if (!authResult || !authResult.session || !authResult.session.session_token || !authResult.session.csrf_token) {
      const context = {
        ipAddress,
        userAgent,
      };

      const systemError = new AuthErrorBuilder('システムエラーが発生しました')
        .setAuthContext(context)
        .addProcessingStep('Response Generation', 'failed', {
          error: 'Missing required authentication data',
          authResult: authResult ? 'defined (incomplete)' : 'undefined',
        })
        .addSuggestion('一時的なサーバーエラーの可能性があります。しばらく時間をおいてから再試行してください')
        .addSuggestion('問題が続く場合は、管理者にお問い合わせください')
        .build();

      console.error('System error response:', systemError);
      return NextResponse.json(systemError, { status: 500 });
    }

    // Create response object early to allow cookie setting
    const response = NextResponse.json(
      {
        success: true,
        message: authResult.message,
        user: authResult.user,
        session: authResult.session,
        rememberToken: authResult.rememberToken || undefined,
        requiresPasswordChange: authResult.requiresPasswordChange,
      },
      { status: 200 } // Set initial status code
    );

    // Set session cookie (HTTP-only, secure, SameSite)
    response.cookies.set('session_token', authResult.session.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Set CSRF token cookie (accessible to JavaScript for CSRF protection)
    response.cookies.set('csrf_token', authResult.session.csrf_token, {
      httpOnly: false, // Accessible to JS for CSRF headers
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Set remember token if requested (30 days)
    if (authResult.rememberToken) {
      const rememberValue = `${authResult.rememberToken.selector}:${authResult.rememberToken.validator}`;
      response.cookies.set('remember_token', rememberValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    // ログイン成功をログ記録
    logAuthAttempt('SUCCESS', username, { ipAddress, userAgent });

    return response;
  } catch (error: any) {
    // Ensure authResult is logged before error handling
    if (authResult && authResult.success) {
      logAuthAttempt('SUCCESS', username, { ipAddress, userAgent });
    }

    // システムエラーの詳細分析
    console.error('=== Login Route Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);

    const context = {
      ipAddress: getClientInfo(request).ipAddress,
      userAgent: getClientInfo(request).userAgent,
    };

    const systemError = new AuthErrorBuilder('システムエラーが発生しました')
      .setAuthContext(context)
      .addProcessingStep('Request Processing', 'failed', {
        error: error.message,
        stack: error.stack,
      })
      .addSuggestion(
        '一時的なサーバーエラーの可能性があります。しばらく時間をおいてから再試行してください'
      )
      .addSuggestion('問題が続く場合は、管理者にお問い合わせください')
      .build();

    console.error('System error response:', systemError);
    return NextResponse.json(systemError, { status: 500 });
  }
}
