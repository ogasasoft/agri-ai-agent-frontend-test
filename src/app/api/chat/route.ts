import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { ExternalAPIErrorBuilder, logExternalAPICall } from '@/lib/api-error-details';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        response: '認証が必要です。'
      }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      return NextResponse.json({
        success: false,
        response: 'セッションが無効です。'
      }, { status: 401 });
    }

    // CSRF トークンチェック
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken !== sessionData.session.csrf_token) {
      return NextResponse.json({
        success: false,
        response: 'CSRF検証に失敗しました。'
      }, { status: 403 });
    }

    const { message } = await request.json();
    
    // メッセージの検証
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({
        success: false,
        response: 'メッセージが必要です。'
      }, { status: 400 });
    }

    // メッセージ長制限（DoS攻撃防止）
    if (message.length > 4000) {
      return NextResponse.json({
        success: false,
        response: 'メッセージが長すぎます。'
      }, { status: 400 });
    }
  
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      return NextResponse.json({
        success: false,
        response: 'AI機能が使用できません。'
      });
    }

    const startTime = Date.now();

    let openaiResponse: Response;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: message }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });
    } catch (error: any) {
      console.error('OpenAI API fetch error:', error);
      return NextResponse.json({
        success: false,
        response: 'AI機能が使用できません。',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    }

    const responseTime = Date.now() - startTime;

    // Parse response data (even for errors)
    let errorData = {};
    try {
      errorData = await openaiResponse.json().catch(() => ({}));
    } catch {
      // If JSON parsing fails, use empty object
      errorData = {};
    }

    logExternalAPICall('OpenAI', '/v1/chat/completions', 'POST', openaiResponse.ok, responseTime, openaiResponse.status);

    if (openaiResponse.ok) {
      const data = errorData;
      const aiResponse = data.choices[0]?.message?.content;

      if (aiResponse) {
        return NextResponse.json({
          response: aiResponse.trim()
        });
      }

      // AI response is empty
      return NextResponse.json({
        success: false,
        response: 'AI機能が使用できません。'
      });
    }

    // API error occurred - return 200 with error message
    const errorMessage = errorData.error?.message || 'AI機能が使用できません。';

    return NextResponse.json({
      success: false,
      response: errorMessage.trim()
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    // エラーを詳細に返す（本番環境では適切にロギングして隠蔽する）
    return NextResponse.json({
      success: false,
      response: error.message || 'AI機能が使用できません。',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}