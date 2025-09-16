// フロントエンド専用のエラー詳細分析システム
import { debugLogger } from './debug-logger';

interface ClientErrorContext {
  userId?: string;
  currentPage?: string;
  userAction?: string;
  formData?: Record<string, any>;
  componentName?: string;
  browserInfo?: {
    userAgent: string;
    viewport: string;
    url: string;
  };
}

interface ClientErrorResponse {
  success: false;
  message: string;
  error_code: string;
  details?: any;
  debug_info?: {
    timestamp: string;
    component?: string;
    action?: string;
    page?: string;
    browser?: string;
    processing_steps?: Array<{
      step: string;
      status: 'completed' | 'failed' | 'skipped';
      details?: any;
      error?: string;
    }>;
  };
  suggestions?: string[];
  user_actions?: Array<{
    label: string;
    action: 'retry' | 'refresh' | 'navigate' | 'contact_support';
    params?: any;
  }>;
}

export class ClientErrorBuilder {
  private errorResponse: ClientErrorResponse;

  constructor(message: string, errorCode: string) {
    this.errorResponse = {
      success: false,
      message,
      error_code: errorCode,
      debug_info: {
        timestamp: new Date().toISOString(),
        processing_steps: []
      },
      suggestions: [],
      user_actions: []
    };
  }

  setContext(context: ClientErrorContext): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.component = context.componentName;
      this.errorResponse.debug_info.action = context.userAction;
      this.errorResponse.debug_info.page = context.currentPage;
      this.errorResponse.debug_info.browser = context.browserInfo?.userAgent;
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

  addSuggestion(suggestion: string): this {
    this.errorResponse.suggestions?.push(suggestion);
    return this;
  }

  addUserAction(
    label: string,
    action: 'retry' | 'refresh' | 'navigate' | 'contact_support',
    params?: any
  ): this {
    this.errorResponse.user_actions?.push({ label, action, params });
    return this;
  }

  build(): ClientErrorResponse {
    return this.errorResponse;
  }
}

// フォームエラー専用ビルダー
export class FormErrorBuilder extends ClientErrorBuilder {
  constructor(message: string) {
    super(message, 'FORM_VALIDATION_ERROR');
  }

  static validationError(
    formName: string,
    errors: Record<string, string[]>,
    formData: Record<string, any>,
    context: ClientErrorContext
  ): ClientErrorResponse {
    const errorCount = Object.keys(errors).length;
    const builder = new FormErrorBuilder(`フォーム検証エラー: ${errorCount}個のフィールドに問題があります`);

    builder
      .setContext({ ...context, userAction: 'form_submit' })
      .addProcessingStep('Form Data Validation', 'failed', {
        errors,
        form_name: formName,
        field_count: Object.keys(formData).length,
        error_count: errorCount
      });

    // エラーの種類を分析して提案を生成
    const suggestions = FormErrorBuilder.analyzeFormErrors(errors, formName);
    suggestions.forEach(suggestion => builder.addSuggestion(suggestion));

    // ユーザーアクションを追加
    builder
      .addUserAction('入力内容を修正', 'retry')
      .addUserAction('フォームをクリア', 'refresh', { clear_form: true });

    return builder.build();
  }

  static submissionError(
    formName: string,
    apiResponse: any,
    formData: Record<string, any>,
    context: ClientErrorContext
  ): ClientErrorResponse {
    const builder = new FormErrorBuilder('フォーム送信に失敗しました');

    builder
      .setContext({ ...context, userAction: 'form_submit' })
      .addProcessingStep('Form Validation', 'completed')
      .addProcessingStep('API Request', 'failed', {
        status: apiResponse?.status,
        error: apiResponse?.message || apiResponse?.error,
        form_name: formName
      });

    // APIエラーレスポンスを分析
    const suggestions = FormErrorBuilder.analyzeAPIError(apiResponse, formName);
    suggestions.forEach(suggestion => builder.addSuggestion(suggestion));

    // ユーザーアクションを追加
    builder
      .addUserAction('再試行', 'retry')
      .addUserAction('ページを更新', 'refresh')
      .addUserAction('サポートに連絡', 'contact_support');

    return builder.build();
  }

  private static analyzeFormErrors(
    errors: Record<string, string[]>,
    formName: string
  ): string[] {
    const suggestions: string[] = [];
    const errorFields = Object.keys(errors);

    if (errorFields.includes('email')) {
      suggestions.push('メールアドレスの形式を確認してください（例：user@example.com）');
    }

    if (errorFields.includes('password')) {
      suggestions.push('パスワードは8文字以上で、英数字を含めてください');
    }

    if (errorFields.includes('phone')) {
      suggestions.push('電話番号はハイフンを含めて入力してください（例：090-1234-5678）');
    }

    if (errorFields.includes('price') || errorFields.includes('amount')) {
      suggestions.push('金額は半角数字で入力してください');
    }

    if (errorFields.length > 3) {
      suggestions.push('複数のフィールドにエラーがあります。上から順に修正してください');
    }

    return suggestions;
  }

  private static analyzeAPIError(apiResponse: any, formName: string): string[] {
    const suggestions: string[] = [];
    const status = apiResponse?.status;
    const message = apiResponse?.message?.toLowerCase() || '';

    if (status === 401) {
      suggestions.push('ログインセッションが期限切れです。再度ログインしてください');
    } else if (status === 403) {
      suggestions.push('CSRF エラーが発生しました。ページを更新してください');
    } else if (status === 409) {
      suggestions.push('重複するデータが存在します。別の値を入力してください');
    } else if (status === 429) {
      suggestions.push('送信回数が制限に達しました。しばらく時間をおいてください');
    } else if (status >= 500) {
      suggestions.push('サーバーエラーが発生しました。時間をおいて再試行してください');
    }

    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('ネットワーク接続を確認してください');
    }

    return suggestions;
  }
}

// データ取得エラー専用ビルダー
export class DataFetchErrorBuilder extends ClientErrorBuilder {
  constructor(message: string) {
    super(message, 'DATA_FETCH_ERROR');
  }

  static apiError(
    endpoint: string,
    error: any,
    context: ClientErrorContext
  ): ClientErrorResponse {
    const builder = new DataFetchErrorBuilder('データの取得に失敗しました');

    builder
      .setContext({ ...context, userAction: 'data_fetch' })
      .addProcessingStep('API Request', 'failed', {
        endpoint,
        error: error.message,
        status: error.status
      });

    // エラーの種類に応じて提案を生成
    const suggestions = DataFetchErrorBuilder.analyzeDataError(error, endpoint);
    suggestions.forEach(suggestion => builder.addSuggestion(suggestion));

    // ユーザーアクションを追加
    builder
      .addUserAction('再読み込み', 'retry')
      .addUserAction('ページを更新', 'refresh');

    return builder.build();
  }

  private static analyzeDataError(error: any, endpoint: string): string[] {
    const suggestions: string[] = [];
    const status = error.status;

    if (status === 401) {
      suggestions.push('ログインが必要です');
    } else if (status === 404) {
      suggestions.push('データが見つかりません。削除された可能性があります');
    } else if (status >= 500) {
      suggestions.push('サーバーに問題が発生しています。時間をおいて再試行してください');
    } else if (!navigator.onLine) {
      suggestions.push('インターネット接続を確認してください');
    }

    return suggestions;
  }
}

// クライアントエラーログ機能
export const logClientError = (
  errorType: 'FORM_ERROR' | 'API_ERROR' | 'COMPONENT_ERROR' | 'NAVIGATION_ERROR',
  error: any,
  context: ClientErrorContext
) => {
  const logData = {
    error_type: errorType,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    url: window.location.href,
    viewport: `${window.innerWidth}x${window.innerHeight}`
  };

  debugLogger.error(`Client Error: ${errorType}`, logData);
};

// ユーザーアクション実行関数
export const executeUserAction = (
  action: 'retry' | 'refresh' | 'navigate' | 'contact_support',
  params?: any,
  callback?: () => void
) => {
  switch (action) {
    case 'retry':
      if (callback) callback();
      break;

    case 'refresh':
      if (params?.clear_form) {
        // フォームクリア処理
        const forms = document.querySelectorAll('form');
        forms.forEach(form => form.reset());
      }
      window.location.reload();
      break;

    case 'navigate':
      if (params?.url) {
        window.location.href = params.url;
      }
      break;

    case 'contact_support':
      // サポート連絡機能（メール送信など）
      const subject = encodeURIComponent('技術サポート要請');
      const body = encodeURIComponent(`エラーが発生しました。\n\n詳細: ${JSON.stringify(params, null, 2)}`);
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
      break;
  }
};