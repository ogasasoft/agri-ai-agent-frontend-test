import { NextRequest, NextResponse } from 'next/server';
import type { CustomerRegistration } from '@/types/shipping';
import { validateSession } from '@/lib/auth';


export async function POST(request: NextRequest) {
  try {
    // Session validation
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: '認証が必要です' },
        { status: 401 }
      );
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { success: false, message: 'セッションが無効です' },
        { status: 401 }
      );
    }

    const body: { customers: CustomerRegistration[] } = await request.json();
    const { customers } = body;

    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { success: false, message: '顧客データが指定されていません' },
        { status: 400 }
      );
    }

    // Customer data is already saved in orders table with 'shipped' status
    // This endpoint just confirms the registration completion
    const processedCustomers = customers.map(customer => ({
      ...customer,
      registered_at: new Date().toISOString()
    }));

    const insertedCount = processedCustomers.length;

    return NextResponse.json({
      success: true,
      message: `${insertedCount}件の顧客情報を確認しました`,
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
        customer_name: '田中太郎',
        customer_phone: '090-1234-5678',
        customer_address: '東京都渋谷区',
        registered_at: new Date().toISOString()
      }
    ];

    const filteredCustomers = search 
      ? mockCustomers.filter(customer => 
          customer.customer_name.includes(search) ||
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