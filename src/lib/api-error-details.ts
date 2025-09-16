// API共通のエラー詳細分析システム
import { ErrorDetailBuilder, DetailedErrorResponse } from './error-details';
import { debugLogger } from './debug-logger';

interface DatabaseErrorContext {
  query?: string;
  table?: string;
  operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  userId?: string;
  transactionId?: string;
}

interface ExternalAPIErrorContext {
  apiName?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
}

export class DatabaseErrorBuilder extends ErrorDetailBuilder {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR');
  }

  setDatabaseContext(context: DatabaseErrorContext): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.operation = `DB_${context.operation}`;
      this.errorResponse.debug_info.user_id = context.userId;
    }
    return this.setDetails({
      table: context.table,
      query_type: context.operation,
      transaction_id: context.transactionId
    });
  }

  // データベース接続エラー
  static connectionError(
    errorDetails: any,
    context: DatabaseErrorContext
  ): DetailedErrorResponse {
    const builder = new DatabaseErrorBuilder('データベース接続に失敗しました');

    builder
      .setDatabaseContext(context)
      .addProcessingStep('Database Connection', 'failed', { error: errorDetails.message })
      .addProcessingStep('Connection Pool Check', 'skipped')
      .addProcessingStep('Query Execution', 'skipped');

    // 接続エラーの原因分析
    const suggestions = DatabaseErrorBuilder.analyzeConnectionError(errorDetails);
    builder.addSuggestions(suggestions);

    return builder.build();
  }

  // クエリ実行エラー
  static queryError(
    query: string,
    errorDetails: any,
    context: DatabaseErrorContext
  ): DetailedErrorResponse {
    const builder = new DatabaseErrorBuilder('データベースクエリの実行に失敗しました');

    builder
      .setDatabaseContext({ ...context, query })
      .addProcessingStep('Database Connection', 'completed')
      .addProcessingStep('Query Validation', 'completed')
      .addProcessingStep('Query Execution', 'failed', {
        error: errorDetails.message,
        query_preview: query.substring(0, 100) + '...'
      });

    // SQLエラーの分析
    const suggestions = DatabaseErrorBuilder.analyzeSQLError(errorDetails, query);
    builder.addSuggestions(suggestions);

    return builder.build();
  }

  // トランザクションエラー
  static transactionError(
    errorDetails: any,
    context: DatabaseErrorContext
  ): DetailedErrorResponse {
    const builder = new DatabaseErrorBuilder('データベーストランザクションに失敗しました');

    builder
      .setDatabaseContext(context)
      .addProcessingStep('Transaction Begin', 'completed')
      .addProcessingStep('Query Execution', 'failed', { error: errorDetails.message })
      .addProcessingStep('Transaction Rollback', 'completed');

    const suggestions = [
      'トランザクションが自動的にロールバックされました',
      'データの整合性は保たれています',
      '一時的なエラーの可能性があります。再試行してください'
    ];
    builder.addSuggestions(suggestions);

    return builder.build();
  }

  private static analyzeConnectionError(errorDetails: any): string[] {
    const suggestions: string[] = [];
    const errorMessage = errorDetails.message?.toLowerCase() || '';

    if (errorMessage.includes('connection refused')) {
      suggestions.push('データベースサーバーが起動していません');
      suggestions.push('ネットワーク接続を確認してください');
    } else if (errorMessage.includes('timeout')) {
      suggestions.push('データベース接続がタイムアウトしました');
      suggestions.push('サーバーの負荷が高い可能性があります');
    } else if (errorMessage.includes('authentication failed')) {
      suggestions.push('データベース認証に失敗しました');
      suggestions.push('接続情報を確認してください');
    } else if (errorMessage.includes('too many connections')) {
      suggestions.push('データベース接続数が上限に達しています');
      suggestions.push('接続プールの設定を確認してください');
    }

    return suggestions;
  }

  private static analyzeSQLError(errorDetails: any, query: string): string[] {
    const suggestions: string[] = [];
    const errorMessage = errorDetails.message?.toLowerCase() || '';

    if (errorMessage.includes('syntax error')) {
      suggestions.push('SQLクエリの構文エラーです');
      suggestions.push('クエリの書式を確認してください');
    } else if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      suggestions.push('指定されたカラムが存在しません');
      suggestions.push('データベーススキーマを確認してください');
    } else if (errorMessage.includes('table') && errorMessage.includes('does not exist')) {
      suggestions.push('指定されたテーブルが存在しません');
      suggestions.push('データベースマイグレーションが必要かもしれません');
    } else if (errorMessage.includes('constraint violation')) {
      suggestions.push('データベース制約違反です');
      suggestions.push('入力データの整合性を確認してください');
    } else if (errorMessage.includes('duplicate key')) {
      suggestions.push('重複するキーが検出されました');
      suggestions.push('ユニーク制約に違反しています');
    }

    return suggestions;
  }
}

export class ExternalAPIErrorBuilder extends ErrorDetailBuilder {
  constructor(message: string) {
    super(message, 'EXTERNAL_API_ERROR');
  }

  setAPIContext(context: ExternalAPIErrorContext): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.operation = `API_${context.method}`;
    }
    return this.setDetails({
      api_name: context.apiName,
      endpoint: context.endpoint,
      method: context.method,
      status_code: context.statusCode,
      response_time: context.responseTime
    });
  }

  // OpenAI APIエラー
  static openAIError(
    errorDetails: any,
    context: ExternalAPIErrorContext
  ): DetailedErrorResponse {
    const builder = new ExternalAPIErrorBuilder('OpenAI APIの呼び出しに失敗しました');

    builder
      .setAPIContext({ ...context, apiName: 'OpenAI' })
      .addProcessingStep('API Request', 'completed')
      .addProcessingStep('OpenAI Processing', 'failed', {
        error: errorDetails.message,
        error_code: errorDetails.code
      })
      .addProcessingStep('Response Processing', 'skipped');

    // OpenAIエラーの分析
    const suggestions = ExternalAPIErrorBuilder.analyzeOpenAIError(errorDetails);
    builder.addSuggestions(suggestions);

    return builder.build();
  }

  // 配送APIエラー（Yamato等）
  static shippingAPIError(
    errorDetails: any,
    context: ExternalAPIErrorContext
  ): DetailedErrorResponse {
    const builder = new ExternalAPIErrorBuilder('配送APIの呼び出しに失敗しました');

    builder
      .setAPIContext({ ...context, apiName: 'Yamato Transport' })
      .addProcessingStep('API Authentication', 'completed')
      .addProcessingStep('Request Validation', 'completed')
      .addProcessingStep('Shipping API Call', 'failed', { error: errorDetails.message });

    const suggestions = ExternalAPIErrorBuilder.analyzeShippingError(errorDetails);
    builder.addSuggestions(suggestions);

    return builder.build();
  }

  private static analyzeOpenAIError(errorDetails: any): string[] {
    const suggestions: string[] = [];
    const errorCode = errorDetails.code;
    const errorMessage = errorDetails.message?.toLowerCase() || '';

    if (errorCode === 'insufficient_quota') {
      suggestions.push('OpenAI APIの利用量が上限に達しています');
      suggestions.push('API利用プランの確認またはアップグレードが必要です');
    } else if (errorCode === 'invalid_api_key') {
      suggestions.push('OpenAI APIキーが無効です');
      suggestions.push('環境変数OPENAI_API_KEYを確認してください');
    } else if (errorCode === 'rate_limit_exceeded') {
      suggestions.push('OpenAI APIのレート制限に達しました');
      suggestions.push('少し時間をおいてから再試行してください');
    } else if (errorMessage.includes('timeout')) {
      suggestions.push('OpenAI APIの応答がタイムアウトしました');
      suggestions.push('サーバーの負荷が高い可能性があります');
    } else if (errorMessage.includes('context_length_exceeded')) {
      suggestions.push('入力メッセージが長すぎます');
      suggestions.push('メッセージを短くして再試行してください');
    }

    return suggestions;
  }

  private static analyzeShippingError(errorDetails: any): string[] {
    const suggestions: string[] = [];
    const errorMessage = errorDetails.message?.toLowerCase() || '';

    if (errorMessage.includes('authentication')) {
      suggestions.push('配送API認証に失敗しました');
      suggestions.push('APIキーとシークレットを確認してください');
    } else if (errorMessage.includes('address')) {
      suggestions.push('配送先住所に問題があります');
      suggestions.push('住所の形式を確認してください');
    } else if (errorMessage.includes('service unavailable')) {
      suggestions.push('配送APIサービスが利用できません');
      suggestions.push('サービス状況を確認してください');
    }

    return suggestions;
  }
}

// API共通ログ機能
export const logDatabaseOperation = (
  operation: string,
  table: string,
  success: boolean,
  details?: any,
  userId?: string
) => {
  const logData = {
    operation,
    table,
    success,
    user_id: userId,
    details,
    timestamp: new Date().toISOString()
  };

  if (success) {
    debugLogger.info(`DB ${operation} 成功`, logData);
  } else {
    debugLogger.error(`DB ${operation} 失敗`, logData);
  }
};

export const logExternalAPICall = (
  apiName: string,
  endpoint: string,
  method: string,
  success: boolean,
  responseTime?: number,
  statusCode?: number
) => {
  const logData = {
    api_name: apiName,
    endpoint,
    method,
    success,
    response_time: responseTime,
    status_code: statusCode,
    timestamp: new Date().toISOString()
  };

  if (success) {
    debugLogger.info(`External API ${apiName} 成功`, logData);
  } else {
    debugLogger.error(`External API ${apiName} 失敗`, logData);
  }
};