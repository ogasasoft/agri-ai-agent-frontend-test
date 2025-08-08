import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { Client } from 'pg';
import { validateSession } from '@/lib/auth';

// CSV日本語ヘッダーと英語カラム名のマッピング
const COLUMN_MAPPING: Record<string, string> = {
  '注文番号': 'order_code',
  '顧客名': 'customer_name',
  '電話番号': 'phone',
  '住所': 'address',
  '金額': 'price',
  '注文日': 'order_date',
  '希望配達日': 'delivery_date',
  '備考': 'notes',
};


// 日付フォーマット変換 (YYYY-MM-DD形式に統一)
function formatDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch (error) {
    return null;
  }
}

// 価格を整数に変換
function parsePrice(priceStr: string): number | null {
  if (!priceStr || priceStr.trim() === '') return null;
  
  // カンマ、円マークなどを除去
  const cleanPrice = priceStr.replace(/[,円¥]/g, '').trim();
  const price = parseInt(cleanPrice, 10);
  
  return isNaN(price) ? null : price;
}

// データベース接続
async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

// カテゴリ別CSVデータをPostgreSQLに保存
async function saveOrdersToDb(orders: any[], categoryId: number, userId: string): Promise<{ registered: number; skipped: number; skippedCodes: string[] }> {
  console.log(`🔌 Connecting to database for category ID: ${categoryId}...`);
  const client = await getDbClient();
  let registered = 0;
  let skipped = 0;
  const skippedCodes: string[] = [];
  
  try {
    console.log('📊 Processing orders:', orders.length);
    
    for (const order of orders) {
      try {
        console.log('💾 Processing order:', order.order_code);
        
        // 重複チェック (同じユーザー内で)
        const existingOrder = await client.query(
          'SELECT order_code FROM orders WHERE order_code = $1 AND user_id = $2',
          [order.order_code, userId]
        );
        
        if (existingOrder.rows.length > 0) {
          console.log('⚠️ Duplicate order code, skipping:', order.order_code);
          skipped++;
          skippedCodes.push(order.order_code);
          continue;
        }
        
        // 新規注文を挿入 (category_idとuser_idを含む)
        const result = await client.query(`
          INSERT INTO orders (
            order_code, customer_name, phone, address, price, 
            order_date, delivery_date, notes, category_id,
            source, extra_data, user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, [
          order.order_code,
          order.customer_name,
          order.phone,
          order.address,
          order.price,
          order.order_date,
          order.delivery_date,
          order.notes,
          categoryId, // category_id
          'csv_upload', // source
          JSON.stringify({ upload_method: 'category_csv', category_id: categoryId }), // extra_data
          userId // user_id
        ]);
        
        console.log('✅ Order saved with ID:', result.rows[0]?.id);
        registered++;
      } catch (dbError: any) {
        console.error('❌ DB Error for order', order.order_code, ':', dbError.message);
        // エラーの場合はスキップとして処理
        skipped++;
        skippedCodes.push(order.order_code);
      }
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
  
  return { registered, skipped, skippedCodes };
}

export async function POST(request: NextRequest) {
  console.log('📤 Category CSV Upload request received');
  
  try {
    // 認証チェック
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        message: '認証が必要です。'
      }, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      return NextResponse.json({
        success: false,
        message: 'セッションが無効です。'
      }, { status: 401 });
    }

    const userId = sessionData.user.id.toString();

    const formData = await request.formData();
    
    // CSRF トークンチェック（ヘッダーまたはFormDataから取得）
    const csrfTokenFromHeader = request.headers.get('x-csrf-token');
    const csrfTokenFromForm = formData.get('csrf_token') as string;
    const csrfToken = csrfTokenFromHeader || csrfTokenFromForm;
    
    if (!csrfToken || csrfToken !== sessionData.session.csrf_token) {
      console.log('CSRF検証失敗:', {
        headerToken: csrfTokenFromHeader,
        formToken: csrfTokenFromForm,
        expectedToken: sessionData.session.csrf_token
      });
      return NextResponse.json({
        success: false,
        message: 'CSRF検証に失敗しました。'
      }, { status: 403 });
    }
    const file = formData.get('file') as File;
    const categoryId = parseInt(formData.get('categoryId') as string);
    
    console.log('📁 File info:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      categoryId: categoryId
    });
    
    if (!file) {
      return NextResponse.json({ 
        success: false,
        message: 'ファイルが選択されていません。' 
      }, { status: 400 });
    }

    // ファイルサイズ制限（10MB）
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        message: 'ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。'
      }, { status: 400 });
    }
    
    if (!categoryId || isNaN(categoryId)) {
      return NextResponse.json({ 
        message: '有効なカテゴリIDを指定してください。' 
      }, { status: 400 });
    }
    
    const client = await getDbClient();
    
    // Verify category exists and belongs to user
    try {
      const categoryResult = await client.query(
        'SELECT name FROM categories WHERE id = $1 AND is_active = true AND user_id = $2',
        [categoryId, userId]
      );
      
      if (categoryResult.rows.length === 0) {
        return NextResponse.json({ 
          message: '指定されたカテゴリが見つかりません。' 
        }, { status: 404 });
      }
      
      var categoryName = categoryResult.rows[0].name;
    } finally {
      await client.end();
    }
    
    // CSVファイルの検証
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ 
        message: 'CSVファイルのみ対応しています。' 
      }, { status: 400 });
    }
    
    // ファイル内容を読み取り
    const text = await file.text();
    console.log('📄 File content preview:', text.substring(0, 200) + '...');
    
    // CSV解析
    const parseResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    
    console.log('🔍 Parse result:', {
      dataLength: parseResult.data.length,
      errorsLength: parseResult.errors?.length || 0,
      fields: parseResult.meta?.fields || 'not available'
    });
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      return NextResponse.json({ 
        message: 'CSVファイルの解析に失敗しました。',
        errors: parseResult.errors.map((e: Papa.ParseError) => e.message)
      }, { status: 400 });
    }
    
    const csvData = parseResult.data;
    
    if (csvData.length === 0) {
      return NextResponse.json({ 
        message: 'CSVファイルにデータが含まれていません。' 
      }, { status: 400 });
    }
    
    // データ変換とバリデーション
    const processedOrders = [];
    const validationErrors = [];
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const lineNo = i + 2; // ヘッダー行を考慮
      
      try {
        // 必須項目の確認
        const orderCode = row[Object.keys(COLUMN_MAPPING)[0]] || row['注文番号'];
        const customerName = row[Object.keys(COLUMN_MAPPING)[1]] || row['顧客名'];
        const priceStr = row[Object.keys(COLUMN_MAPPING)[4]] || row['金額'];
        
        if (!orderCode) {
          validationErrors.push(`行${lineNo}: 注文番号が必須です。`);
          continue;
        }
        
        if (!customerName) {
          validationErrors.push(`行${lineNo}: 顧客名が必須です。`);
          continue;
        }
        
        if (!priceStr) {
          validationErrors.push(`行${lineNo}: 金額が必須です。`);
          continue;
        }
        
        // データ型変換
        const price = parsePrice(priceStr);
        if (price === null) {
          validationErrors.push(`行${lineNo}: 金額の形式が正しくありません。`);
          continue;
        }
        
        // 注文日の処理 (オプショナル、デフォルトは今日)
        const orderDateStr = row[Object.keys(COLUMN_MAPPING)[5]] || row['注文日'] || '';
        const orderDate = orderDateStr ? formatDate(orderDateStr) : new Date().toISOString().split('T')[0];
        
        // 希望配達日は任意
        const deliveryDateStr = row[Object.keys(COLUMN_MAPPING)[6]] || row['希望配達日'] || '';
        const deliveryDate = deliveryDateStr ? formatDate(deliveryDateStr) : null;
        
        processedOrders.push({
          order_code: orderCode.trim(),
          customer_name: customerName,
          phone: (row[Object.keys(COLUMN_MAPPING)[2]] || row['電話番号'] || '').trim(),
          address: (row[Object.keys(COLUMN_MAPPING)[3]] || row['住所'] || '').trim(),
          price,
          order_date: orderDate,
          delivery_date: deliveryDate,
          notes: (row[Object.keys(COLUMN_MAPPING)[7]] || row['備考'] || '').trim()
        });
        
      } catch (error: any) {
        validationErrors.push(`行${lineNo}: ${error.message}`);
      }
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        message: 'データの検証に失敗しました。',
        errors: validationErrors
      }, { status: 400 });
    }
    
    console.log(`💾 Saving to database (${categoryName}):`, processedOrders.length, 'orders');
    
    // カテゴリ別にデータベースに保存
    const saveResult = await saveOrdersToDb(processedOrders, categoryId, userId);
    
    console.log('✅ Save result:', saveResult);
    
    return NextResponse.json({ 
      message: `${categoryName}カテゴリの注文データを処理しました。`,
      registered_count: saveResult.registered,
      skipped_count: saveResult.skipped,
      skipped_order_codes: saveResult.skippedCodes
    });
    
  } catch (error: any) {
    console.error('Category CSV upload error:', error);
    return NextResponse.json({ 
      message: 'サーバーエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}