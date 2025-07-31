import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserEnhanced, getClientInfo } from '@/lib/auth-enhanced';
import { cookies } from 'next/headers';

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
      return NextResponse.json({
        success: false,
        message: authResult.message,
        lockoutInfo: authResult.lockoutInfo
      }, { status: 401 });
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

    return response;

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}