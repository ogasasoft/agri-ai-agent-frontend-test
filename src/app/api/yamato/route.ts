import { NextRequest, NextResponse } from 'next/server';
import { YamatoShippingRequest, YamatoApiResponse } from '@/types/yamato';

const YAMATO_CONFIG = {
  apiKey: process.env.YAMATO_API_KEY || '',
  apiSecret: process.env.YAMATO_API_SECRET || '',
  baseUrl: process.env.YAMATO_API_BASE_URL || 'https://api.yamato.co.jp/v1',
  timeout: 30000,
};

export async function POST(request: NextRequest) {
  try {
    const body: YamatoShippingRequest = await request.json();
    
    // NOTE: Currently using mock API - replace with actual Yamato API when credentials are available
    // Mock implementation for development/testing purposes
    const mockResponse = await generateMockYamatoResponse(body);
    
    // 実際のヤマトAPI呼び出しは以下のようになる予定
    /*
    const yamatoResponse = await fetch(`${YAMATO_CONFIG.baseUrl}/shipping/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YAMATO_CONFIG.apiKey}`,
        'X-API-Secret': YAMATO_CONFIG.apiSecret,
      },
      body: JSON.stringify({
        sender: body.sender,
        recipients: body.recipients,
        delivery_type: body.delivery_type,
        payment_type: body.payment_type,
        notes: body.notes,
      }),
      signal: AbortSignal.timeout(YAMATO_CONFIG.timeout),
    });

    if (!yamatoResponse.ok) {
      throw new Error(`Yamato API error: ${yamatoResponse.status}`);
    }

    const result: YamatoApiResponse = await yamatoResponse.json();
    */

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('Yamato API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        results: [],
        error_message: error instanceof Error ? error.message : 'ヤマトAPI呼び出しに失敗しました',
      } as YamatoApiResponse,
      { status: 500 }
    );
  }
}

async function generateMockYamatoResponse(request: YamatoShippingRequest): Promise<YamatoApiResponse> {
  // モック処理: 実際のAPIでは2-5秒程度かかる想定
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const results = request.recipients.map((recipient, index) => ({
    order_id: recipient.order_id,
    success: Math.random() > 0.1, // 90%の成功率
    tracking_number: `${Date.now()}${String(index).padStart(3, '0')}`,
    label_url: `https://mock-yamato.com/labels/${recipient.order_id}.pdf`,
    error_code: Math.random() > 0.9 ? 'INVALID_ADDRESS' : undefined,
    error_message: Math.random() > 0.9 ? '住所が不正です' : undefined,
  }));

  const successCount = results.filter(r => r.success).length;
  
  return {
    success: successCount > 0,
    results,
    batch_id: `BATCH_${Date.now()}`,
    total_cost: successCount * 800, // 1件あたり800円想定
  };
}