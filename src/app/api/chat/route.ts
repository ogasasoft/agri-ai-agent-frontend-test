import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      return NextResponse.json({ 
        response: 'AI機能が使用できません。'
      });
    }

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
    }
    
    return NextResponse.json({ 
      response: 'AI機能が使用できません。'
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      response: 'AI機能が使用できません。'
    });
  }
}