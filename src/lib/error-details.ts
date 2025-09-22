// API エラー詳細レスポンス機能
export interface DetailedErrorResponse {
  success: false;
  message: string;
  error_code: string;
  details?: any;
  debug_info?: {
    timestamp: string;
    request_id?: string;
    user_id?: string;
    operation?: string;
    processing_steps?: Array<{
      step: string;
      status: 'completed' | 'failed' | 'skipped';
      details?: any;
      error?: string;
    }>;
    data_analysis?: {
      total_rows?: number;
      processed_rows?: number;
      failed_rows?: number;
      headers?: string[];
      sample_data?: any;
      validation_errors?: string[];
    };
  };
  suggestions?: string[];
}

export class ErrorDetailBuilder {
  protected errorResponse: DetailedErrorResponse;

  constructor(message: string, errorCode: string) {
    this.errorResponse = {
      success: false,
      message,
      error_code: errorCode,
      debug_info: {
        timestamp: new Date().toISOString(),
        processing_steps: []
      },
      suggestions: []
    };
  }

  setUser(userId: string): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.user_id = userId;
    }
    return this;
  }

  setOperation(operation: string): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.operation = operation;
    }
    return this;
  }

  setRequestId(requestId: string): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.request_id = requestId;
    }
    return this;
  }

  addProcessingStep(
    step: string,
    status: 'completed' | 'failed' | 'skipped',
    details?: any,
    error?: string
  ): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.processing_steps?.push({
        step,
        status,
        details,
        error
      });
    }
    return this;
  }

  setDataAnalysis(analysis: {
    total_rows?: number;
    processed_rows?: number;
    failed_rows?: number;
    headers?: string[];
    sample_data?: any;
    validation_errors?: string[];
  }): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.data_analysis = analysis;
    }
    return this;
  }

  addSuggestion(suggestion: string): this {
    this.errorResponse.suggestions?.push(suggestion);
    return this;
  }

  addSuggestions(suggestions: string[]): this {
    suggestions.forEach(suggestion => this.addSuggestion(suggestion));
    return this;
  }

  setDetails(details: any): this {
    this.errorResponse.details = details;
    return this;
  }

  build(): DetailedErrorResponse {
    // 開発環境でない場合はdebug_infoを削除
    if (process.env.NODE_ENV !== 'development') {
      delete this.errorResponse.debug_info;
    }

    return this.errorResponse;
  }
}

// CSV処理専用のエラーレスポンスビルダー
export class CSVErrorBuilder extends ErrorDetailBuilder {
  constructor(message: string) {
    super(message, 'CSV_PROCESSING_ERROR');
  }

  static fieldMappingError(
    missingFields: string[],
    availableHeaders: string[],
    dataSource: string
  ): DetailedErrorResponse {
    const builder = new CSVErrorBuilder(`必須フィールドが見つかりません: ${missingFields.join(', ')}`);
    
    builder
      .setOperation('CSV_FIELD_MAPPING')
      .addProcessingStep('Parse CSV Headers', 'completed', { headers: availableHeaders })
      .addProcessingStep('Map Required Fields', 'failed', { 
        missing_fields: missingFields,
        data_source: dataSource 
      })
      .setDataAnalysis({
        headers: availableHeaders,
        validation_errors: [`必須フィールドが不足: ${missingFields.join(', ')}`]
      });

    // 修正提案の生成
    const suggestions: string[] = [];
    
    if (dataSource === 'colormi') {
      suggestions.push('カラーミーのCSVファイルは「売上明細」形式を使用してください');
      suggestions.push('必要なヘッダー: 売上ID, 購入者 名前, 購入商品 販売価格(消費税込)');
    } else if (dataSource === 'tabechoku') {
      suggestions.push('たべちょくのCSVファイルは「注文明細」形式を使用してください');
      suggestions.push('必要なヘッダー: 注文番号, 顧客名, 金額');
    }

    // フィールド名の類似候補を提案
    missingFields.forEach(field => {
      const similar = findSimilarHeaders(field, availableHeaders);
      if (similar.length > 0) {
        suggestions.push(`"${field}"の代わりに "${similar[0]}" を使用できる可能性があります`);
      }
    });

    builder.addSuggestions(suggestions);
    
    return builder.build();
  }

  static validationError(
    validationErrors: string[],
    totalRows: number,
    processedRows: number
  ): DetailedErrorResponse {
    const builder = new CSVErrorBuilder('データの検証に失敗しました');
    
    builder
      .setOperation('CSV_DATA_VALIDATION')
      .addProcessingStep('Parse CSV', 'completed', { total_rows: totalRows })
      .addProcessingStep('Validate Data', 'failed', { 
        validation_errors: validationErrors.length,
        processed_rows: processedRows
      })
      .setDataAnalysis({
        total_rows: totalRows,
        processed_rows: processedRows,
        failed_rows: totalRows - processedRows,
        validation_errors: validationErrors.slice(0, 10) // 最初の10個のエラーのみ表示
      });

    // エラーパターンの分析と提案
    const errorTypes = analyzeValidationErrors(validationErrors);
    const suggestions = generateValidationSuggestions(errorTypes);
    builder.addSuggestions(suggestions);

    return builder.build();
  }
}

// ヘルパー関数
function findSimilarHeaders(target: string, headers: string[]): string[] {
  const keywordMap: Record<string, string[]> = {
    order_code: ['売上', 'ID', '注文', '番号'],
    customer_name: ['購入者', '名前', '顧客'],
    price: ['価格', '金額', '料金', '単価', '販売']
  };

  const targetKeywords = keywordMap[target] || [target];
  
  return headers
    .filter(header => 
      targetKeywords.some(keyword => 
        header.toLowerCase().includes(keyword.toLowerCase())
      )
    )
    .slice(0, 3);
}

function analyzeValidationErrors(errors: string[]): Record<string, number> {
  const errorTypes: Record<string, number> = {};
  
  errors.forEach(error => {
    if (error.includes('必須')) {
      const field = error.match(/([^は]+)が必須/)?.[1];
      if (field) {
        errorTypes[`missing_${field}`] = (errorTypes[`missing_${field}`] || 0) + 1;
      }
    }
    
    if (error.includes('形式')) {
      errorTypes['format_error'] = (errorTypes['format_error'] || 0) + 1;
    }
  });
  
  return errorTypes;
}

function generateValidationSuggestions(errorTypes: Record<string, number>): string[] {
  const suggestions: string[] = [];
  
  if (errorTypes['missing_金額'] > 5) {
    suggestions.push('多くの行で金額が不足しています。価格情報を含むカラムが正しく選択されているか確認してください');
  }
  
  if (errorTypes['missing_注文番号'] > 3) {
    suggestions.push('注文番号が不足している行があります。売上IDまたは注文コードのカラムを確認してください');
  }
  
  if (errorTypes['format_error'] > 2) {
    suggestions.push('データ形式エラーが多発しています。CSVファイルの文字コードをUTF-8で保存し直してください');
  }
  
  return suggestions;
}