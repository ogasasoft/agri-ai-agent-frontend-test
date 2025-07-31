import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        message: '認証が必要です。'
      }, { status: 401 });
    }

    const adminUser = await validateAdminSession(sessionToken);
    
    if (!adminUser) {
      return NextResponse.json({
        success: false,
        message: '管理者権限が必要です。'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user: adminUser
    });

  } catch (error: any) {
    console.error('Admin me error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}