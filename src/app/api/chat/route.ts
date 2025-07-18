import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { message, customerId } = await request.json();
  
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json({ 
        response: 'OpenAI API キーが設定されていません。環境変数を確認してください。'
      }, { status: 500 });
    }

    console.log('Calling OpenAI API...');
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
    
    if (openaiResponse.ok) {
      const data = await openaiResponse.json();
      const aiResponse = data.choices[0]?.message?.content;
      
      if (aiResponse) {
        return NextResponse.json({ 
          response: aiResponse.trim()
        });
      }
    } else {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', openaiResponse.status, errorText);
      
      return NextResponse.json({ 
        response: `OpenAI API エラー (${openaiResponse.status}): ${errorText}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      response: `API接続エラー: ${error}`
    }, { status: 500 });
  }
}