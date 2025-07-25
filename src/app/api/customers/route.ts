import { NextRequest, NextResponse } from 'next/server';
import type { CustomerRegistration } from '@/types/shipping';

// 個人情報マスキング関数
const maskPersonalInfo = (text: string): string => {
  if (!text || text.length <= 2) return text;
  return text.charAt(0) + '*'.repeat(text.length - 2) + text.charAt(text.length - 1);
};

export async function POST(request: NextRequest) {
  try {
    const body: { customers: CustomerRegistration[] } = await request.json();
    const { customers } = body;

    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { success: false, message: '顧客データが指定されていません' },
        { status: 400 }
      );
    }

    // 顧客データを処理してDBに保存
    const processedCustomers = customers.map(customer => ({
      ...customer,
      customer_name_masked: maskPersonalInfo(customer.customer_name),
      customer_phone_masked: customer.customer_phone ? maskPersonalInfo(customer.customer_phone) : undefined,
      customer_address_masked: customer.customer_address ? maskPersonalInfo(customer.customer_address) : undefined,
      registered_at: new Date().toISOString()
    }));

    // 実際の実装では、ここでデータベースに保存する
    // 今回は既存の注文データと同じ形式なので、orders APIを使用することも可能
    
    // モック: 成功レスポンス
    const insertedCount = processedCustomers.length;
    
    console.log('顧客情報登録:', processedCustomers);

    return NextResponse.json({
      success: true,
      message: `${insertedCount}件の顧客情報を登録しました`,
      inserted: insertedCount,
      customers: processedCustomers
    });

  } catch (error) {
    console.error('Customer registration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '顧客情報の登録中にエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 顧客情報の検索・取得
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // モック: 顧客データを返す
    // 実際の実装では、データベースから顧客情報を取得
    const mockCustomers = [
      {
        id: 1,
        order_code: 'ORD-001',
        customer_name_masked: '田***郎',
        customer_phone_masked: '090-****-5678',
        customer_address_masked: '東***区',
        registered_at: new Date().toISOString()
      }
    ];

    const filteredCustomers = search 
      ? mockCustomers.filter(customer => 
          customer.customer_name_masked.includes(search) ||
          customer.order_code.includes(search)
        )
      : mockCustomers;

    const paginatedCustomers = filteredCustomers.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      customers: paginatedCustomers,
      total: filteredCustomers.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Customer fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '顧客情報の取得中にエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}