// エラーハンドリングテスト用ヘルパー関数
import { NextRequest, NextResponse } from 'next/server';

// 構造化エラーレスポンスの検証用型定義
export interface StructuredErrorResponse {
  success: false;
  message: string;
  error_code: string;
  details?: any;
  debug_info?: {
    timestamp: string;
    component?: string;
    action?: string;
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

// エラーレスポンスの構造検証
export const validateErrorResponse = (response: any): response is StructuredErrorResponse => {
  return (
    typeof response === 'object' &&
    response.success === false &&
    typeof response.message === 'string' &&
    typeof response.error_code === 'string'
  );
};

// デバッグ情報の存在確認（開発環境のみ）
export const validateDebugInfo = (response: StructuredErrorResponse): boolean => {
  if (process.env.NODE_ENV !== 'development') {
    return !response.debug_info; // 本番環境ではdebug_infoが存在しないことを確認
  }

  return !!(
    response.debug_info &&
    response.debug_info.timestamp &&
    Array.isArray(response.debug_info.processing_steps)
  );
};

// 提案の妥当性確認
export const validateSuggestions = (response: StructuredErrorResponse): boolean => {
  if (!response.suggestions) return true; // 提案は必須ではない

  return (
    Array.isArray(response.suggestions) &&
    response.suggestions.every(suggestion => typeof suggestion === 'string' && suggestion.length > 0)
  );
};

// ユーザーアクションの妥当性確認
export const validateUserActions = (response: StructuredErrorResponse): boolean => {
  if (!response.user_actions) return true; // ユーザーアクションは必須ではない

  return (
    Array.isArray(response.user_actions) &&
    response.user_actions.every(action =>
      typeof action.label === 'string' &&
      ['retry', 'refresh', 'navigate', 'contact_support'].includes(action.action)
    )
  );
};

// 完全なエラーレスポンス検証
export const validateCompleteErrorResponse = (response: any): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!validateErrorResponse(response)) {
    errors.push('Basic error response structure is invalid');
    return { isValid: false, errors };
  }

  if (!validateDebugInfo(response)) {
    errors.push('Debug info validation failed');
  }

  if (!validateSuggestions(response)) {
    errors.push('Suggestions validation failed');
  }

  if (!validateUserActions(response)) {
    errors.push('User actions validation failed');
  }

  return { isValid: errors.length === 0, errors };
};

// モックセッションデータ生成
export const createMockSession = (overrides: Partial<any> = {}) => ({
  user: {
    id: 1,
    username: 'test_user',
    email: 'test@example.com',
    is_super_admin: false,
    ...overrides.user
  },
  session: {
    session_token: 'mock_session_token',
    csrf_token: 'mock_csrf_token',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides.session
  }
});

// モックリクエスト生成
export const createMockRequest = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  options: {
    body?: any;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest => {
  const url = 'http://localhost:3000/api/test';
  const headers = new Headers(options.headers || {});

  // Cookieヘッダーの設定
  if (options.cookies) {
    const cookieString = Object.entries(options.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    headers.set('cookie', cookieString);
  }

  const requestInit: RequestInit = {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  return new NextRequest(url, requestInit);
};

// データベースエラーシミュレーター
export class DatabaseErrorSimulator {
  static connectionError() {
    const error = new Error('Connection refused');
    (error as any).code = 'ECONNREFUSED';
    return error;
  }

  static timeoutError() {
    const error = new Error('Connection timeout');
    (error as any).code = 'ETIMEDOUT';
    return error;
  }

  static syntaxError() {
    const error = new Error('syntax error at or near "SELCT"');
    (error as any).code = '42601';
    return error;
  }

  static constraintViolation() {
    const error = new Error('duplicate key value violates unique constraint');
    (error as any).code = '23505';
    return error;
  }

  static tableNotFound() {
    const error = new Error('relation "unknown_table" does not exist');
    (error as any).code = '42P01';
    return error;
  }
}

// 外部APIエラーシミュレーター
export class ExternalAPIErrorSimulator {
  static openAIRateLimit() {
    return {
      error: {
        message: 'Rate limit exceeded',
        code: 'rate_limit_exceeded',
        type: 'requests'
      }
    };
  }

  static openAIInvalidKey() {
    return {
      error: {
        message: 'Invalid API key provided',
        code: 'invalid_api_key',
        type: 'authentication'
      }
    };
  }

  static openAIQuotaExceeded() {
    return {
      error: {
        message: 'You exceeded your current quota',
        code: 'insufficient_quota',
        type: 'billing'
      }
    };
  }

  static networkError() {
    const error = new Error('Network request failed');
    (error as any).name = 'TypeError';
    return error;
  }

  static timeoutError() {
    const error = new Error('Request timeout');
    (error as any).name = 'TimeoutError';
    return error;
  }
}

// テスト用アサーション関数
export const expectStructuredError = (response: any, expectedErrorCode: string) => {
  expect(response).toMatchObject({
    success: false,
    message: expect.any(String),
    error_code: expectedErrorCode
  });

  const validation = validateCompleteErrorResponse(response);
  if (!validation.isValid) {
    throw new Error(`Invalid error response: ${validation.errors.join(', ')}`);
  }
};

// ログ記録のモック検証
export const expectLogCalls = (logSpy: jest.SpyInstance, expectedCalls: Array<{
  operation: string;
  success: boolean;
  details?: any;
}>) => {
  expect(logSpy).toHaveBeenCalledTimes(expectedCalls.length);

  expectedCalls.forEach((expectedCall, index) => {
    const actualCall = logSpy.mock.calls[index];
    expect(actualCall[0]).toContain(expectedCall.operation);

    if (expectedCall.details) {
      expect(actualCall[1]).toMatchObject(expectedCall.details);
    }
  });
};

// パフォーマンス測定
export const measureErrorHandlingPerformance = async (
  errorFunction: () => Promise<any>
): Promise<{ duration: number; response: any }> => {
  const start = performance.now();
  const response = await errorFunction();
  const end = performance.now();

  return {
    duration: end - start,
    response
  };
};

// エラーハンドリングのe2eテスト用ヘルパー
export const simulateUserErrorScenario = async (
  scenario: 'network_failure' | 'authentication_expired' | 'form_validation_error' | 'database_error',
  testFunction: () => Promise<any>
): Promise<StructuredErrorResponse> => {
  // ネットワーク環境やモック設定を操作
  switch (scenario) {
    case 'network_failure':
      // ネットワーク接続をシミュレート
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      break;

    case 'authentication_expired':
      // セッション期限切れをシミュレート
      document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      break;

    // 他のシナリオも追加可能
  }

  try {
    return await testFunction();
  } finally {
    // テスト後のクリーンアップ
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  }
};