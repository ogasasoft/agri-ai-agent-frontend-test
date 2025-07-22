import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { Client } from 'pg';

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

// maskPersonalInfo関数 (orders/route.tsから移植)
function maskPersonalInfo(text: string): string {
  if (!text || text.length <= 2) return text;
  const first = text.charAt(0);
  const last = text.charAt(text.length - 1);
  const middle = '*'.repeat(text.length - 2);
  return `${first}${middle}${last}`;
}

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

// CSVデータをPostgreSQLに保存
async function saveOrdersToDb(orders: any[]): Promise<{ inserted: number; errors: string[] }> {
  const client = await getDbClient();
  let inserted = 0;
  const errors: string[] = [];
  
  try {
    for (const order of orders) {
      try {
        await client.query(`
          INSERT INTO orders (order_code, customer_name, phone, address, price, order_date, delivery_date, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (order_code) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            price = EXCLUDED.price,
            order_date = EXCLUDED.order_date,
            delivery_date = EXCLUDED.delivery_date,
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP
        `, [
          order.order_code,
          order.customer_name,
          order.phone,
          order.address,
          order.price,
          order.order_date,
          order.delivery_date,
          order.notes
        ]);
        inserted++;
      } catch (dbError: any) {
        errors.push(`注文番号 ${order.order_code}: ${dbError.message}`);
      }
    }
  } finally {
    await client.end();
  }
  
  return { inserted, errors };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        message: 'ファイルが選択されていません。' 
      }, { status: 400 });
    }
    
    // CSVファイルの検証
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ 
        success: false, 
        message: 'CSVファイルのみ対応しています。' 
      }, { status: 400 });
    }
    
    // ファイル内容を読み取り
    const text = await file.text();
    
    // CSV解析
    const parseResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'CSVファイルの解析に失敗しました。',
        errors: parseResult.errors.map((e: Papa.ParseError) => e.message)
      }, { status: 400 });
    }
    
    const csvData = parseResult.data;
    
    if (csvData.length === 0) {
      return NextResponse.json({ 
        success: false, 
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
        const orderDateStr = row[Object.keys(COLUMN_MAPPING)[5]] || row['注文日'];
        
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
        
        if (!orderDateStr) {
          validationErrors.push(`行${lineNo}: 注文日が必須です。`);
          continue;
        }
        
        // データ型変換
        const price = parsePrice(priceStr);
        if (price === null) {
          validationErrors.push(`行${lineNo}: 金額の形式が正しくありません。`);
          continue;
        }
        
        const orderDate = formatDate(orderDateStr);
        if (!orderDate) {
          validationErrors.push(`行${lineNo}: 注文日の形式が正しくありません。`);
          continue;
        }
        
        // 希望配達日は任意
        const deliveryDateStr = row[Object.keys(COLUMN_MAPPING)[6]] || row['希望配達日'] || '';
        const deliveryDate = deliveryDateStr ? formatDate(deliveryDateStr) : null;
        
        // 顧客名をマスキング
        const maskedCustomerName = maskPersonalInfo(customerName);
        
        processedOrders.push({
          order_code: orderCode.trim(),
          customer_name: maskedCustomerName,
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
        success: false, 
        message: 'データの検証に失敗しました。',
        errors: validationErrors
      }, { status: 400 });
    }
    
    // データベースに保存
    const saveResult = await saveOrdersToDb(processedOrders);
    
    return NextResponse.json({ 
      success: true,
      message: `${saveResult.inserted}件のデータが正常に保存されました。`,
      inserted: saveResult.inserted,
      errors: saveResult.errors
    });
    
  } catch (error: any) {
    console.error('CSV upload error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'サーバーエラーが発生しました。',
      error: error.message
    }, { status: 500 });
  }
}