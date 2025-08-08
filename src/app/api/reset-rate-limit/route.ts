import { NextRequest, NextResponse } from 'next/server';

// メモリベースのレート制限をリセット（middleware.tsで使用される）
const rateLimitMap = new Map();

export async function POST(_request: NextRequest) {
  try {
    // メモリベースのレート制限をクリア
    rateLimitMap.clear();
    
    // グローバルウィンドウからもレート制限データを削除
    if (typeof global !== 'undefined') {
      (global as any).rateLimitMap = new Map();
    }

    return NextResponse.json({ 
      message: 'All rate limits reset successfully',
      cleared: true
    });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}