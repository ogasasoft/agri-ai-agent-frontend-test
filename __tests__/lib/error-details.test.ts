/**
 * Error details utility function tests
 */
import {
  ErrorDetailBuilder,
  CSVErrorBuilder,
  DetailedErrorResponse,
} from '@/lib/error-details';

describe('ErrorDetailBuilder', () => {
  let builder: ErrorDetailBuilder;

  beforeEach(() => {
    builder = new ErrorDetailBuilder('Test error message', 'TEST_ERROR');
  });

  it('should create a builder with message and error code', () => {
    const response = builder.build();
    expect(response.success).toBe(false);
    expect(response.message).toBe('Test error message');
    expect(response.error_code).toBe('TEST_ERROR');
  });

  it('should have debug_info with timestamp', () => {
    const response = builder.build();
    expect(response.debug_info).toBeDefined();
    expect(response.debug_info?.timestamp).toBeDefined();
    expect(typeof response.debug_info?.timestamp).toBe('string');
  });

  it('should set user id', () => {
    const response = builder.setUser('user123').build();
    expect(response.debug_info?.user_id).toBe('user123');
  });

  it('should set operation', () => {
    const response = builder.setOperation('TEST_OPERATION').build();
    expect(response.debug_info?.operation).toBe('TEST_OPERATION');
  });

  it('should set request id', () => {
    const response = builder.setRequestId('req456').build();
    expect(response.debug_info?.request_id).toBe('req456');
  });

  it('should add processing steps', () => {
    const response = builder
      .addProcessingStep('Step1', 'completed')
      .addProcessingStep('Step2', 'failed', { data: 'test' }, 'Error message')
      .addProcessingStep('Step3', 'skipped')
      .build();

    expect(response.debug_info?.processing_steps).toHaveLength(3);
    expect(response.debug_info?.processing_steps[0].step).toBe('Step1');
    expect(response.debug_info?.processing_steps[0].status).toBe('completed');
    expect(response.debug_info?.processing_steps[1].step).toBe('Step2');
    expect(response.debug_info?.processing_steps[1].status).toBe('failed');
    expect(response.debug_info?.processing_steps[1].details).toEqual({ data: 'test' });
    expect(response.debug_info?.processing_steps[1].error).toBe('Error message');
    expect(response.debug_info?.processing_steps[2].step).toBe('Step3');
    expect(response.debug_info?.processing_steps[2].status).toBe('skipped');
  });

  it('should add suggestions', () => {
    const response = builder.addSuggestion('Test suggestion').addSuggestion('Another suggestion').build();

    expect(response.suggestions).toHaveLength(2);
    expect(response.suggestions[0]).toBe('Test suggestion');
    expect(response.suggestions[1]).toBe('Another suggestion');
  });

  it('should add multiple suggestions at once', () => {
    const response = builder.addSuggestions(['Suggestion 1', 'Suggestion 2', 'Suggestion 3']).build();

    expect(response.suggestions).toHaveLength(3);
    expect(response.suggestions[0]).toBe('Suggestion 1');
    expect(response.suggestions[1]).toBe('Suggestion 2');
    expect(response.suggestions[2]).toBe('Suggestion 3');
  });

  it('should set details', () => {
    const response = builder.setDetails({ test: 'value', number: 123 }).build();

    expect(response.details).toEqual({ test: 'value', number: 123 });
  });

  it('should build correctly in production mode', () => {
    // Mock NODE_ENV to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = builder.build();

    expect(response.debug_info).toBeUndefined();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
});

describe('CSVErrorBuilder', () => {
  let builder: CSVErrorBuilder;

  beforeEach(() => {
    builder = new CSVErrorBuilder('CSV processing error');
  });

  describe('fieldMappingError', () => {
    it('should create a CSV error response for missing fields', () => {
      const response = CSVErrorBuilder.fieldMappingError(
        ['order_code', 'customer_name'],
        ['売上ID', '購入者名', '購入商品'],
        'colormi'
      );

      expect(response.success).toBe(false);
      expect(response.error_code).toBe('CSV_PROCESSING_ERROR');
      expect(response.message).toContain('必須フィールドが見つかりません');
      expect(response.debug_info?.operation).toBe('CSV_FIELD_MAPPING');
      expect(response.debug_info?.processing_steps).toBeDefined();
      expect(response.suggestions).toBeDefined();
    });

    it('should include processing steps', () => {
      const response = CSVErrorBuilder.fieldMappingError(
        ['order_code'],
        ['売上ID'],
        'colormi'
      );

      expect(response.debug_info?.processing_steps).toHaveLength(2);
      expect(response.debug_info?.processing_steps[0].step).toBe('Parse CSV Headers');
      expect(response.debug_info?.processing_steps[1].step).toBe('Map Required Fields');
    });

    it('should include data analysis with headers', () => {
      const response = CSVErrorBuilder.fieldMappingError(
        ['order_code'],
        ['売上ID'],
        'colormi'
      );

      expect(response.debug_info?.data_analysis).toBeDefined();
      expect(response.debug_info?.data_analysis?.headers).toEqual(['売上ID']);
      expect(response.debug_info?.data_analysis?.validation_errors?.[0]).toContain('必須フィールドが不足');
    });

    it('should provide suggestions for colormi data source', () => {
      const response = CSVErrorBuilder.fieldMappingError(
        ['price'],
        ['販売価格', '金額'],
        'colormi'
      );

      expect(response.suggestions).toContain('カラーミーのCSVファイルは「売上明細」形式を使用してください');
    });

    it('should provide suggestions for tabechoku data source', () => {
      const response = CSVErrorBuilder.fieldMappingError(
        ['order_code'],
        ['注文番号'],
        'tabechoku'
      );

      expect(response.suggestions).toContain('たべちょくのCSVファイルは「注文明細」形式を使用してください');
    });

    it('should suggest similar headers for missing fields', () => {
      const response = CSVErrorBuilder.fieldMappingError(
        ['price'],
        ['販売', '金額', '単価'],
        'colormi'
      );

      expect(response.suggestions).toContain('"price"の代わりに "販売" を使用できる可能性があります');
    });
  });

  describe('validationError', () => {
    it('should create a validation error response', () => {
      const response = CSVErrorBuilder.validationError(
        ['必須フィールドです'],
        10,
        8
      );

      expect(response.success).toBe(false);
      expect(response.error_code).toBe('CSV_PROCESSING_ERROR');
      expect(response.message).toContain('データの検証に失敗しました');
      expect(response.debug_info?.operation).toBe('CSV_DATA_VALIDATION');
    });

    it('should include processing steps with counts', () => {
      const response = CSVErrorBuilder.validationError(
        ['必須フィールドです'],
        2,
        2
      );

      expect(response.debug_info?.processing_steps).toHaveLength(2);
      expect(response.debug_info?.processing_steps[1].details).toEqual({
        validation_errors: 1,
        processed_rows: 2,
      });
    });

    it('should include data analysis with row counts', () => {
      const response = CSVErrorBuilder.validationError(
        ['必須フィールドです'],
        10,
        8
      );

      expect(response.debug_info?.data_analysis).toBeDefined();
      expect(response.debug_info?.data_analysis?.total_rows).toBe(10);
      expect(response.debug_info?.data_analysis?.processed_rows).toBe(8);
      expect(response.debug_info?.data_analysis?.failed_rows).toBe(2);
    });

    it('should limit validation errors to first 10', () => {
      const errors = Array.from({ length: 15 }, (_, i) => `エラー${i + 1}`);
      const response = CSVErrorBuilder.validationError(errors, 100, 80);

      expect(response.debug_info?.data_analysis?.validation_errors).toHaveLength(10);
    });

    it('should analyze error types and generate suggestions', () => {
      // Use 3 format errors to trigger the suggestion (threshold is > 2)
      const response = CSVErrorBuilder.validationError(
        ['形式が不正です', '形式が不正です', '形式が不正です'],
        10,
        7
      );

      expect(response.suggestions).toBeDefined();
      expect(response.suggestions.length).toBeGreaterThan(0);
    });
  });
});
