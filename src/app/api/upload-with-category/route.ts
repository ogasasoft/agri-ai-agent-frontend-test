import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { debugLogger } from '@/lib/debug-logger';
import { analyzeAndLogCSV, validateAndLogMapping } from '@/lib/csv-debug';
import { CSVErrorBuilder, ErrorDetailBuilder } from '@/lib/error-details';
import {
  detectAndConvertEncoding,
  analyzeCSVHeaders,
  generateEncodingDebugInfo
} from '@/lib/csv-encoding';
import {
  diagnoseEncodingError,
  diagnoseMissingFieldsError,
  diagnoseFileFormatError,
  diagnoseDataValidationError,
  diagnoseUnknownError,
  formatDiagnosticsForUser
} from '@/lib/csv-error-diagnostics';

export const dynamic = 'force-dynamic';

// データソース別のCSVヘッダーマッピング
const DATA_SOURCE_MAPPINGS = {
  tabechoku: {
    '注文番号': 'order_code',
    '顧客名': 'customer_name',
    '電話番号': 'phone',
    '住所': 'address',
    '金額': 'price',
    '注文日': 'order_date',
    '希望配達日': 'delivery_date',
    '備考': 'notes',
  },
  colormi: {
    '売上ID': 'order_code',
    '購入者 名前': 'customer_name',
    '購入者 電話番号': 'phone',
    '購入者 住所': 'address',
    '購入商品 販売価格(消費税込)': 'price',
    '受注日': 'order_date',
    '配送希望日': 'delivery_date', // カラーミーの配送希望日
    '備考': 'notes',
  }
};

// 後方互換性のための旧マッピング（デフォルトはたべちょく）
const COLUMN_MAPPING: Record<string, string> = DATA_SOURCE_MAPPINGS.tabechoku;

// データソースに基づいて適切なカラムマッピングを取得
function getColumnMapping(dataSource: string): Record<string, string> {
  return DATA_SOURCE_MAPPINGS[dataSource as keyof typeof DATA_SOURCE_MAPPINGS] || DATA_SOURCE_MAPPINGS.tabechoku;
}

// データソースに基づいてCSVの行からフィールドを抽出
function extractFieldFromRow(row: Record<string, string>, dataSource: string, fieldName: string): string {
  // データソース固有の処理を直接実行
  if (dataSource === 'colormi') {
    // カラーミー固有のフォールバック
    switch (fieldName) {
      case 'order_code': return row['売上ID'] || '';
      case 'customer_name': return row['購入者 名前'] || '';
      case 'phone': return row['購入者 電話番号'] || '';
      case 'address':
        // カラーミーは住所が分割されているので統合
        const prefecture = row['購入者 都道府県'] || '';
        const address = row['購入者 住所'] || '';
        return prefecture && address ? `${prefecture}${address}` : (prefecture || address);
      case 'price': return row['購入商品 販売価格(消費税込)'] || row['総合計金額'] || '';
      case 'order_date': return row['受注日'] || '';
      case 'delivery_date': return row['配送希望日'] || '';
      case 'notes': return row['備考'] || '';
      default: return '';
    }
  } else {
    // たべちょく固有のフォールバック
    switch (fieldName) {
      case 'order_code': return row['注文番号'] || '';
      case 'customer_name': return row['顧客名'] || '';
      case 'phone': return row['電話番号'] || '';
      case 'address': return row['住所'] || '';
      case 'price': return row['金額'] || '';
      case 'order_date': return row['注文日'] || '';
      case 'delivery_date': return row['希望配達日'] || '';
      case 'notes': return row['備考'] || '';
      default: return '';
    }
  }
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


// カテゴリ別CSVデータをPostgreSQLに保存
async function saveOrdersToDb(orders: any[], categoryId: number, userId: string, categoryName: string): Promise<{ registered: number; skipped: number; skippedDetails: any[] }> {
  // Connect to database for category processing
  const client = await getDbClient();
  let registered = 0;
  let skipped = 0;
  const skippedDetails: any[] = [];
  
  try {
    // Processing orders for database insertion
    
    for (const order of orders) {
      try {
        // Processing individual order
        
        // 重複チェック (同じユーザー内で)
        const existingOrder = await client.query(
          'SELECT order_code, customer_name, price, order_date FROM orders WHERE order_code = $1 AND user_id = $2',
          [order.order_code, userId]
        );
        
        if (existingOrder.rows.length > 0) {
          // Duplicate order code found, skipping
          skipped++;
          const existing = existingOrder.rows[0];
          skippedDetails.push({
            order_code: order.order_code,
            customer_name: order.customer_name,
            price: order.price,
            order_date: order.order_date,
            reason: '重複',
            existing_data: {
              customer_name: existing.customer_name,
              price: existing.price,
              order_date: existing.order_date
            }
          });
          continue;
        }
        
        // カテゴリ名をproduct_categoryとして使用（既にcategoryNameを取得済み）
        const productCategory = categoryName || 'その他';
        
        // 新規注文を挿入 (category_idとuser_idを含む)
        const result = await client.query(`
          INSERT INTO orders (
            order_code, customer_name, phone, address, price, 
            order_date, delivery_date, notes, category_id,
            product_category, source, extra_data, user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          productCategory, // product_category
          'csv_upload', // source
          JSON.stringify({ upload_method: 'category_csv', category_id: categoryId }), // extra_data
          userId // user_id
        ]);
        
        // Order successfully saved
        registered++;
      } catch (dbError: any) {
        console.error('❌ DB Error for order', order.order_code, ':', dbError.message);
        // エラーの場合はスキップとして処理
        skipped++;
        skippedDetails.push({
          order_code: order.order_code,
          customer_name: order.customer_name,
          price: order.price,
          order_date: order.order_date,
          reason: 'DBエラー',
          error_message: dbError.message
        });
      }
    }
  } finally {
    await client.end();
    // Database connection closed
  }
  
  return { registered, skipped, skippedDetails };
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const context = { apiRoute: '/api/upload-with-category', requestId, operation: 'CSV_UPLOAD' };
  let file: File | null = null;
  
  debugLogger.info('CSV Upload API Called', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(
      Array.from(request.headers.entries()).filter(([key]) => 
        key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')
      )
    )
  }, context);
  
  const timer = debugLogger.startTimer(`CSV Upload ${requestId}`);
  
  try {
    
    // 認証チェック
    const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
    
    debugLogger.debug('Authentication Check', {
      hasSessionToken: !!sessionToken,
      tokenPrefix: sessionToken?.substring(0, 20) + '...'
    }, context);
    
    if (!sessionToken) {
      debugLogger.warn('Authentication Failed - No Session Token', {}, context);
      timer();
      return NextResponse.json({
        success: false,
        message: '認証が必要です。'
      }, { status: 401 });
    }

    debugLogger.debug('Validating session...', {}, context);
    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      debugLogger.warn('Authentication Failed - Invalid Session', {}, context);
      timer();
      return NextResponse.json({
        success: false,
        message: 'セッションが無効です。'
      }, { status: 401 });
    }

    const userId = sessionData.user.id.toString();
    (context as any).userId = userId;
    debugLogger.info('Authentication Success', { userId }, context);

    const formData = await request.formData();
    
    debugLogger.debug('FormData Processing', {
      entries: Array.from(formData.entries()).map(([key, value]) => ({
        key,
        value: value instanceof File ? 
          `File(${value.name}, ${value.size} bytes, ${value.type})` :
          value
      }))
    }, context);
    
    // CSRF トークンチェック
    const csrfTokenFromHeader = request.headers.get('x-csrf-token');
    const csrfTokenFromForm = formData.get('csrf_token') as string;
    const csrfToken = csrfTokenFromHeader || csrfTokenFromForm;
    
    debugLogger.debug('CSRF Token Validation', {
      hasHeaderToken: !!csrfTokenFromHeader,
      hasFormToken: !!csrfTokenFromForm,
      tokensMatch: csrfToken === sessionData.session.csrf_token
    }, context);

    if (!csrfToken || csrfToken !== sessionData.session.csrf_token) {
      debugLogger.warn('CSRF Validation Failed', {}, context);
      timer();
      return NextResponse.json({
        success: false,
        message: 'CSRF検証に失敗しました。'
      }, { status: 403 });
    }
    
    debugLogger.info('CSRF Validation Success', {}, context);
    file = formData.get('file') as File;
    const categoryIdRaw = formData.get('categoryId') as string;
    const categoryId = parseInt(categoryIdRaw);
    const dataSource = (formData.get('dataSource') as string) || 'tabechoku';
    
    const processingData = {
      categoryId,
      categoryIdRaw,
      dataSource,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    };
    
    debugLogger.info('Processing Parameters', processingData, context);
    
    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'ファイルが選択されていません。'
      }, { status: 400 });
    }

    // ファイル形式とサイズの事前診断
    const fileFormatDiagnostics = diagnoseFileFormatError(file.name, file.size);
    if (fileFormatDiagnostics.severity === 'critical') {
      const userMessage = formatDiagnosticsForUser(fileFormatDiagnostics);
      debugLogger.warn('File format validation failed', fileFormatDiagnostics, context);
      return NextResponse.json(userMessage, { status: 400 });
    }
    
    if (!categoryIdRaw || categoryIdRaw.trim() === '' || isNaN(categoryId) || categoryId <= 0) {
      // Invalid category ID provided
      return NextResponse.json({ 
        success: false,
        message: '有効なカテゴリIDを指定してください。'
      }, { status: 400 });
    }
    
    let categoryName: string;
    
    // Verify category exists and belongs to user
    const client = await getDbClient();
    try {
      const categoryResult = await client.query(
        'SELECT name FROM categories WHERE id = $1 AND is_active = true AND user_id = $2',
        [categoryId, userId]
      );
      
      if (categoryResult.rows.length === 0) {
        return NextResponse.json({ 
          success: false,
          message: '指定されたカテゴリが見つかりません。' 
        }, { status: 404 });
      }
      
      categoryName = categoryResult.rows[0].name;
    } finally {
      await client.end();
    }
    
    // CSVファイルの検証
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ 
        success: false,
        message: 'CSVファイルのみ対応しています。' 
      }, { status: 400 });
    }
    
    // ファイル内容を読み取り（自動エンコーディング検出・変換）
    const buffer = await file.arrayBuffer();

    debugLogger.info('Starting encoding detection', { fileSize: buffer.byteLength }, context);
    const encodingResult = detectAndConvertEncoding(buffer);

    debugLogger.info('Encoding detection completed', {
      detectedEncoding: encodingResult.detectedEncoding,
      confidence: encodingResult.confidence,
      isJapanese: encodingResult.isJapanese,
      hasGarbledText: encodingResult.hasGarbledText
    }, context);

    // CSVヘッダー分析
    const headerAnalysis = analyzeCSVHeaders(encodingResult.text);
    const debugInfo = generateEncodingDebugInfo(encodingResult, headerAnalysis);
    debugLogger.csvDebug('encoding_analysis', debugInfo, context);

    // 自動検出されたデータソースを優先使用
    const detectedDataSource = headerAnalysis.dataSource !== 'unknown' ? headerAnalysis.dataSource : dataSource;
    debugLogger.info('Data source determination', {
      formDataSource: dataSource,
      detectedDataSource: headerAnalysis.dataSource,
      finalDataSource: detectedDataSource
    }, context);

    // エンコーディングエラーの診断
    const encodingDiagnostics = diagnoseEncodingError(encodingResult, headerAnalysis);
    if (encodingDiagnostics.severity === 'critical') {
      const userMessage = formatDiagnosticsForUser(encodingDiagnostics);
      debugLogger.error('Encoding validation failed', encodingDiagnostics, context);
      return NextResponse.json(userMessage, { status: 400 });
    }

    const text = encodingResult.text;
    // File content loaded for processing with encoding: ${encodingResult.detectedEncoding}
    
    // CSV解析
    debugLogger.info('Starting CSV Parsing', { dataSource }, context);
    const parseResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    
    debugLogger.info('CSV Parsing Completed', {
      rowCount: parseResult.data.length,
      errorCount: parseResult.errors?.length || 0
    }, context);
    
    // CSV分析と詳細ログ
    if (parseResult.data.length > 0) {
      const analysis = analyzeAndLogCSV(parseResult.data, dataSource);
      debugLogger.csvDebug('analysis', analysis, context);
    }
    
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
        // データソースに基づいてフィールドを抽出（検出されたデータソースを使用）
        const mappingResult = {
          order_code: extractFieldFromRow(row, detectedDataSource, 'order_code'),
          customer_name: extractFieldFromRow(row, detectedDataSource, 'customer_name'),
          price: extractFieldFromRow(row, detectedDataSource, 'price'),
          phone: extractFieldFromRow(row, detectedDataSource, 'phone'),
          address: extractFieldFromRow(row, detectedDataSource, 'address')
        };
        
        // 初回のみマッピング結果をログ出力
        if (i === 0) {
          const missingFields = validateAndLogMapping(row, detectedDataSource, mappingResult);
          debugLogger.csvDebug('mapping', mappingResult, context);
        }
        
        const { order_code: orderCode, customer_name: customerName, price: priceStr } = mappingResult;
        
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
        const orderDateStr = extractFieldFromRow(row, detectedDataSource, 'order_date') || '';
        const orderDate = orderDateStr ? formatDate(orderDateStr) : new Date().toISOString().split('T')[0];

        // 希望配達日は任意（カラーミーの場合は通常なし）
        const deliveryDateStr = extractFieldFromRow(row, detectedDataSource, 'delivery_date') || '';
        const deliveryDate = deliveryDateStr ? formatDate(deliveryDateStr) : null;

        processedOrders.push({
          order_code: orderCode.trim(),
          customer_name: customerName,
          phone: extractFieldFromRow(row, detectedDataSource, 'phone').trim(),
          address: extractFieldFromRow(row, detectedDataSource, 'address').trim(),
          price,
          order_date: orderDate,
          delivery_date: deliveryDate,
          notes: extractFieldFromRow(row, detectedDataSource, 'notes').trim()
        });
        
      } catch (error: any) {
        validationErrors.push(`行${lineNo}: ${error.message}`);
      }
    }
    
    // 必須フィールド不足の事前チェック
    if (!headerAnalysis.hasRequiredFields) {
      const missingFieldsDiagnostics = diagnoseMissingFieldsError(headerAnalysis, headerAnalysis.missingFields);
      const userMessage = formatDiagnosticsForUser(missingFieldsDiagnostics);
      debugLogger.error('Required fields missing', missingFieldsDiagnostics, context);
      timer();
      return NextResponse.json(userMessage, { status: 400 });
    }

    if (validationErrors.length > 0) {
      debugLogger.error('Validation Failed', {
        errorCount: validationErrors.length,
        totalRows: csvData.length,
        processedRows: processedOrders.length,
        sampleErrors: validationErrors.slice(0, 5)
      }, context);

      // 詳細なデータ検証エラー診断
      const validationDiagnostics = diagnoseDataValidationError(
        validationErrors,
        csvData.length,
        processedOrders.length
      );
      const userMessage = formatDiagnosticsForUser(validationDiagnostics);

      timer();
      return NextResponse.json(userMessage, { status: 400 });
    }
    
    // Saving processed orders to database
    
    // カテゴリ別にデータベースに保存
    debugLogger.info('Starting Database Save', {
      orderCount: processedOrders.length,
      categoryId,
      categoryName
    }, context);
    
    const saveResult = await saveOrdersToDb(processedOrders, categoryId, userId, categoryName);
    
    debugLogger.info('Database Save Completed', {
      registered: saveResult.registered,
      skipped: saveResult.skipped
    }, context);
    
    timer(); // タイマー終了
    
    return NextResponse.json({ 
      success: true,
      message: `${categoryName}カテゴリの注文データを処理しました。`,
      registered_count: saveResult.registered,
      skipped_count: saveResult.skipped,
      skipped_details: saveResult.skippedDetails
    });
    
  } catch (error: any) {
    debugLogger.error('CSV Upload Failed', error, context);
    timer(); // タイマー終了

    // 詳細なエラー診断
    const unknownErrorDiagnostics = diagnoseUnknownError(error, {
      requestId,
      userId: (context as any).userId,
      fileName: file?.name || 'unknown',
      fileSize: file?.size || 0
    });
    const userMessage = formatDiagnosticsForUser(unknownErrorDiagnostics);

    return NextResponse.json(userMessage, { status: 500 });
  }
}