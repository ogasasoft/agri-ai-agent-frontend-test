import { NextRequest, NextResponse } from 'next/server';
import type { ShippingRequest, YamatoApiResponse } from '@/types/shipping';

// NOTE: Mock Yamato API implementation - replace with actual API integration when ready
const mockYamatoAPI = async (orders: any[]): Promise<YamatoApiResponse[]> => {
  // This mock will be replaced with actual Yamato API calls in production
  await new Promise(resolve => setTimeout(resolve, 1000)); // API呼び出しのシミュレート
  
  return orders.map((order, index) => ({
    success: true,
    tracking_number: `YM${Date.now()}${String(index + 1).padStart(3, '0')}`,
    label_url: `https://mock-yamato.com/labels/${order.id}.pdf`,
    error_message: undefined
  }));
};

export async function POST(request: NextRequest) {
  try {
    const body: ShippingRequest = await request.json();
    const { order_ids, delivery_type = 'normal', notes } = body;

    if (!order_ids || order_ids.length === 0) {
      return NextResponse.json(
        { success: false, message: '注文IDが指定されていません' },
        { status: 400 }
      );
    }

    // 注文データを取得
    const ordersResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!ordersResponse.ok) {
      throw new Error('注文データの取得に失敗しました');
    }

    const allOrders = await ordersResponse.json();
    const selectedOrders = allOrders.filter((order: any) => order_ids.includes(order.id));

    if (selectedOrders.length === 0) {
      return NextResponse.json(
        { success: false, message: '指定された注文が見つかりません' },
        { status: 404 }
      );
    }

    // ヤマトAPIを呼び出し（モック）
    const yamatoResults = await mockYamatoAPI(selectedOrders);
    
    // 成功した注文のステータスを更新
    const successfulOrders: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < selectedOrders.length; i++) {
      const order = selectedOrders[i];
      const yamatoResult = yamatoResults[i];

      if (yamatoResult.success) {
        // 注文ステータスを「発送済み」に更新
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/orders`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: order.id,
            status: 'shipped',
            shipped_at: new Date().toISOString(),
            tracking_number: yamatoResult.tracking_number
          }),
        });

        if (updateResponse.ok) {
          successfulOrders.push({
            ...order,
            tracking_number: yamatoResult.tracking_number,
            label_url: yamatoResult.label_url
          });
        } else {
          errors.push(`注文 ${order.order_number} のステータス更新に失敗しました`);
        }
      } else {
        errors.push(`注文 ${order.order_number}: ${yamatoResult.error_message}`);
      }
    }

    return NextResponse.json({
      success: successfulOrders.length > 0,
      message: `${successfulOrders.length}件の発送書類を作成しました`,
      orders: successfulOrders,
      errors: errors,
      yamato_results: yamatoResults
    });

  } catch (error) {
    console.error('Shipping API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '発送処理中にエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tracking_number = searchParams.get('tracking_number');

    if (!tracking_number) {
      return NextResponse.json(
        { success: false, message: '追跡番号が指定されていません' },
        { status: 400 }
      );
    }

    // NOTE: Mock delivery status - replace with actual Yamato API delivery tracking
    const mockTrackingInfo = {
      tracking_number,
      status: 'in_transit',
      status_text: '配送中',
      estimated_delivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      history: [
        { date: new Date().toISOString().split('T')[0], status: '集荷完了', location: '東京営業所' },
        { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: '受付', location: '発送元' }
      ]
    };

    return NextResponse.json({
      success: true,
      tracking_info: mockTrackingInfo
    });

  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '配送状況の取得中にエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}