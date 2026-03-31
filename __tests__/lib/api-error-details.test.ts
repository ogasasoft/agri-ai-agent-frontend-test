import {
  DatabaseErrorBuilder,
  ExternalAPIErrorBuilder,
  logDatabaseOperation,
  logExternalAPICall,
} from '../../src/lib/api-error-details';
import { debugLogger } from '../../src/lib/debug-logger';

describe('api-error-details.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DatabaseErrorBuilder', () => {
    it('should create a DatabaseErrorBuilder with message and type', () => {
      const builder = new DatabaseErrorBuilder('Test message');
      expect((builder as any).errorResponse.message).toBe('Test message');
      expect((builder as any).errorResponse.error_code).toBe('DATABASE_ERROR');
    });

    it('should create a DatabaseErrorBuilder and have message property', () => {
      const builder = new DatabaseErrorBuilder('Test message');
      expect(builder.message).toBe('Test message');
      expect((builder as any).errorResponse.error_code).toBe('DATABASE_ERROR');
    });

    it('should create a DatabaseErrorBuilder with correct error code and message', () => {
      const builder = new DatabaseErrorBuilder('Test message');
      expect((builder as any).errorResponse.error_code).toBe('DATABASE_ERROR');
      expect((builder as any).errorResponse.message).toBe('Test message');
    });

    it('should set database context correctly', () => {
      const builder = new DatabaseErrorBuilder('Test message');
      const context = {
        table: 'users',
        operation: 'INSERT',
        userId: 'user123',
        transactionId: 'tx456',
      };
      const result = builder.setDatabaseContext(context as any);

      expect(result).toBe(builder);
      expect((builder as any).errorResponse.debug_info?.operation).toBe('DB_INSERT');
      expect((builder as any).errorResponse.debug_info?.user_id).toBe('user123');
      expect((builder as any).errorResponse.details?.table).toBe('users');
      expect((builder as any).errorResponse.details?.query_type).toBe('INSERT');
      expect((builder as any).errorResponse.details?.transaction_id).toBe('tx456');
    });

    it('should add processing steps', () => {
      const builder = new DatabaseErrorBuilder('Test message');
      builder
        .addProcessingStep('Step1', 'completed')
        .addProcessingStep('Step2', 'failed', { error: 'Something went wrong' });

      expect((builder as any).errorResponse.debug_info?.processing_steps).toBeDefined();
      expect(Array.isArray((builder as any).errorResponse.debug_info?.processing_steps)).toBe(true);
      expect((builder as any).errorResponse.debug_info?.processing_steps.length).toBe(2);
      expect((builder as any).errorResponse.debug_info?.processing_steps[0].step).toBe('Step1');
      expect((builder as any).errorResponse.debug_info?.processing_steps[0].status).toBe('completed');
      expect((builder as any).errorResponse.debug_info?.processing_steps[1].step).toBe('Step2');
      expect((builder as any).errorResponse.debug_info?.processing_steps[1].status).toBe('failed');
      expect((builder as any).errorResponse.debug_info?.processing_steps[1].details?.error).toBe('Something went wrong');
    });

    it('should add suggestions', () => {
      const builder = new DatabaseErrorBuilder('Test message');
      builder.addSuggestions([
        'Suggestion 1',
        'Suggestion 2',
      ]);

      expect((builder as any).errorResponse.suggestions).toHaveLength(2);
      expect((builder as any).errorResponse.suggestions[0]).toBe('Suggestion 1');
      expect((builder as any).errorResponse.suggestions[1]).toBe('Suggestion 2');
    });

    it('should build error response correctly', () => {
      const builder = new DatabaseErrorBuilder('Test message');
      builder
        .setDatabaseContext({ table: 'users' })
        .addProcessingStep('Step1', 'completed')
        .addSuggestions(['Suggestion 1']);

      const result = builder.build();
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('message', 'Test message');
      expect(result).toHaveProperty('error_code', 'DATABASE_ERROR');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('suggestions');
      expect(result.details?.table).toBe('users');
    });

    it('should analyze connection error correctly', () => {
      const errorDetails = { message: 'connection refused' };
      const suggestions = (DatabaseErrorBuilder as any).analyzeConnectionError(errorDetails);

      expect(suggestions).toContain('データベースサーバーが起動していません');
      expect(suggestions).toContain('ネットワーク接続を確認してください');
    });

    it('should analyze SQL error correctly', () => {
      const errorDetails = { message: 'syntax error at or near SELECT' };
      const query = 'SELECT * FROM users';
      const suggestions = (DatabaseErrorBuilder as any).analyzeSQLError(errorDetails, query);

      expect(suggestions).toContain('SQLクエリの構文エラーです');
      expect(suggestions).toContain('クエリの書式を確認してください');
    });
  });

  describe('ExternalAPIErrorBuilder', () => {
    it('should create an ExternalAPIErrorBuilder with message and type', () => {
      const builder = new ExternalAPIErrorBuilder('Test message');
      expect(builder.message).toBe('Test message');
      expect((builder as any).errorResponse.error_code).toBe('EXTERNAL_API_ERROR');
    });

    it('should have constructor that sets message property', () => {
      const builder = new ExternalAPIErrorBuilder('Test message');
      expect(builder.message).toBe('Test message');
    });

    it('should create an ExternalAPIErrorBuilder with correct error code and message', () => {
      const builder = new ExternalAPIErrorBuilder('Test message');
      expect((builder as any).errorResponse.error_code).toBe('EXTERNAL_API_ERROR');
      expect((builder as any).errorResponse.message).toBe('Test message');
    });

    it('should set API context correctly', () => {
      const builder = new ExternalAPIErrorBuilder('Test message');
      const context = {
        apiName: 'OpenAI',
        endpoint: '/v1/chat',
        method: 'POST',
        statusCode: 200,
        responseTime: 1000,
      };
      const result = builder.setAPIContext(context);

      expect(result).toBe(builder);
      expect((builder as any).errorResponse.debug_info?.operation).toBe('API_POST');
      expect((builder as any).errorResponse.details?.api_name).toBe('OpenAI');
      expect((builder as any).errorResponse.details?.endpoint).toBe('/v1/chat');
      expect((builder as any).errorResponse.details?.method).toBe('POST');
      expect((builder as any).errorResponse.details?.status_code).toBe(200);
      expect((builder as any).errorResponse.details?.response_time).toBe(1000);
    });

    it('should analyze OpenAI error correctly', () => {
      const errorDetails = {
        code: 'insufficient_quota',
        message: 'Your quota has been exceeded'
      };
      const suggestions = (ExternalAPIErrorBuilder as any).analyzeOpenAIError(errorDetails);

      expect(suggestions).toContain('OpenAI APIの利用量が上限に達しています');
      expect(suggestions).toContain('API利用プランの確認またはアップグレードが必要です');
    });

    it('should analyze shipping error correctly', () => {
      const errorDetails = { message: 'authentication failed' };
      const suggestions = (ExternalAPIErrorBuilder as any).analyzeShippingError(errorDetails);

      expect(suggestions).toContain('配送API認証に失敗しました');
      expect(suggestions).toContain('APIキーとシークレットを確認してください');
    });
  });

  describe('logDatabaseOperation', () => {
    it('should log successful database operation', () => {
      const debugLoggerSpy = jest.spyOn(debugLogger, 'info').mockImplementation();
      logDatabaseOperation('INSERT', 'users', true, { rows: 1 }, 'user123');

      expect(debugLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('DB INSERT 成功'),
        expect.objectContaining({
          operation: 'INSERT',
          table: 'users',
          success: true,
          user_id: 'user123',
        })
      );

      debugLoggerSpy.mockRestore();
    });

    it('should log failed database operation', () => {
      const debugLoggerSpy = jest.spyOn(debugLogger, 'error').mockImplementation();
      logDatabaseOperation('UPDATE', 'orders', false, { rows: 0 }, 'user456');

      expect(debugLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('DB UPDATE 失敗'),
        expect.objectContaining({
          operation: 'UPDATE',
          table: 'orders',
          success: false,
          user_id: 'user456',
        })
      );

      debugLoggerSpy.mockRestore();
    });
  });

  describe('logExternalAPICall', () => {
    it('should log successful API call', () => {
      const debugLoggerSpy = jest.spyOn(debugLogger, 'info').mockImplementation();
      logExternalAPICall('OpenAI', '/v1/chat', 'POST', true, 500, 200);

      expect(debugLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('External API OpenAI 成功'),
        expect.objectContaining({
          api_name: 'OpenAI',
          endpoint: '/v1/chat',
          method: 'POST',
          success: true,
          response_time: 500,
          status_code: 200,
        })
      );

      debugLoggerSpy.mockRestore();
    });

    it('should log failed API call', () => {
      const debugLoggerSpy = jest.spyOn(debugLogger, 'error').mockImplementation();
      logExternalAPICall('Yamato Transport', '/shipping', 'POST', false, undefined, 500);

      expect(debugLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('External API Yamato Transport 失敗'),
        expect.objectContaining({
          api_name: 'Yamato Transport',
          endpoint: '/shipping',
          method: 'POST',
          success: false,
          status_code: 500,
        })
      );

      debugLoggerSpy.mockRestore();
    });
  });

  describe('Static factory methods', () => {
    it('should create DatabaseErrorBuilder for connection error', () => {
      const errorDetails = { message: 'connection refused' };
      const context = { table: 'users' };
      const result = DatabaseErrorBuilder.connectionError(errorDetails, context);

      expect(result).toHaveProperty('error_code', 'DATABASE_ERROR');
      expect(result).toHaveProperty('message');
      expect(result.suggestions).toBeDefined();
    });

    it('should create DatabaseErrorBuilder for query error', () => {
      const query = 'SELECT * FROM users WHERE id = 1';
      const errorDetails = { message: 'syntax error' };
      const context = { table: 'users' };
      const result = DatabaseErrorBuilder.queryError(query, errorDetails, context);

      expect(result).toHaveProperty('error_code', 'DATABASE_ERROR');
      expect(result.debug_info?.processing_steps).toBeDefined();
      expect(Array.isArray(result.debug_info?.processing_steps)).toBe(true);
      expect(result.debug_info?.processing_steps?.length).toBeGreaterThanOrEqual(3);
    });

    it('should create DatabaseErrorBuilder for transaction error', () => {
      const errorDetails = { message: 'transaction failed' };
      const context = { table: 'orders' };
      const result = DatabaseErrorBuilder.transactionError(errorDetails, context);

      expect(result).toHaveProperty('error_code', 'DATABASE_ERROR');
      expect(result.debug_info?.processing_steps).toBeDefined();
      expect(Array.isArray(result.debug_info?.processing_steps)).toBe(true);
      // 4ステップ設定: Transaction Begin, Query Execution, Transaction Rollback, Data Integrity Check
      expect(result.debug_info?.processing_steps?.length).toBeGreaterThanOrEqual(4);
      expect(result.suggestions).toContain('トランザクションが自動的にロールバックされました');
    });

    it('should create ExternalAPIErrorBuilder for OpenAI error', () => {
      const errorDetails = { code: 'rate_limit_exceeded' };
      const context = { endpoint: '/v1/chat' };
      const result = ExternalAPIErrorBuilder.openAIError(errorDetails, context);

      expect(result).toHaveProperty('error_code', 'EXTERNAL_API_ERROR');
      expect(result.suggestions).toContain('OpenAI APIのレート制限に達しました');
    });

    it('should create ExternalAPIErrorBuilder for shipping error', () => {
      const errorDetails = { message: 'authentication failed' };
      const context = { endpoint: '/shipping' };
      const result = ExternalAPIErrorBuilder.shippingAPIError(errorDetails, context);

      expect(result).toHaveProperty('error_code', 'EXTERNAL_API_ERROR');
      expect(result.suggestions).toContain('配送API認証に失敗しました');
    });
  });
});
