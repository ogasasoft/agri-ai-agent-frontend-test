import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { validateSession } from '@/lib/auth';

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

interface YamatoCsvRow {
  customer_management_number: string; // お客様管理番号
  slip_type: string; // 送り状種類
  cool_section: string; // クール区分
  slip_number: string; // 伝票番号（空白、B2クラウドで付与）
  scheduled_ship_date: string; // 出荷予定日
  scheduled_delivery_date: string; // お届け予定日
  delivery_time: string; // 配達時間帯
  delivery_code: string; // お届け先コード
  delivery_phone: string; // お届け先電話番号
  delivery_phone_branch: string; // お届け先電話番号枝番
  delivery_zip: string; // お届け先郵便番号
  delivery_address: string; // お届け先住所
  delivery_building: string; // お届け先アパート・マンション名
  delivery_company1: string; // お届け先会社・部門名1
  delivery_company2: string; // お届け先会社・部門名2
  delivery_name: string; // お届け先名
  delivery_honorific: string; // お届け先名（敬称）
  sender_code: string; // ご依頼主コード
  sender_phone: string; // ご依頼主電話番号
  sender_phone_branch: string; // ご依頼主電話番号枝番
  sender_zip: string; // ご依頼主郵便番号
  sender_address: string; // ご依頼主住所
  sender_building: string; // ご依頼主住所（ビル・マンション名）
  sender_name: string; // ご依頼主名
  sender_honorific: string; // ご依頼主名（敬称）
  item_code1: string; // 品名コード1
  item_name1: string; // 品名1
  item_code2: string; // 品名コード2
  item_name2: string; // 品名2
  item_code3: string; // 品名コード3
  item_name3: string; // 品名3
  item_code4: string; // 品名コード4
  item_name4: string; // 品名4
  handling1: string; // 荷扱い1
  handling2: string; // 荷扱い2
  note: string; // 記事
  collect_amount: string; // コレクト代金引換金額
  collect_tax: string; // コレクト内消費税額等
  office_hold: string; // 営業所止置き
  office_code: string; // 営業所コード
  print_count: string; // 発行枚数
  quantity_print: string; // 個数口枠の印字
  billing_customer_code: string; // 請求先顧客コード
  billing_category_code: string; // 請求先分類コード
  fare_management_number: string; // 運賃管理番号
  cod_receipt_issue: string; // 代引き領収書発行
  delivery_note_type: string; // 納品書発行タイプ
  collection_billing_amount: string; // 収納代行請求金額
  collection_billing_tax: string; // 収納代行内消費税額等
  collection_billing_zip: string; // 収納代行請求先郵便番号
  collection_billing_address: string; // 収納代行請求先住所
  collection_billing_company: string; // 収納代行請求先会社・部門名
  collection_billing_name: string; // 収納代行請求先名
  collection_inquiry: string; // 収納代行問合せ先名/電話番号/管理番号
  collection_item_name: string; // 収納代行品名
  collection_note: string; // 収納代行備考
  posting_email_usage: string; // 投函予定メール（お届け先宛）利用区分
  posting_email_address: string; // 投函予定メール（お届け先宛）e-mail
  posting_email_message: string; // 投函予定メール（お届け先宛）メッセージ
  // 2個目のフォーマット項目
  delivery_complete_email_usage: string; // 投函完了メール（お届け先宛）利用区分
  delivery_complete_email_address: string; // 投函完了メール（お届け先宛）e-mailアドレス
  delivery_complete_email_message: string; // 投函完了メール（お届け先宛）メッセージ
  sender_complete_email_usage: string; // 投函完了メール（ご依頼主宛）利用区分
  sender_complete_email_address: string; // 投函完了メール（ご依頼主宛）e-mailアドレス
  sender_complete_email_message: string; // 投函完了メール（ご依頼主宛）メッセージ
  kuroneko_web_collect_data: string; // クロネコwebコレクトデータ登録
  kuroneko_web_collect_member_no: string; // クロネコwebコレクト加盟店番号
  kuroneko_web_collect_receipt_no1: string; // クロネコwebコレクト申込受付番号1
  kuroneko_web_collect_receipt_no2: string; // クロネコwebコレクト申込受付番号2
  kuroneko_web_collect_receipt_no3: string; // クロネコwebコレクト申込受付番号3
  billing_customer_code_required: string; // 請求先顧客コード（必須版）
  billing_category_code_required: string; // 請求先分類コード（必須版）
  fare_management_number_required: string; // 運賃管理番号（必須版）
  hold_service: string; // 止置き
  office_code_required: string; // 営業所コード（必須版）
  print_count_specific: string; // 発行枚数（特定サービス向け）
  quantity_display_flag: string; // 個数口表示フラグ
  multiple_bundle_key: string; // 複数口くくりキー
  search_key_title1: string; // 検索キータイトル1
  search_key1: string; // 検索キー1
  search_key_title2: string; // 検索キータイトル2
  search_key2: string; // 検索キー2
  search_key_title3: string; // 検索キータイトル3
  search_key3: string; // 検索キー3
  search_key_title4: string; // 検索キータイトル4
  search_key4: string; // 検索キー4
  search_key_title5: string; // 検索キータイトル5（自動補完）
  search_key5: string; // 検索キー5（自動補完）
  reserve1: string; // 予備（1）
  reserve2: string; // 予備（2）
  // 3個目のフォーマット項目
  delivery_schedule_email_usage: string; // お届け予定eメール利用区分
  delivery_schedule_email_address: string; // お届け予定eメールアドレス
  input_device_type: string; // 入力機種
  delivery_schedule_email_message: string; // お届け予定eメールメッセージ
  delivery_complete_email_usage_v2: string; // お届け完了eメール利用区分
  delivery_complete_email_address_v2: string; // お届け完了eメールアドレス
  delivery_complete_email_message_v2: string; // お届け完了eメールメッセージ
  kuroneko_collection_usage: string; // クロネコ収納代行利用区分
  collection_billing_amount_v2: string; // 収納代行請求金額（税込）
  collection_billing_tax_v2: string; // 収納代行内消費税額等
  collection_billing_zip_v2: string; // 収納代行請求先郵便番号
  collection_billing_address_v2: string; // 収納代行請求先住所
  collection_billing_building_v2: string; // 収納代行請求先住所（アパート・マンション名）
  collection_billing_company1_v2: string; // 収納代行請求先会社・部門名1
  collection_billing_company2_v2: string; // 収納代行請求先会社・部門名2
  collection_billing_name_kanji: string; // 収納代行請求先名（漢字）
  collection_billing_name_kana: string; // 収納代行請求先名（カナ）
  collection_inquiry_name_kanji: string; // 収納代行問合せ先名（漢字）
  collection_inquiry_zip: string; // 収納代行問合せ先郵便番号
  collection_inquiry_address: string; // 収納代行問合せ先住所
  collection_inquiry_building: string; // 収納代行問合せ先住所（アパート・マンション名）
  collection_inquiry_phone: string; // 収納代行問合せ先電話番号
  collection_management_number: string; // 収納代行管理番号
  collection_item_name_v2: string; // 収納代行品名
  collection_note_v2: string; // 収納代行備考
}

function convertOrderToYamatoCsv(order: any, senderInfo: any, settings?: any): YamatoCsvRow {
  const today = new Date();
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  // 郵便番号を7桁にフォーマット（ハイフンを除去）
  const formatZip = (zip: string) => {
    if (!zip) return '';
    return zip.replace(/[-\s]/g, '').substring(0, 7);
  };

  // 電話番号をフォーマット（ハイフン付きで15文字以内）
  const formatPhone = (phone: string) => {
    if (!phone) return '';
    return phone.substring(0, 15);
  };

  return {
    customer_management_number: `ORDER-${order.id}`, // 注文ID基準
    slip_type: settings?.default_slip_type || '0', // 設定値または発払い
    cool_section: settings?.default_cool_section || '0', // 設定値または通常
    slip_number: '', // B2クラウドで付与
    scheduled_ship_date: formatDate(today), // デフォルト：当日
    scheduled_delivery_date: order.delivery_date ? formatDate(new Date(order.delivery_date)) : '', // 注文の希望日または空白
    delivery_time: settings?.default_delivery_time || '', // 設定値または指定なし
    delivery_code: '', // 空白
    delivery_phone: formatPhone(order.phone || ''), // 注文の電話番号
    delivery_phone_branch: '', // 空白
    delivery_zip: formatZip(order.address?.match(/\d{3}-?\d{4}/)?.[0] || ''), // 住所から郵便番号を抽出
    delivery_address: order.address || '', // 注文の住所
    delivery_building: '', // 空白（住所に含まれる想定）
    delivery_company1: '', // 空白
    delivery_company2: '', // 空白
    delivery_name: order.customer_name || '', // 顧客名
    delivery_honorific: '', // 空白
    sender_code: '', // 空白
    sender_phone: formatPhone(senderInfo.phone || ''), // 事業者の電話番号
    sender_phone_branch: '', // 空白
    sender_zip: formatZip(senderInfo.zip || ''), // 事業者の郵便番号
    sender_address: senderInfo.address || '', // 事業者の住所
    sender_building: '', // 空白
    sender_name: senderInfo.name || '', // 事業者名
    sender_honorific: '', // 空白
    item_code1: `ITEM-${order.id}`, // 商品コード
    item_name1: order.item_name || '農産物', // 商品名（デフォルト：農産物）
    item_code2: '', // 空白
    item_name2: '', // 空白
    item_code3: '', // 空白
    item_name3: '', // 空白
    item_code4: '', // 空白
    item_name4: '', // 空白
    handling1: '', // 空白
    handling2: '', // 空白
    note: order.notes || '', // 注文メモ
    collect_amount: '', // 空白（発払いの場合）
    collect_tax: '', // 空白
    office_hold: '0', // 指定なし
    office_code: '', // 空白
    print_count: '01', // デフォルト：1枚
    quantity_print: '1', // 印字する
    billing_customer_code: '', // 空白
    billing_category_code: '', // 空白
    fare_management_number: '', // 空白
    cod_receipt_issue: '0', // 発行しない
    delivery_note_type: '0', // なし
    collection_billing_amount: '', // 空白
    collection_billing_tax: '', // 空白
    collection_billing_zip: '', // 空白
    collection_billing_address: '', // 空白
    collection_billing_company: '', // 空白
    collection_billing_name: '', // 空白
    collection_inquiry: '', // 空白
    collection_item_name: '', // 空白
    collection_note: '', // 空白
    posting_email_usage: '0', // 利用しない
    posting_email_address: '', // 空白
    posting_email_message: '', // 空白
    // 2個目のフォーマット項目
    delivery_complete_email_usage: settings?.enable_delivery_complete_email === 'true' ? (settings?.delivery_complete_email_type || '1') : '0',
    delivery_complete_email_address: settings?.enable_delivery_complete_email === 'true' ? (order.customer_email || '') : '',
    delivery_complete_email_message: settings?.enable_delivery_complete_email === 'true' ? (settings?.delivery_complete_email_message || '') : '',
    sender_complete_email_usage: settings?.enable_sender_complete_email === 'true' ? (settings?.sender_complete_email_type || '1') : '0',
    sender_complete_email_address: settings?.enable_sender_complete_email === 'true' ? (senderInfo.email || '') : '',
    sender_complete_email_message: settings?.enable_sender_complete_email === 'true' ? (settings?.sender_complete_email_message || '') : '',
    kuroneko_web_collect_data: '0', // 無し
    kuroneko_web_collect_member_no: '', // 空白
    kuroneko_web_collect_receipt_no1: '', // 空白
    kuroneko_web_collect_receipt_no2: '', // 空白
    kuroneko_web_collect_receipt_no3: '', // 空白
    billing_customer_code_required: settings?.billing_customer_code || '1000000000', // 設定値または10桁デフォルト
    billing_category_code_required: settings?.billing_category_code || '', // 設定値または空白
    fare_management_number_required: settings?.fare_management_number || '01', // 設定値または01
    hold_service: '0', // 利用しない
    office_code_required: '', // 空白（止置き利用時のみ必須）
    print_count_specific: settings?.default_print_count || '01', // 設定値または1枚
    quantity_display_flag: settings?.quantity_display_flag || '1', // 設定値または印字する
    multiple_bundle_key: '', // 空白（複数口時のみ）
    search_key_title1: settings?.search_key_title1 || '注文番号', // 設定値またはデフォルト
    search_key1: order.order_code || `ORDER-${order.id}`, // 注文コード
    search_key_title2: settings?.search_key_title2 || '顧客名', // 設定値またはデフォルト
    search_key2: (order.customer_name || '').substring(0, 20), // 顧客名（20文字以内）
    search_key_title3: settings?.search_key_title3 || '商品名', // 設定値またはデフォルト
    search_key3: (order.item_name || '農産物').substring(0, 20), // 商品名（20文字以内）
    search_key_title4: settings?.search_key_title4 || '注文日', // 設定値またはデフォルト
    search_key4: formatDate(new Date(order.created_at)).replace(/\//g, ''), // 注文日（YYYYMMDD形式）
    search_key_title5: 'ユーザーID', // 自動補完
    search_key5: `USER-${order.user_id || '0'}`, // ユーザーID（自動補完）
    reserve1: `BATCH-${Date.now()}`, // バッチ番号として利用
    reserve2: order.notes ? order.notes.substring(0, 50) : '', // メモの一部
    // 3個目のフォーマット項目
    delivery_schedule_email_usage: settings?.enable_delivery_schedule_email === 'true' ? '1' : '0',
    delivery_schedule_email_address: settings?.enable_delivery_schedule_email === 'true' ? (order.customer_email || '').substring(0, 60) : '',
    input_device_type: settings?.enable_delivery_schedule_email === 'true' ? (settings?.delivery_schedule_device_type || '1') : '',
    delivery_schedule_email_message: settings?.enable_delivery_schedule_email === 'true' ? (settings?.delivery_schedule_email_message || '').substring(0, 74) : '',
    delivery_complete_email_usage_v2: settings?.enable_delivery_complete_email_v2 === 'true' ? '1' : '0',
    delivery_complete_email_address_v2: settings?.enable_delivery_complete_email_v2 === 'true' ? (order.customer_email || '').substring(0, 60) : '',
    delivery_complete_email_message_v2: settings?.enable_delivery_complete_email_v2 === 'true' ? (settings?.delivery_complete_email_message_v2 || '').substring(0, 159) : '',
    kuroneko_collection_usage: settings?.enable_kuroneko_collection === 'true' ? '1' : '0',
    collection_billing_amount_v2: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_billing_amount || '0').padStart(7, '0') : '',
    collection_billing_tax_v2: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_billing_tax || '0').padStart(7, '0') : '',
    collection_billing_zip_v2: settings?.enable_kuroneko_collection === 'true' ? formatZip(settings?.collection_billing_zip || '') : '',
    collection_billing_address_v2: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_billing_address || '').substring(0, 64) : '',
    collection_billing_building_v2: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_billing_building || '').substring(0, 32) : '',
    collection_billing_company1_v2: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_billing_company1 || '').substring(0, 50) : '',
    collection_billing_company2_v2: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_billing_company2 || '').substring(0, 50) : '',
    collection_billing_name_kanji: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_billing_name_kanji || '').substring(0, 32) : '',
    collection_billing_name_kana: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_billing_name_kana || '').substring(0, 50) : '',
    collection_inquiry_name_kanji: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_inquiry_name_kanji || '').substring(0, 32) : '',
    collection_inquiry_zip: settings?.enable_kuroneko_collection === 'true' ? formatZip(settings?.collection_inquiry_zip || '') : '',
    collection_inquiry_address: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_inquiry_address || '').substring(0, 64) : '',
    collection_inquiry_building: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_inquiry_building || '').substring(0, 32) : '',
    collection_inquiry_phone: settings?.enable_kuroneko_collection === 'true' ? formatPhone(settings?.collection_inquiry_phone || '') : '',
    collection_management_number: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_management_number || '').substring(0, 20) : '',
    collection_item_name_v2: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_item_name || '').substring(0, 50) : '',
    collection_note_v2: settings?.enable_kuroneko_collection === 'true' ? (settings?.collection_note || '').substring(0, 28) : '',
  };
}

export async function POST(request: NextRequest) {
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

    const { orderIds } = await request.json();
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '注文IDが指定されていません' 
      }, { status: 400 });
    }

    client = await getDbClient();
    
    // 指定された注文を取得（ユーザー固有）
    const placeholders = orderIds.map((_, index) => `$${index + 2}`).join(',');
    const ordersResult = await client.query(`
      SELECT id, order_code, customer_name, phone, address, delivery_date, 
             notes, item_name, price, created_at
      FROM orders 
      WHERE id IN (${placeholders}) AND user_id = $1
      ORDER BY created_at
    `, [sessionData.user.id, ...orderIds]);

    if (ordersResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '指定された注文が見つかりません' 
      }, { status: 404 });
    }

    // 送信者情報を取得（ユーザー情報から）
    const userResult = await client.query(`
      SELECT username, email FROM users WHERE id = $1
    `, [sessionData.user.id]);

    // ユーザーの設定を取得
    const settingsResult = await client.query(`
      SELECT setting_key, setting_value 
      FROM user_settings 
      WHERE user_id = $1 AND setting_key LIKE 'yamato_%'
    `, [sessionData.user.id]);

    // 設定をオブジェクトに変換
    const userSettings: any = {};
    settingsResult.rows.forEach(row => {
      const key = row.setting_key.replace('yamato_', '');
      userSettings[key] = row.setting_value;
    });

    // 送信者情報（設定値またはデフォルト）
    const senderInfo = {
      name: userSettings.sender_name || userResult.rows[0]?.username || '農業事業者',
      phone: userSettings.sender_phone || '03-1234-5678',
      zip: userSettings.sender_zip || '1000001',
      address: userSettings.sender_address || '東京都千代田区千代田1-1'
    };

    // CSVデータを生成
    const csvRows = ordersResult.rows.map(order => convertOrderToYamatoCsv(order, senderInfo, userSettings));
    
    // CSVヘッダー（日本語）- 1個目と2個目の項目を結合
    const headers = [
      // 1個目のフォーマット項目
      'お客様管理番号', '送り状種類', 'クール区分', '伝票番号', '出荷予定日', 'お届け予定日', '配達時間帯',
      'お届け先コード', 'お届け先電話番号', 'お届け先電話番号枝番', 'お届け先郵便番号', 'お届け先住所',
      'お届け先アパート・マンション名', 'お届け先会社・部門名1', 'お届け先会社・部門名2', 'お届け先名', 'お届け先名（敬称）',
      'ご依頼主コード', 'ご依頼主電話番号', 'ご依頼主電話番号枝番', 'ご依頼主郵便番号', 'ご依頼主住所',
      'ご依頼主住所（ビル・マンション名）', 'ご依頼主名', 'ご依頼主名（敬称）',
      '品名コード1', '品名1', '品名コード2', '品名2', '品名コード3', '品名3', '品名コード4', '品名4',
      '荷扱い1', '荷扱い2', '記事', 'コレクト代金引換金額', 'コレクト内消費税額等', '営業所止置き', '営業所コード',
      '発行枚数', '個数口枠の印字', '請求先顧客コード', '請求先分類コード', '運賃管理番号', '代引き領収書発行',
      '納品書発行タイプ', '収納代行請求金額', '収納代行内消費税額等', '収納代行請求先郵便番号', '収納代行請求先住所',
      '収納代行請求先会社・部門名', '収納代行請求先名', '収納代行問合せ先名/電話番号/管理番号', '収納代行品名',
      '収納代行備考', '投函予定メール（お届け先宛）利用区分', '投函予定メール（お届け先宛）e-mail', 
      '投函予定メール（お届け先宛）メッセージ',
      // 2個目のフォーマット項目
      '投函完了メール（お届け先宛）利用区分', '投函完了メール（お届け先宛）e-mailアドレス', '投函完了メール（お届け先宛）メッセージ',
      '投函完了メール（ご依頼主宛）利用区分', '投函完了メール（ご依頼主宛）e-mailアドレス', '投函完了メール（ご依頼主宛）メッセージ',
      'クロネコwebコレクトデータ登録', 'クロネコwebコレクト加盟店番号', 'クロネコwebコレクト申込受付番号1',
      'クロネコwebコレクト申込受付番号2', 'クロネコwebコレクト申込受付番号3', '請求先顧客コード（必須）',
      '請求先分類コード（必須）', '運賃管理番号（必須）', '止置き', '営業所コード（必須）', '発行枚数（特定サービス）',
      '個数口表示フラグ', '複数口くくりキー', '検索キータイトル1', '検索キー1', '検索キータイトル2', '検索キー2',
      '検索キータイトル3', '検索キー3', '検索キータイトル4', '検索キー4', '検索キータイトル5', '検索キー5',
      '予備（1）', '予備（2）',
      // 3個目のフォーマット項目
      'お届け予定eメール利用区分', 'お届け予定eメールアドレス', '入力機種', 'お届け予定eメールメッセージ',
      'お届け完了eメール利用区分', 'お届け完了eメールアドレス', 'お届け完了eメールメッセージ',
      'クロネコ収納代行利用区分', '収納代行請求金額（税込）', '収納代行内消費税額等', '収納代行請求先郵便番号',
      '収納代行請求先住所', '収納代行請求先住所（アパート・マンション名）', '収納代行請求先会社・部門名1',
      '収納代行請求先会社・部門名2', '収納代行請求先名（漢字）', '収納代行請求先名（カナ）',
      '収納代行問合せ先名（漢字）', '収納代行問合せ先郵便番号', '収納代行問合せ先住所',
      '収納代行問合せ先住所（アパート・マンション名）', '収納代行問合せ先電話番号', '収納代行管理番号',
      '収納代行品名', '収納代行備考'
    ];

    // CSV文字列を生成
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','))
    ].join('\n');

    return NextResponse.json({
      success: true,
      csv: csvContent,
      filename: `yamato_b2_${new Date().toISOString().split('T')[0]}_${orderIds.length}orders.csv`,
      order_count: csvRows.length
    });

  } catch (error) {
    console.error('Yamato CSV generation error:', error);
    return NextResponse.json({
      success: false,
      message: 'CSVの生成に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}