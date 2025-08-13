import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface YamatoSettings {
  // 基本情報
  sender_name: string;
  sender_phone: string;
  sender_zip: string;
  sender_address: string;
  
  // デフォルト配送設定
  default_slip_type: string;
  default_cool_section: string;
  default_delivery_time: string;
  
  // メール設定
  enable_delivery_complete_email: boolean;
  delivery_complete_email_type: string;
  delivery_complete_email_message: string;
  enable_sender_complete_email: boolean;
  sender_complete_email_type: string;
  sender_complete_email_message: string;
  
  // ビジネス設定
  billing_customer_code: string;
  billing_category_code: string;
  fare_management_number: string;
  default_print_count: string;
  quantity_display_flag: string;
  
  // クロネコwebコレクト設定
  enable_web_collect: boolean;
  web_collect_member_no: string;
  
  // 検索キー設定
  search_key_title1: string;
  search_key_title2: string;
  search_key_title3: string;
  search_key_title4: string;
  
  // 3個目のフォーマット設定
  enable_delivery_schedule_email: boolean;
  delivery_schedule_device_type: string;
  delivery_schedule_email_message: string;
  enable_delivery_complete_email_v2: boolean;
  delivery_complete_email_message_v2: string;
  enable_kuroneko_collection: boolean;
  collection_billing_amount: string;
  collection_billing_tax: string;
  collection_billing_zip: string;
  collection_billing_address: string;
  collection_billing_building: string;
  collection_billing_company1: string;
  collection_billing_company2: string;
  collection_billing_name_kanji: string;
  collection_billing_name_kana: string;
  collection_inquiry_name_kanji: string;
  collection_inquiry_zip: string;
  collection_inquiry_address: string;
  collection_inquiry_building: string;
  collection_inquiry_phone: string;
  collection_management_number: string;
  collection_item_name: string;
  collection_note: string;
}

// GET - ヤマト設定の取得
export async function GET(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    // セッション検証
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: '認証が必要です' }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ success: false, message: '無効なセッションです' }, { status: 401 });
    }

    client = await getDbClient();
    
    // ユーザー固有の設定を取得
    const result = await client.query(`
      SELECT setting_key, setting_value 
      FROM user_settings 
      WHERE user_id = $1 AND setting_key LIKE 'yamato_%'
    `, [sessionData.user.id]);

    // デフォルト設定
    const defaultSettings: YamatoSettings = {
      sender_name: sessionData.user.username || '農業事業者',
      sender_phone: '03-1234-5678',
      sender_zip: '1000001',
      sender_address: '東京都千代田区千代田1-1',
      default_slip_type: '0',
      default_cool_section: '0',
      default_delivery_time: '',
      enable_delivery_complete_email: false,
      delivery_complete_email_type: '1',
      delivery_complete_email_message: 'お荷物をお届けしました。',
      enable_sender_complete_email: false,
      sender_complete_email_type: '1',
      sender_complete_email_message: 'お荷物の配達が完了しました。',
      billing_customer_code: '1000000000',
      billing_category_code: '',
      fare_management_number: '01',
      default_print_count: '01',
      quantity_display_flag: '1',
      enable_web_collect: false,
      web_collect_member_no: '',
      search_key_title1: '注文番号',
      search_key_title2: '顧客名',
      search_key_title3: '商品名',
      search_key_title4: '注文日',
      // 3個目のフォーマット設定デフォルト
      enable_delivery_schedule_email: false,
      delivery_schedule_device_type: '1',
      delivery_schedule_email_message: 'お荷物のお届け予定をお知らせいたします。',
      enable_delivery_complete_email_v2: false,
      delivery_complete_email_message_v2: 'お荷物をお届けいたしました。ご確認をお願いいたします。',
      enable_kuroneko_collection: false,
      collection_billing_amount: '0',
      collection_billing_tax: '0',
      collection_billing_zip: '',
      collection_billing_address: '',
      collection_billing_building: '',
      collection_billing_company1: '',
      collection_billing_company2: '',
      collection_billing_name_kanji: '',
      collection_billing_name_kana: '',
      collection_inquiry_name_kanji: '',
      collection_inquiry_zip: '',
      collection_inquiry_address: '',
      collection_inquiry_building: '',
      collection_inquiry_phone: '',
      collection_management_number: '',
      collection_item_name: '代金回収商品',
      collection_note: ''
    };

    // 保存された設定で上書き
    const settings = { ...defaultSettings };
    result.rows.forEach(row => {
      const key = row.setting_key.replace('yamato_', '') as keyof YamatoSettings;
      if (key in settings) {
        const value = row.setting_value;
        if (typeof settings[key] === 'boolean') {
          (settings as any)[key] = value === 'true';
        } else {
          (settings as any)[key] = value;
        }
      }
    });

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Yamato settings fetch error:', error);
    return NextResponse.json({
      success: false,
      message: '設定の取得中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// PUT - ヤマト設定の更新
export async function PUT(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    // セッション検証
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: '認証が必要です' }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ success: false, message: '無効なセッションです' }, { status: 401 });
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken !== sessionData.session?.csrf_token) {
      return NextResponse.json({ success: false, message: 'CSRF token mismatch' }, { status: 403 });
    }

    const settings: Partial<YamatoSettings> = await request.json();

    client = await getDbClient();
    
    // 設定を保存（upsert）
    for (const [key, value] of Object.entries(settings)) {
      await client.query(`
        INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, setting_key)
        DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          updated_at = NOW()
      `, [sessionData.user.id, `yamato_${key}`, String(value)]);
    }

    return NextResponse.json({
      success: true,
      message: 'ヤマト設定を保存しました'
    });

  } catch (error) {
    console.error('Yamato settings update error:', error);
    return NextResponse.json({
      success: false,
      message: '設定の保存中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}