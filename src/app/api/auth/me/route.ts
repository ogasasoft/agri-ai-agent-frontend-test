import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        message: '認証が必要です。'
      }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      return NextResponse.json({
        success: false,
        message: 'セッションが無効です。'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: sessionData.user
    });

  } catch (error: any) {
    console.error('Get user info error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}