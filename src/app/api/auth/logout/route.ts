import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/auth';
import { invalidateRememberTokensForUser } from '@/lib/auth-enhanced';
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

    return response;

  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}