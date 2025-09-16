// ErrorBuilderクラスのテスト
import { ErrorDetailBuilder, CSVErrorBuilder } from '@/lib/error-details';
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { DatabaseErrorBuilder, ExternalAPIErrorBuilder } from '@/lib/api-error-details';
import { validateCompleteErrorResponse, validateDebugInfo } from '../utils/error-test-helpers';

describe('ErrorBuilder Classes', () => {
  beforeEach(() => {
    // テスト環境を開発環境に設定
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // 環境変数をリセット
    delete process.env.NODE_ENV;
  });

  describe('ErrorDetailBuilder', () => {
    it('should create basic error response', () => {
      const builder = new ErrorDetailBuilder('Test error message', 'TEST_ERROR');
      const response = builder.build();

      expect(response).toMatchObject({
        success: false,
        message: 'Test error message',
        error_code: 'TEST_ERROR',
        suggestions: []
      });

      expect(response.debug_info).toHaveProperty('timestamp');
      expect(response.debug_info?.processing_steps).toEqual([]);
    });

    it('should add processing steps', () => {
      const builder = new ErrorDetailBuilder('Test error', 'TEST_ERROR');
      const response = builder
        .addProcessingStep('Step 1', 'completed')
        .addProcessingStep('Step 2', 'failed', { error: 'Step failed' })
        .build();

      expect(response.debug_info?.processing_steps).toHaveLength(2);
      expect(response.debug_info?.processing_steps[0]).toMatchObject({
        step: 'Step 1',
        status: 'completed'
      });
      expect(response.debug_info?.processing_steps[1]).toMatchObject({
        step: 'Step 2',
        status: 'failed',
        details: { error: 'Step failed' }
      });
    });

    it('should add suggestions', () => {
      const builder = new ErrorDetailBuilder('Test error', 'TEST_ERROR');
      const response = builder
        .addSuggestion('First suggestion')
        .addSuggestions(['Second suggestion', 'Third suggestion'])
        .build();

      expect(response.suggestions).toEqual([
        'First suggestion',
        'Second suggestion',
        'Third suggestion'
      ]);
    });

    it('should remove debug_info in production', () => {
      process.env.NODE_ENV = 'production';

      const builder = new ErrorDetailBuilder('Test error', 'TEST_ERROR');
      const response = builder
        .addProcessingStep('Step 1', 'completed')
        .build();

      expect(response.debug_info).toBeUndefined();
    });
  });

  describe('CSVErrorBuilder', () => {
    it('should create field mapping error', () => {
      const missingFields = ['order_code', 'customer_name'];
      const availableHeaders = ['売上ID', '顧客氏名', '金額'];
      const response = CSVErrorBuilder.fieldMappingError(
        missingFields,
        availableHeaders,
        'colormi'
      );

      expect(response.error_code).toBe('CSV_PROCESSING_ERROR');
      expect(response.message).toContain('必須フィールドが見つかりません');
      expect(response.debug_info?.data_analysis?.headers).toEqual(availableHeaders);
      expect(response.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('カラーミー')
        ])
      );
    });

    it('should create validation error', () => {
      const validationErrors = [
        'Row 1: 金額が必須です',
        'Row 2: 電話番号の形式が正しくありません'
      ];
      const response = CSVErrorBuilder.validationError(
        validationErrors,
        100,
        85
      );

      expect(response.error_code).toBe('CSV_PROCESSING_ERROR');
      expect(response.debug_info?.data_analysis).toMatchObject({
        total_rows: 100,
        processed_rows: 85,
        failed_rows: 15
      });
    });
  });

  describe('AuthErrorBuilder', () => {
    it('should create login failure error', () => {
      const context = {
        username: 'test_user',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        attemptCount: 3
      };

      const response = AuthErrorBuilder.loginFailure(
        'test_user',
        'INVALID_CREDENTIALS',
        context
      );

      expect(response.error_code).toBe('AUTHENTICATION_ERROR');
      expect(response.debug_info?.user_id).toBe('test_user');
      expect(response.details?.ip_address).toBe('192.168.1.1');

      const validation = validateCompleteErrorResponse(response);
      expect(validation.isValid).toBe(true);
    });

    it('should detect brute force patterns', () => {
      const context = {
        username: 'test_user',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        attemptCount: 6 // 高回数でブルートフォース検出
      };

      const response = AuthErrorBuilder.loginFailure(
        'test_user',
        'RATE_LIMITED',
        context
      );

      expect(response.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ブルートフォース')
        ])
      );
    });

    it('should create session error', () => {
      const response = AuthErrorBuilder.sessionError('CSRF_MISMATCH', {
        token: 'invalid_token',
        userId: '123'
      });

      expect(response.error_code).toBe('AUTHENTICATION_ERROR');
      expect(response.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('CSRF'),
          expect.stringContaining('ページを更新')
        ])
      );
    });
  });

  describe('DatabaseErrorBuilder', () => {
    it('should create connection error', () => {
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';

      const response = DatabaseErrorBuilder.connectionError(error, {
        table: 'users',
        operation: 'SELECT'
      });

      expect(response.error_code).toBe('DATABASE_ERROR');
      expect(response.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('データベースサーバーが起動していません')
        ])
      );
    });

    it('should create query error', () => {
      const error = new Error('relation "unknown_table" does not exist');
      const query = 'SELECT * FROM unknown_table';

      const response = DatabaseErrorBuilder.queryError(query, error, {
        table: 'unknown_table',
        operation: 'SELECT',
        userId: '123'
      });

      expect(response.error_code).toBe('DATABASE_ERROR');
      expect(response.debug_info?.operation).toBe('DB_SELECT');
      expect(response.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('テーブルが存在しません')
        ])
      );
    });
  });

  describe('ExternalAPIErrorBuilder', () => {
    it('should create OpenAI error', () => {
      const error = {
        message: 'Rate limit exceeded',
        code: 'rate_limit_exceeded'
      };

      const response = ExternalAPIErrorBuilder.openAIError(error, {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        statusCode: 429,
        responseTime: 1500
      });

      expect(response.error_code).toBe('EXTERNAL_API_ERROR');
      expect(response.details?.status_code).toBe(429);
      expect(response.details?.response_time).toBe(1500);
      expect(response.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('レート制限')
        ])
      );
    });

    it('should create shipping API error', () => {
      const error = {
        message: 'Invalid address format'
      };

      const response = ExternalAPIErrorBuilder.shippingAPIError(error, {
        apiName: 'Yamato Transport',
        endpoint: '/api/shipping/label',
        method: 'POST'
      });

      expect(response.error_code).toBe('EXTERNAL_API_ERROR');
      expect(response.details?.api_name).toBe('Yamato Transport');
      expect(response.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('住所')
        ])
      );
    });
  });

  describe('Error Response Validation', () => {
    it('should validate complete error response structure', () => {
      const builder = new ErrorDetailBuilder('Test error', 'TEST_ERROR');
      const response = builder
        .addProcessingStep('Step 1', 'completed')
        .addSuggestion('Test suggestion')
        .build();

      const validation = validateCompleteErrorResponse(response);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid error response', () => {
      const invalidResponse = {
        success: true, // should be false
        message: 123, // should be string
        error_code: null // should be string
      };

      const validation = validateCompleteErrorResponse(invalidResponse);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate debug info presence in development', () => {
      process.env.NODE_ENV = 'development';

      const builder = new ErrorDetailBuilder('Test error', 'TEST_ERROR');
      const response = builder.build();

      expect(validateDebugInfo(response)).toBe(true);
    });

    it('should validate debug info absence in production', () => {
      process.env.NODE_ENV = 'production';

      const builder = new ErrorDetailBuilder('Test error', 'TEST_ERROR');
      const response = builder.build();

      expect(validateDebugInfo(response)).toBe(true);
    });
  });
});