import {
  diagnoseEncodingError,
  diagnoseMissingFieldsError,
  diagnoseFileFormatError,
  diagnoseDataValidationError,
  diagnoseUnknownError,
  formatDiagnosticsForUser,
  CSVErrorDiagnostics,
} from '@/lib/csv-error-diagnostics';
import { EncodingDetectionResult, CSVHeaderAnalysis } from '@/lib/csv-encoding';

function makeEncodingResult(overrides: Partial<EncodingDetectionResult> = {}): EncodingDetectionResult {
  return {
    text: 'test data',
    detectedEncoding: 'utf-8',
    confidence: 0.8,
    isJapanese: true,
    hasGarbledText: false,
    encodingAttempts: [{ encoding: 'utf-8', success: true }],
    ...overrides,
  };
}

function makeHeaderAnalysis(overrides: Partial<CSVHeaderAnalysis> = {}): CSVHeaderAnalysis {
  return {
    headers: ['注文番号', '顧客名', '金額'],
    possibleEncodings: ['utf-8'],
    dataSource: 'tabechoku',
    hasRequiredFields: true,
    missingFields: [],
    suggestions: [],
    ...overrides,
  };
}

describe('csv-error-diagnostics.ts', () => {
  describe('diagnoseEncodingError', () => {
    it('should return low severity when encoding is successful', () => {
      const result = diagnoseEncodingError(
        makeEncodingResult({ confidence: 0.8, hasGarbledText: false }),
        makeHeaderAnalysis()
      );

      expect(result.severity).toBe('low');
      expect(result.errorType).toBe('encoding');
      expect(result.userSolutions).toHaveLength(0);
    });

    it('should return critical severity when garbled text is detected', () => {
      const result = diagnoseEncodingError(
        makeEncodingResult({ hasGarbledText: true, confidence: 0.8 }),
        makeHeaderAnalysis()
      );

      expect(result.severity).toBe('critical');
      expect(result.userSolutions.length).toBeGreaterThan(0);
    });

    it('should return high severity when confidence is low', () => {
      const result = diagnoseEncodingError(
        makeEncodingResult({ hasGarbledText: false, confidence: 0.2 }),
        makeHeaderAnalysis()
      );

      expect(result.severity).toBe('high');
    });

    it('should be lenient for colormi with shift_jis', () => {
      const result = diagnoseEncodingError(
        makeEncodingResult({
          text: '売上ID test data',
          detectedEncoding: 'shift_jis',
          confidence: 0.2,
          hasGarbledText: false,
        }),
        makeHeaderAnalysis()
      );

      expect(result.severity).toBe('low');
    });

    it('should include confidence in technical details', () => {
      const result = diagnoseEncodingError(
        makeEncodingResult({ confidence: 0.8, detectedEncoding: 'utf-8' }),
        makeHeaderAnalysis()
      );

      expect(result.technicalDetails).toContain('80%');
    });

    it('should include encoding name in technical details for error case', () => {
      const result = diagnoseEncodingError(
        makeEncodingResult({ hasGarbledText: true, detectedEncoding: 'utf-8', confidence: 0.8 }),
        makeHeaderAnalysis()
      );

      expect(result.technicalDetails).toContain('utf-8');
    });

    it('should include developer info', () => {
      const encodingResult = makeEncodingResult();
      const headerAnalysis = makeHeaderAnalysis();
      const result = diagnoseEncodingError(encodingResult, headerAnalysis);

      expect(result.developerInfo?.encoding).toBeDefined();
      expect(result.developerInfo?.headers).toBeDefined();
    });
  });

  describe('diagnoseMissingFieldsError', () => {
    it('should return critical severity', () => {
      const result = diagnoseMissingFieldsError(
        makeHeaderAnalysis({ dataSource: 'tabechoku' }),
        ['注文番号']
      );

      expect(result.severity).toBe('critical');
      expect(result.errorType).toBe('missing_fields');
    });

    it('should list missing fields in description', () => {
      const result = diagnoseMissingFieldsError(
        makeHeaderAnalysis({ dataSource: 'tabechoku' }),
        ['注文番号', '顧客名']
      );

      expect(result.description).toContain('注文番号');
      expect(result.description).toContain('顧客名');
    });

    it('should provide colormi-specific solutions', () => {
      const result = diagnoseMissingFieldsError(
        makeHeaderAnalysis({ dataSource: 'colormi' }),
        ['売上ID']
      );

      const solutionText = result.userSolutions.join(' ');
      expect(solutionText).toContain('カラーミー');
    });

    it('should provide tabechoku-specific solutions', () => {
      const result = diagnoseMissingFieldsError(
        makeHeaderAnalysis({ dataSource: 'tabechoku' }),
        ['注文番号']
      );

      const solutionText = result.userSolutions.join(' ');
      expect(solutionText).toContain('たべちょく');
    });

    it('should provide generic solutions for unknown source', () => {
      const result = diagnoseMissingFieldsError(
        makeHeaderAnalysis({ dataSource: 'unknown' }),
        ['ID']
      );

      expect(result.userSolutions.length).toBeGreaterThan(0);
    });

    it('should mention similar fields when suggestions exist', () => {
      const analysis = makeHeaderAnalysis({
        dataSource: 'tabechoku',
        suggestions: ['類似フィールドが見つかりました: "注文ID" (注文番号の代替候補)'],
      });

      const result = diagnoseMissingFieldsError(analysis, ['注文番号']);
      const solutionText = result.userSolutions.join(' ');
      expect(solutionText).toContain('類似');
    });

    it('should include detected headers in technical details', () => {
      const analysis = makeHeaderAnalysis({
        headers: ['列A', '列B', '列C', '列D', '列E', '列F'],
      });

      const result = diagnoseMissingFieldsError(analysis, ['注文番号']);
      expect(result.technicalDetails).toContain('列A');
    });
  });

  describe('diagnoseFileFormatError', () => {
    it('should return critical for non-CSV file', () => {
      const result = diagnoseFileFormatError('orders.xlsx', 1024);

      expect(result.severity).toBe('critical');
      expect(result.errorType).toBe('file_format');
      expect(result.userSolutions.length).toBeGreaterThan(0);
      expect(result.technicalDetails).toContain('orders.xlsx');
    });

    it('should return critical for empty file', () => {
      const result = diagnoseFileFormatError('orders.csv', 0);

      expect(result.severity).toBe('critical');
      expect(result.title).toContain('空');
    });

    it('should return high for oversized file', () => {
      const elevenMB = 11 * 1024 * 1024;
      const result = diagnoseFileFormatError('large.csv', elevenMB);

      expect(result.severity).toBe('high');
      expect(result.description).toContain('10MB');
    });

    it('should return low for valid CSV file', () => {
      const result = diagnoseFileFormatError('orders.csv', 5000);

      expect(result.severity).toBe('low');
      expect(result.userSolutions).toHaveLength(0);
    });

    it('should be case-insensitive for file extension check', () => {
      const result = diagnoseFileFormatError('orders.CSV', 5000);
      expect(result.severity).toBe('low');
    });

    it('should show file size in KB in technical details for non-CSV', () => {
      const result = diagnoseFileFormatError('orders.xlsx', 2048);
      expect(result.technicalDetails).toContain('2KB');
    });

    it('should show file size in MB for oversized file', () => {
      const elevenMB = 11 * 1024 * 1024;
      const result = diagnoseFileFormatError('large.csv', elevenMB);
      expect(result.technicalDetails).toContain('MB');
    });
  });

  describe('diagnoseDataValidationError', () => {
    it('should return critical severity when >50% error rate', () => {
      const errors = Array.from({ length: 6 }, (_, i) => `Row ${i + 1}: error`);
      const result = diagnoseDataValidationError(errors, 10, 4);

      expect(result.severity).toBe('critical');
      expect(result.errorType).toBe('invalid_data');
    });

    it('should return high severity when 20-50% error rate', () => {
      const errors = Array.from({ length: 3 }, (_, i) => `Row ${i + 1}: error`);
      const result = diagnoseDataValidationError(errors, 10, 7);

      expect(result.severity).toBe('high');
    });

    it('should return medium severity for low error rate', () => {
      const errors = ['Row 1: error'];
      const result = diagnoseDataValidationError(errors, 20, 19);

      expect(result.severity).toBe('medium');
    });

    it('should show error counts in description', () => {
      const errors = ['Row 1: error', 'Row 2: error'];
      const result = diagnoseDataValidationError(errors, 10, 8);

      expect(result.description).toContain('2');
      expect(result.description).toContain('10');
    });

    it('should generate solutions for missing order code', () => {
      const errors = ['Row 1: 注文番号が必須です'];
      const result = diagnoseDataValidationError(errors, 5, 4);

      const solutionText = result.userSolutions.join(' ');
      expect(solutionText).toContain('注文番号');
    });

    it('should generate solutions for missing customer name', () => {
      const errors = ['Row 1: 顧客名が必須です'];
      const result = diagnoseDataValidationError(errors, 5, 4);

      const solutionText = result.userSolutions.join(' ');
      expect(solutionText).toContain('顧客名');
    });

    it('should generate solutions for missing price', () => {
      const errors = ['Row 1: 金額が必須です'];
      const result = diagnoseDataValidationError(errors, 5, 4);

      const solutionText = result.userSolutions.join(' ');
      expect(solutionText).toContain('金額');
    });

    it('should generate solutions for invalid price format', () => {
      const errors = ['Row 1: 金額の形式が正しくありません'];
      const result = diagnoseDataValidationError(errors, 5, 4);

      const solutionText = result.userSolutions.join(' ');
      expect(solutionText).toContain('金額');
    });

    it('should include developer info with error patterns', () => {
      const errors = ['Row 1: 注文番号が必須です', 'Row 2: other error'];
      const result = diagnoseDataValidationError(errors, 10, 8);

      expect(result.developerInfo?.debugData).toBeDefined();
      expect(result.developerInfo?.debugData.errorPatterns).toBeDefined();
    });
  });

  describe('diagnoseUnknownError', () => {
    it('should detect encoding errors from message', () => {
      const error = new Error('TextDecoder encoding failed');
      const result = diagnoseUnknownError(error);

      expect(result.errorType).toBe('encoding');
      expect(result.severity).toBe('high');
    });

    it('should detect CSV parse errors from message', () => {
      const error = new Error('Failed to parse CSV file');
      const result = diagnoseUnknownError(error);

      expect(result.errorType).toBe('file_format');
      expect(result.severity).toBe('high');
    });

    it('should return unknown error type for generic errors', () => {
      const error = new Error('Unexpected failure occurred');
      const result = diagnoseUnknownError(error);

      expect(result.errorType).toBe('unknown');
      expect(result.severity).toBe('high');
    });

    it('should include the error message in technical details', () => {
      const error = new Error('Some specific error message');
      const result = diagnoseUnknownError(error);

      expect(result.technicalDetails).toContain('Some specific error message');
    });

    it('should include developer info', () => {
      const error = new Error('test error');
      const context = { userId: 123 };
      const result = diagnoseUnknownError(error, context);

      expect(result.developerInfo?.rawError).toBe('test error');
      expect(result.developerInfo?.debugData).toEqual(context);
    });

    it('should also detect decode in message for encoding error', () => {
      const error = new Error('Failed to decode buffer');
      const result = diagnoseUnknownError(error);

      expect(result.errorType).toBe('encoding');
    });
  });

  describe('formatDiagnosticsForUser', () => {
    it('should return success for low severity with no solutions', () => {
      const diagnostics: CSVErrorDiagnostics = {
        errorType: 'encoding',
        severity: 'low',
        title: '成功',
        description: 'ファイルは正常に読み込まれました。',
        technicalDetails: '',
        userSolutions: [],
      };

      const result = formatDiagnosticsForUser(diagnostics);
      expect(result.success).toBe(true);
      expect(result.message).toBe('ファイルは正常に読み込まれました。');
      expect(result.details).toBeUndefined();
    });

    it('should return failure for high severity', () => {
      const diagnostics: CSVErrorDiagnostics = {
        errorType: 'encoding',
        severity: 'high',
        title: 'エラー',
        description: '文字化けが発生しています。',
        technicalDetails: 'encoding: utf-8',
        userSolutions: ['UTF-8で保存してください'],
      };

      const result = formatDiagnosticsForUser(diagnostics);
      expect(result.success).toBe(false);
      expect(result.message).toBe('エラー');
      expect(result.details?.solutions).toContain('UTF-8で保存してください');
    });

    it('should return failure for low severity with solutions', () => {
      const diagnostics: CSVErrorDiagnostics = {
        errorType: 'encoding',
        severity: 'low',
        title: 'Warning',
        description: 'Some issue',
        technicalDetails: '',
        userSolutions: ['Check something'],
      };

      const result = formatDiagnosticsForUser(diagnostics);
      expect(result.success).toBe(false);
    });

    it('should include technical info in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true });

      const diagnostics: CSVErrorDiagnostics = {
        errorType: 'encoding',
        severity: 'high',
        title: 'Error',
        description: 'Error occurred',
        technicalDetails: 'Detected encoding: utf-8',
        userSolutions: ['Fix it'],
      };

      const result = formatDiagnosticsForUser(diagnostics);
      expect(result.details?.technicalInfo).toBe('Detected encoding: utf-8');

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true, configurable: true });
    });

    it('should not include technical info in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true });

      const diagnostics: CSVErrorDiagnostics = {
        errorType: 'encoding',
        severity: 'high',
        title: 'Error',
        description: 'Error occurred',
        technicalDetails: 'Secret details',
        userSolutions: ['Fix it'],
      };

      const result = formatDiagnosticsForUser(diagnostics);
      expect(result.details?.technicalInfo).toBeUndefined();

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true, configurable: true });
    });
  });
});
