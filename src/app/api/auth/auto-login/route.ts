import { NextRequest, NextResponse } from 'next/server';
import { autoLoginWithRememberToken, getClientInfo } from '@/lib/auth-enhanced';

export async function POST(request: NextRequest) {
  try {
    const { ipAddress, userAgent } = getClientInfo(request);
    const rememberTokenCookie = request.cookies.get('remember_token')?.value;

    if (!rememberTokenCookie) {
      return NextResponse.json({
        success: false,
        message: 'Remember tokenが見つかりません。'
      }, { status: 401 });
    }

    // Parse selector:validator from cookie
    const [selector, validator] = rememberTokenCookie.split(':');
    
    if (!selector || !validator) {
      return NextResponse.json({
        success: false,
        message: '無効なRemember tokenです。'
      }, { status: 401 });
    }

    const authResult = await autoLoginWithRememberToken(
      selector, 
      validator, 
      ipAddress, 
      userAgent
    );

    if (!authResult.success) {
      // Clear invalid remember token
      const response = NextResponse.json({
        success: false,
        message: authResult.message
      }, { status: 401 });

      response.cookies.set('remember_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      return response;
    }

    // Set new session cookies
    const response = NextResponse.json({
      success: true,
      message: '自動ログインしました。',
      user: authResult.user
    });

    // Set session cookie
    response.cookies.set('session_token', authResult.session!.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    // Set CSRF token cookie
    response.cookies.set('csrf_token', authResult.session!.csrf_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    // Set new remember token if provided
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

    return response;

  } catch (error: any) {
    console.error('Auto-login error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}