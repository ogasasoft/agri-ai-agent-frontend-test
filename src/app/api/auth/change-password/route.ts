import { NextRequest, NextResponse } from 'next/server';
import { changePassword, validateSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
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
        message: 'セッションが無効です。再度ログインしてください。'
      }, { status: 401 });
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
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました。'
    }, { status: 500 });
  }
}