import { NextRequest, NextResponse } from 'next/server';
import type { ShippingRequest } from '@/types/shipping';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { DatabaseErrorBuilder, logDatabaseOperation } from '@/lib/api-error-details';

// Generate Yamato B2 Cloud CSV format
const generateYamatoB2CSV = (orders: any[]): string => {
  // Yamato B2 Cloud CSV headers (Japanese format)
  const headers = [
    'お客様管理番号', // Customer management number (order_code)
    'お届け先氏名', // Recipient name (customer_name)
    'お届け先敬称', // Honorific (様)
    'お届け先郵便番号', // Postal code (extracted from address)
    'お届け先住所', // Address
    'お届け先電話番号', // Phone number
    'お届け先メールアドレス', // Email address
    '荷送人氏名', // Sender name
    '荷送人電話番号', // Sender phone
    '品名', // Item name
    '荷扱い1', // Handling 1
    '荷扱い2', // Handling 2
    '荷扱い3', // Handling 3
    'コレクト代金引換額(税込)', // COD amount
    'コレクト内消費税額等', // COD tax amount
    '営業所止置き', // Office pickup
    '営業所コード', // Office code
    '発行枚数', // Number of copies
    '個数口枠の印字', // Package count printing
    '請求先顧客コード', // Billing customer code
    '請求先分類コード', // Billing classification code
    '運賃管理番号', // Freight management number
    'クール区分', // Cool classification
    'クール便希望配達日', // Cool delivery desired date
    'クール便希望配達時間帯', // Cool delivery time slot
    '希望配達日', // Desired delivery date
    '希望配達時間帯', // Desired delivery time slot
    '配達指定日', // Delivery appointment date
    '配達指定時間帯', // Delivery appointment time slot
    '指定日', // Appointment date
    'お届け予定eメール利用区分', // Delivery notification email
    'お届け完了eメール利用区分', // Delivery completion email
    '転送不要', // No forwarding
    '転送電話連絡希望', // Forwarding phone contact
    'DM便', // DM mail
    'ネコポス', // Neko-pos
    '宅急便コンパクト', // Compact delivery
    '宅急便コンパクト専用BOX種別', // Compact box type
    'セキュリティサービス', // Security service
    '保険金額', // Insurance amount
    '総重量', // Total weight
    'サイズ', // Size
    '才数', // Volume
    '個数口数', // Package count
    'お客様側管理番号', // Customer side management number
    'お客様側枝番', // Customer side branch number
    '店舗コード', // Store code
    '店舗名', // Store name
    '荷送人郵便番号', // Sender postal code
    '荷送人住所', // Sender address
    '分類コード1', // Classification code 1
    '分類コード2' // Classification code 2
  ];

  // Generate CSV rows
  const rows = orders.map((order, index) => {
    const trackingNumber = order.tracking_number || `AG${Date.now()}${String(index + 1).padStart(3, '0')}`;
    
    return [
      order.order_code || '', // お客様管理番号
      order.customer_name || '', // お届け先氏名
      '様', // お届け先敬称
      '', // お届け先郵便番号 (address parsing would be needed)
      order.address || '', // お届け先住所
      order.phone || '', // お届け先電話番号
      '', // お届け先メールアドレス
      '農業AI代理店', // 荷送人氏名
      '03-1234-5678', // 荷送人電話番号
      '農産物', // 品名
      '', // 荷扱い1
      '', // 荷扱い2
      '', // 荷扱い3
      '', // コレクト代金引換額(税込)
      '', // コレクト内消費税額等
      '', // 営業所止置き
      '', // 営業所コード
      '1', // 発行枚数
      '', // 個数口枠の印字
      '', // 請求先顧客コード
      '', // 請求先分類コード
      trackingNumber, // 運賃管理番号
      '', // クール区分
      '', // クール便希望配達日
      '', // クール便希望配達時間帯
      order.delivery_date || '', // 希望配達日
      '', // 希望配達時間帯
      '', // 配達指定日
      '', // 配達指定時間帯
      '', // 指定日
      '', // お届け予定eメール利用区分
      '', // お届け完了eメール利用区分
      '', // 転送不要
      '', // 転送電話連絡希望
      '', // DM便
      '', // ネコポス
      '', // 宅急便コンパクト
      '', // 宅急便コンパクト専用BOX種別
      '', // セキュリティサービス
      '', // 保険金額
      '1', // 総重量
      '60', // サイズ
      '1', // 才数
      '1', // 個数口数
      '', // お客様側管理番号
      '', // お客様側枝番
      '', // 店舗コード
      '', // 店舗名
      '100-0001', // 荷送人郵便番号
      '東京都千代田区千代田1-1-1', // 荷送人住所
      '', // 分類コード1
      '' // 分類コード2
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
};

export async function POST(request: NextRequest) {
  try {
    // Session validation
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ 
        success: false, 
        message: '認証が必要です。'
      }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'セッションが無効です。'
      }, { status: 401 });
    }

    // CSRF validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken !== sessionData.session.csrf_token) {
      return NextResponse.json({
        success: false,
        message: 'CSRF検証に失敗しました。'
      }, { status: 403 });
    }

    const userId = sessionData.user.id.toString();
    const body: ShippingRequest = await request.json();
    const { order_ids, delivery_type = 'normal', notes } = body;

    if (!order_ids || order_ids.length === 0) {
      return NextResponse.json(
        { success: false, message: '注文IDが指定されていません' },
        { status: 400 }
      );
    }

    const client = await getDbClient();
    
    try {
      // Get selected orders directly from database
      const result = await client.query(`
        SELECT 
          o.id,
          o.order_code,
          o.customer_name,
          o.phone,
          o.address,
          o.price,
          o.order_date,
          o.delivery_date,
          o.notes
        FROM orders o
        WHERE o.id = ANY($1::int[]) AND o.user_id = $2
      `, [order_ids, userId]);

      const selectedOrders = result.rows;

      if (selectedOrders.length === 0) {
        return NextResponse.json(
          { success: false, message: '指定された注文が見つかりません' },
          { status: 404 }
        );
      }

      // Generate tracking numbers and update orders to 'shipped' status
      const successfulOrders: any[] = [];
      const trackingNumbers: string[] = [];
      const shippedAt = new Date().toISOString();

      for (let i = 0; i < selectedOrders.length; i++) {
        const order = selectedOrders[i];
        const trackingNumber = `AG${Date.now()}${String(i + 1).padStart(3, '0')}`;
        trackingNumbers.push(trackingNumber);

        successfulOrders.push({
          ...order,
          tracking_number: trackingNumber,
          status: 'shipped',
          shipped_at: shippedAt
        });
      }

      // Update orders status to 'shipped' in database
      for (let i = 0; i < order_ids.length; i++) {
        await client.query(`
          UPDATE orders
          SET status = 'shipped',
              shipped_at = $1,
              tracking_number = $2,
              updated_at = NOW()
          WHERE id = $3 AND user_id = $4
        `, [shippedAt, trackingNumbers[i], order_ids[i], userId]);
      }

      // Generate Yamato B2 Cloud CSV with tracking numbers
      const csvContent = generateYamatoB2CSV(successfulOrders);
      const filename = `yamato_b2_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`;

      return NextResponse.json({
        success: true,
        message: `${successfulOrders.length}件の発送書類を作成しました`,
        orders: successfulOrders,
        csv_content: csvContent,
        filename: filename,
        download_ready: true
      });

    } finally {
      await client.end();
    }

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