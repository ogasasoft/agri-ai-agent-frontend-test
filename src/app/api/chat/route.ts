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
      const authError = AuthErrorBuilder.sessionError('INVALID_SESSION');
      return NextResponse.json(authError, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      const authError = AuthErrorBuilder.sessionError('EXPIRED_SESSION', { token: sessionToken });
      return NextResponse.json(authError, { status: 401 });
    }

    // CSRF トークンチェック
    const csrfToken = request.headers.get('x-csrf-token');
    if (csrfToken !== sessionData.session.csrf_token) {
      const authError = AuthErrorBuilder.sessionError('CSRF_MISMATCH', {
        token: sessionToken,
        userId: sessionData.user.id.toString()
      });
      return NextResponse.json(authError, { status: 403 });
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
        response: 'AI機能が使用できません。'
      });
    }

    const startTime = Date.now();

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const responseTime = Date.now() - startTime;

    if (openaiResponse.ok) {
      const data = await openaiResponse.json();
      const aiResponse = data.choices[0]?.message?.content;

      logExternalAPICall('OpenAI', '/v1/chat/completions', 'POST', true, responseTime, openaiResponse.status);

      if (aiResponse) {
        return NextResponse.json({
          response: aiResponse.trim()
        });
      }
    }

    // OpenAI APIエラーの詳細分析
    const errorData = await openaiResponse.json().catch(() => ({}));

    logExternalAPICall('OpenAI', '/v1/chat/completions', 'POST', false, responseTime, openaiResponse.status);

    const apiError = ExternalAPIErrorBuilder.openAIError(
      errorData.error || { message: 'Unknown OpenAI API error', code: 'unknown' },
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        statusCode: openaiResponse.status,
        responseTime
      }
    );

    return NextResponse.json(apiError, { status: 503 });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      success: false,
      response: 'AI機能が使用できません。',
      // 本番環境では詳細エラー情報を隠す
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    }, { status: 500 });
  }
}