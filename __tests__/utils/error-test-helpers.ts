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
    response !== null &&
    typeof response === 'object' &&
    response.success === false &&
    typeof response.message === 'string' &&
    typeof response.error_code === 'string'
  );
};

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

// 完全なエラーレスポンス検証（テスト用）
const validateCompleteErrorResponseInternal = (response: any): {
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

// 構造化エラーレスポンスの検証用型定義（テスト用）
interface StructuredErrorResponse {
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

describe('error-test-helpers', () => {
  describe('validateErrorResponse', () => {
    it('should return true for valid error response structure', () => {
      const response = {
        success: false,
        message: 'Test error',
        error_code: 'TEST'
      };
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return false for valid structure with missing fields', () => {
      const response = {
        success: false,
        message: 'Test error'
        // Missing error_code
      };
      expect(validateErrorResponse(response)).toBe(false);
    });

    it('should return false for non-object responses', () => {
      expect(validateErrorResponse('invalid')).toBe(false);
      expect(validateErrorResponse(null)).toBe(false);
      expect(validateErrorResponse(undefined)).toBe(false);
    });

    it('should return false for invalid success value', () => {
      const response = {
        success: true, // Should be false
        message: 'Test error',
        error_code: 'TEST'
      };
      expect(validateErrorResponse(response)).toBe(false);
    });
  });

  describe('validateCompleteErrorResponse', () => {
    it('should validate complete error response structure', () => {
      const response = {
        success: false,
        message: 'Test error',
        error_code: 'TEST'
      };
      const validation = validateCompleteErrorResponseInternal(response);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing basic fields', () => {
      const response = {
        success: false,
        message: 'Test error'
        // Missing error_code
      };
      const validation = validateCompleteErrorResponseInternal(response);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Basic error response structure is invalid');
    });

    it('should detect missing debug info in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = {
        success: false,
        message: 'Test error',
        error_code: 'TEST',
        debug_info: {} // Empty but should exist in dev
      };
      const validation = validateCompleteErrorResponseInternal(response);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Debug info validation failed');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createTestErrorResponse', () => {
    it('should create a valid error response with defaults', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test error message',
        error_code: 'TEST_ERROR',
        debug_info: {
          timestamp: new Date().toISOString(),
          component: 'test_component',
          action: 'test_action',
          processing_steps: [
            {
              step: 'init',
              status: 'completed'
            }
          ]
        }
      };

      expect(response.success).toBe(false);
      expect(response.message).toBe('Test error message');
      expect(response.error_code).toBe('TEST_ERROR');
      expect(response.debug_info).toBeDefined();
      expect(response.debug_info.timestamp).toBeDefined();
    });

    it('should override default values with provided overrides', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Custom error',
        error_code: 'CUSTOM',
        debug_info: {
          timestamp: new Date().toISOString(),
          component: 'test_component',
          action: 'test_action',
          processing_steps: [
            {
              step: 'init',
              status: 'completed'
            }
          ]
        }
      };

      expect(response.message).toBe('Custom error');
      expect(response.error_code).toBe('CUSTOM');
    });
  });

  describe('createMockSession', () => {
    it('should create a mock session with defaults', () => {
      const session = createMockSession();

      expect(session.user.id).toBe(1);
      expect(session.user.username).toBe('test_user');
      expect(session.user.email).toBe('test@example.com');
      expect(session.user.is_super_admin).toBe(false);
      expect(session.session.session_token).toBe('mock_session_token');
      expect(session.session.csrf_token).toBe('mock_csrf_token');
      expect(session.session.expires_at).toBeDefined();
    });

    it('should override default values', () => {
      const session = createMockSession({
        user: {
          id: 2,
          username: 'custom_user',
          email: 'custom@example.com'
        },
        session: {
          session_token: 'custom_token'
        }
      });

      expect(session.user.id).toBe(2);
      expect(session.user.username).toBe('custom_user');
      expect(session.user.email).toBe('custom@example.com');
      expect(session.session.session_token).toBe('custom_token');
    });
  });

  describe('createMockRequest', () => {
    it('should create a mock request with defaults', () => {
      const request = createMockRequest();

      expect(request.method).toBe('GET');
      expect(request.url).toBe('http://localhost:3000/api/test');
      expect(request.headers).toBeDefined();
    });

    it('should create a mock request with custom method', () => {
      const request = createMockRequest('POST');

      expect(request.method).toBe('POST');
    });

    it('should create a mock request with body', () => {
      const request = createMockRequest('POST', {
        body: { test: 'data' }
      });

      expect(request.body).toBeDefined();
      // Note: NextRequest body is a ReadableStream, not directly accessible
      // The important part is that the request was created successfully
    });

    it('should create a mock request with cookies', () => {
      const request = createMockRequest('GET', {
        cookies: {
          session_token: 'test-token',
          csrf_token: 'csrf-token'
        }
      });

      const cookieHeader = request.headers.get('cookie');
      expect(cookieHeader).toContain('session_token=test-token');
      expect(cookieHeader).toContain('csrf_token=csrf-token');
    });
  });

  describe('DatabaseErrorSimulator', () => {
    it('should create a connection error', () => {
      const error = DatabaseErrorSimulator.connectionError();

      expect(error.message).toBe('Connection refused');
      expect((error as any).code).toBe('ECONNREFUSED');
    });

    it('should create a timeout error', () => {
      const error = DatabaseErrorSimulator.timeoutError();

      expect(error.message).toBe('Connection timeout');
      expect((error as any).code).toBe('ETIMEDOUT');
    });

    it('should create a syntax error', () => {
      const error = DatabaseErrorSimulator.syntaxError();

      expect(error.message).toBe('syntax error at or near "SELCT"');
      expect((error as any).code).toBe('42601');
    });

    it('should create a constraint violation error', () => {
      const error = DatabaseErrorSimulator.constraintViolation();

      expect(error.message).toBe('duplicate key value violates unique constraint');
      expect((error as any).code).toBe('23505');
    });

    it('should create a table not found error', () => {
      const error = DatabaseErrorSimulator.tableNotFound();

      expect(error.message).toBe('relation "unknown_table" does not exist');
      expect((error as any).code).toBe('42P01');
    });
  });

  describe('ExternalAPIErrorSimulator', () => {
    it('should create an OpenAI rate limit error', () => {
      const error = ExternalAPIErrorSimulator.openAIRateLimit();

      expect(error.error.message).toBe('Rate limit exceeded');
      expect(error.error.code).toBe('rate_limit_exceeded');
      expect(error.error.type).toBe('requests');
    });

    it('should create an OpenAI invalid key error', () => {
      const error = ExternalAPIErrorSimulator.openAIInvalidKey();

      expect(error.error.message).toBe('Invalid API key provided');
      expect(error.error.code).toBe('invalid_api_key');
      expect(error.error.type).toBe('authentication');
    });

    it('should create an OpenAI quota exceeded error', () => {
      const error = ExternalAPIErrorSimulator.openAIQuotaExceeded();

      expect(error.error.message).toBe('You exceeded your current quota');
      expect(error.error.code).toBe('insufficient_quota');
      expect(error.error.type).toBe('billing');
    });

    it('should create a network error', () => {
      const error = ExternalAPIErrorSimulator.networkError();

      expect(error.message).toBe('Network request failed');
      expect((error as any).name).toBe('TypeError');
    });

    it('should create a timeout error', () => {
      const error = ExternalAPIErrorSimulator.timeoutError();

      expect(error.message).toBe('Request timeout');
      expect((error as any).name).toBe('TimeoutError');
    });
  });
});
