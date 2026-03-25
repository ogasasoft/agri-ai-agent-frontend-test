// Restore working TextDecoder/TextEncoder from Node.js util (jest.setup.js polyfills are broken)
const { TextDecoder: NodeTextDecoder, TextEncoder: NodeTextEncoder } = require('util');
globalThis.TextDecoder = NodeTextDecoder;
globalThis.TextEncoder = NodeTextEncoder;

import {
  detectAndConvertEncoding,
  analyzeCSVHeaders,
  generateEncodingDebugInfo,
  EncodingDetectionResult,
  CSVHeaderAnalysis,
} from '@/lib/csv-encoding';

// Helper to create ArrayBuffer from UTF-8 string
function stringToBuffer(text: string): ArrayBuffer {
  const encoder = new NodeTextEncoder();
  const uint8 = encoder.encode(text);
  return uint8.buffer as ArrayBuffer;
}

describe('csv-encoding.ts', () => {
  describe('detectAndConvertEncoding', () => {
    it('should decode UTF-8 CSV successfully', () => {
      const csvText = '注文番号,顧客名,金額\nORD-001,田中太郎,3000\n';
      const buffer = stringToBuffer(csvText);

      const result = detectAndConvertEncoding(buffer);

      expect(result.detectedEncoding).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.encodingAttempts.length).toBeGreaterThan(0);
    });

    it('should return text content', () => {
      const csvText = '注文番号,顧客名\nORD-001,田中太郎\n';
      const buffer = stringToBuffer(csvText);

      const result = detectAndConvertEncoding(buffer);

      expect(result.text).toBeTruthy();
    });

    it('should detect Japanese text', () => {
      const csvText = '注文番号,顧客名\nORD-001,田中太郎\n';
      const buffer = stringToBuffer(csvText);

      const result = detectAndConvertEncoding(buffer);

      expect(result.isJapanese).toBe(true);
    });

    it('should handle non-Japanese ASCII CSV', () => {
      const csvText = 'order_id,customer_name\n001,John Doe\n';
      const buffer = stringToBuffer(csvText);

      const result = detectAndConvertEncoding(buffer);

      expect(result.text).toBeTruthy();
      expect(result.encodingAttempts.length).toBeGreaterThan(0);
    });

    it('should return confidence between 0 and 1', () => {
      const csvText = '注文番号,顧客名\nORD-001,田中太郎\n';
      const buffer = stringToBuffer(csvText);

      const result = detectAndConvertEncoding(buffer);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should increase confidence for CSV with correct format', () => {
      const csvText = '"注文番号","顧客名","金額"\n"ORD-001","田中太郎","3000"\n';
      const buffer = stringToBuffer(csvText);

      const result = detectAndConvertEncoding(buffer);
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0);

      const result = detectAndConvertEncoding(buffer);
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('should handle tabechoku CSV detection', () => {
      const csvText = '注文番号,お届け先名,商品代金\nORD-001,田中太郎,3000\n';
      const buffer = stringToBuffer(csvText);

      const result = detectAndConvertEncoding(buffer);
      expect(result.text).toContain('注文番号');
    });

    it('should track encoding attempts', () => {
      const csvText = '注文番号,顧客名\nORD-001,田中太郎\n';
      const buffer = stringToBuffer(csvText);

      const result = detectAndConvertEncoding(buffer);

      expect(Array.isArray(result.encodingAttempts)).toBe(true);
      result.encodingAttempts.forEach(attempt => {
        expect(attempt.encoding).toBeDefined();
        expect(typeof attempt.success).toBe('boolean');
      });
    });
  });

  describe('analyzeCSVHeaders', () => {
    it('should detect colormi data source from headers', () => {
      const csvText = '"売上ID","受注日","購入者 名前","購入商品 販売価格"\ndata1,data2,data3,data4';

      const result = analyzeCSVHeaders(csvText);

      expect(result.dataSource).toBe('colormi');
    });

    it('should detect tabechoku data source from headers', () => {
      const csvText = '注文番号,顧客名,希望配達日,金額\nORD-001,田中太郎,2024-01-01,3000';

      const result = analyzeCSVHeaders(csvText);

      expect(result.dataSource).toBe('tabechoku');
    });

    it('should return unknown for unrecognized headers', () => {
      const csvText = 'column1,column2,column3\nval1,val2,val3';

      const result = analyzeCSVHeaders(csvText);

      expect(result.dataSource).toBe('unknown');
    });

    it('should parse headers correctly', () => {
      const csvText = '注文番号,顧客名,金額\nORD-001,田中太郎,3000';

      const result = analyzeCSVHeaders(csvText);

      expect(result.headers).toContain('注文番号');
      expect(result.headers).toContain('顧客名');
      expect(result.headers).toContain('金額');
    });

    it('should strip quotes from headers', () => {
      const csvText = '"注文番号","顧客名","金額"\nORD-001,田中太郎,3000';

      const result = analyzeCSVHeaders(csvText);

      expect(result.headers).toContain('注文番号');
      expect(result.headers).not.toContain('"注文番号"');
    });

    it('should check for required fields', () => {
      const csvText = '注文番号,顧客名,金額\nORD-001,田中太郎,3000';

      const result = analyzeCSVHeaders(csvText);

      expect(typeof result.hasRequiredFields).toBe('boolean');
      expect(Array.isArray(result.missingFields)).toBe(true);
    });

    it('should generate suggestions for missing fields', () => {
      const csvText = '不明列1,不明列2\nval1,val2';

      const result = analyzeCSVHeaders(csvText);

      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should identify possible encodings', () => {
      const csvText = '注文番号,顧客名,金額\nORD-001,田中太郎,3000';

      const result = analyzeCSVHeaders(csvText);

      expect(Array.isArray(result.possibleEncodings)).toBe(true);
      expect(result.possibleEncodings.length).toBeGreaterThan(0);
    });
  });

  describe('generateEncodingDebugInfo', () => {
    it('should generate debug info from results', () => {
      const encodingResult: EncodingDetectionResult = {
        text: 'test',
        detectedEncoding: 'utf-8',
        confidence: 0.8,
        isJapanese: true,
        hasGarbledText: false,
        encodingAttempts: [{ encoding: 'utf-8', success: true }],
      };

      const headerAnalysis: CSVHeaderAnalysis = {
        headers: ['注文番号', '顧客名', '金額'],
        possibleEncodings: ['utf-8'],
        dataSource: 'tabechoku',
        hasRequiredFields: true,
        missingFields: [],
        suggestions: [],
      };

      const debugInfo = generateEncodingDebugInfo(encodingResult, headerAnalysis);

      expect(debugInfo.encoding.detected).toBe('utf-8');
      expect(debugInfo.encoding.confidence).toBe(0.8);
      expect(debugInfo.encoding.isJapanese).toBe(true);
      expect(debugInfo.encoding.hasGarbledText).toBe(false);
      expect(debugInfo.encoding.allAttempts).toHaveLength(1);
    });

    it('should include CSV analysis info', () => {
      const encodingResult: EncodingDetectionResult = {
        text: 'test',
        detectedEncoding: 'shift_jis',
        confidence: 0.9,
        isJapanese: true,
        hasGarbledText: false,
        encodingAttempts: [],
      };

      const headerAnalysis: CSVHeaderAnalysis = {
        headers: ['売上ID', '購入者 名前', '販売価格', 'extra1', 'extra2', 'extra3', 'extra4', 'extra5', 'extra6', 'extra7', 'extra8', 'extra9'],
        possibleEncodings: ['shift_jis'],
        dataSource: 'colormi',
        hasRequiredFields: false,
        missingFields: ['金額'],
        suggestions: ['不足している必須列: 金額'],
      };

      const debugInfo = generateEncodingDebugInfo(encodingResult, headerAnalysis);

      expect(debugInfo.csv.dataSource).toBe('colormi');
      expect(debugInfo.csv.hasRequiredFields).toBe(false);
      expect(debugInfo.csv.missingFields).toContain('金額');
      expect(debugInfo.csv.headers.length).toBeLessThanOrEqual(10);
      expect(debugInfo.suggestions).toContain('不足している必須列: 金額');
    });
  });
});
