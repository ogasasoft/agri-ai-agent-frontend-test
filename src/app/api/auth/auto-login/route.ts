import { NextRequest, NextResponse } from 'next/server';
import { validateRememberToken } from '@/lib/auth-enhanced';

export async function POST(request: NextRequest) {
  try {
    const rememberToken = request.cookies.get('remember_token')?.value;
    
    if (!rememberToken) {
      return NextResponse.json({
        success: false,
        message: 'Remember token not found'
      }, { status: 401 });
    }

    // Parse selector:validator format
    const [selector, validator] = rememberToken.split(':');
    
    if (!selector || !validator) {
      return NextResponse.json({
        success: false,
        message: 'Invalid remember token format'
      }, { status: 401 });
    }

    const result = await validateRememberToken(selector, validator);
    
    if (!result) {
      // Invalid token - clear the cookie
      const response = NextResponse.json({
        success: false,
        message: 'Invalid or expired remember token'
      }, { status: 401 });
      
      response.cookies.delete('remember_token');
      return response;
    }

    // Create new session cookies
    const response = NextResponse.json({
      success: true,
      message: '自動ログインしました。',
      user: result.user
    });

    // Set session cookie (HTTP-only, secure, SameSite)
    response.cookies.set('session_token', result.newSession.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    // Set CSRF token cookie
    response.cookies.set('csrf_token', result.newSession.csrf_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Auto-login error:', error);
    
    // Clear remember token on error
    const response = NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
    
    response.cookies.delete('remember_token');
    return response;
  }
}