import { CSVDebugHelper, analyzeAndLogCSV, validateAndLogMapping } from '@/lib/csv-debug';

jest.mock('@/lib/debug-logger', () => ({
  debugLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('csv-debug.ts', () => {
  describe('CSVDebugHelper.analyzeCSV', () => {
    it('should return empty result for empty data', () => {
      const result = CSVDebugHelper.analyzeCSV([]);
      expect(result).toEqual({
        headers: [],
        sampleRows: [],
        totalRows: 0,
        emptyFields: {},
        duplicateHeaders: [],
        suspiciousData: [],
      });
    });

    it('should detect headers from first row', () => {
      const data = [
        { 注文番号: 'ORD-001', 顧客名: '田中太郎', 金額: '3000' },
        { 注文番号: 'ORD-002', 顧客名: '鈴木花子', 金額: '5000' },
      ];

      const result = CSVDebugHelper.analyzeCSV(data);
      expect(result.headers).toEqual(['注文番号', '顧客名', '金額']);
    });

    it('should count total rows', () => {
      const data = [
        { col: 'a' },
        { col: 'b' },
        { col: 'c' },
      ];

      const result = CSVDebugHelper.analyzeCSV(data);
      expect(result.totalRows).toBe(3);
    });

    it('should return up to 3 sample rows', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ col: `row${i}` }));

      const result = CSVDebugHelper.analyzeCSV(data);
      expect(result.sampleRows.length).toBe(3);
      expect(result.sampleRows[0]).toEqual({ col: 'row0' });
    });

    it('should count empty fields', () => {
      const data = [
        { 注文番号: 'ORD-001', 顧客名: '', 金額: '3000' },
        { 注文番号: 'ORD-002', 顧客名: '  ', 金額: '' },
      ];

      const result = CSVDebugHelper.analyzeCSV(data);
      expect(result.emptyFields['顧客名']).toBe(2);
      expect(result.emptyFields['金額']).toBe(1);
      expect(result.emptyFields['注文番号']).toBeUndefined();
    });

    it('should detect suspicious data with long values', () => {
      const longValue = 'a'.repeat(101);
      const data = [
        { 注文番号: 'ORD-001', 顧客名: longValue },
      ];

      const result = CSVDebugHelper.analyzeCSV(data);
      expect(result.suspiciousData.length).toBe(1);
      expect(result.suspiciousData[0].reason).toBe('データが異常に長い');
      expect(result.suspiciousData[0].field).toBe('顧客名');
      expect(result.suspiciousData[0].row).toBe(1);
      expect(result.suspiciousData[0].value).toContain('...');
    });

    it('should detect non-numeric value in price fields', () => {
      const data = [
        { 価格: 'not-a-number' },
      ];

      const result = CSVDebugHelper.analyzeCSV(data);
      const priceIssue = result.suspiciousData.find(d => d.reason.includes('価格フィールド'));
      expect(priceIssue).toBeDefined();
    });

    it('should accept valid price values with yen and commas', () => {
      const data = [
        { 価格: '¥1,000' },
      ];

      const result = CSVDebugHelper.analyzeCSV(data);
      const priceIssue = result.suspiciousData.find(d => d.reason.includes('価格フィールド'));
      expect(priceIssue).toBeUndefined();
    });

    it('should not flag empty price fields as suspicious', () => {
      const data = [
        { 価格: '' },
      ];

      const result = CSVDebugHelper.analyzeCSV(data);
      const priceIssue = result.suspiciousData.find(d => d.reason.includes('価格フィールド'));
      expect(priceIssue).toBeUndefined();
    });

    it('should handle fields with 金額 and 料金 in header name', () => {
      const data = [
        { 合計金額: 'invalid', 送料: 'also-invalid' },
      ];
      const result = CSVDebugHelper.analyzeCSV(data);
      const issues = result.suspiciousData.filter(d => d.reason.includes('価格フィールド'));
      expect(issues.length).toBe(1); // 金額 matches but 料金 doesn't match 送料
    });
  });

  describe('CSVDebugHelper.logCSVAnalysis', () => {
    it('should log analysis report without errors', () => {
      const analysis = {
        headers: ['注文番号', '顧客名'],
        sampleRows: [{ 注文番号: 'ORD-001', 顧客名: '田中太郎' }],
        totalRows: 5,
        emptyFields: { 顧客名: 1 },
        duplicateHeaders: ['注文番号'],
        suspiciousData: [{ row: 1, field: '顧客名', value: 'x'.repeat(51), reason: 'too long' }],
      };

      expect(() => CSVDebugHelper.logCSVAnalysis(analysis, 'ColorMi')).not.toThrow();
    });

    it('should handle more than 10 suspicious data entries', () => {
      const suspiciousData = Array.from({ length: 15 }, (_, i) => ({
        row: i + 1,
        field: 'col',
        value: 'value',
        reason: 'reason',
      }));

      const analysis = {
        headers: ['col'],
        sampleRows: [],
        totalRows: 15,
        emptyFields: {},
        duplicateHeaders: [],
        suspiciousData,
      };

      expect(() => CSVDebugHelper.logCSVAnalysis(analysis, 'test')).not.toThrow();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('5 more suspicious entries')
      );
    });

    it('should handle empty headers', () => {
      const analysis = {
        headers: [],
        sampleRows: [],
        totalRows: 0,
        emptyFields: {},
        duplicateHeaders: [],
        suspiciousData: [],
      };

      expect(() => CSVDebugHelper.logCSVAnalysis(analysis, 'test')).not.toThrow();
    });
  });

  describe('CSVDebugHelper.validateFieldMapping', () => {
    it('should return empty array when all required fields are mapped', () => {
      const row = { 注文番号: 'ORD-001', 顧客名: '田中太郎', 金額: '3000' };
      const mappingResult = {
        order_code: 'ORD-001',
        customer_name: '田中太郎',
        price: '3000',
      };

      const missing = CSVDebugHelper.validateFieldMapping(row, 'test', mappingResult);
      expect(missing).toEqual([]);
    });

    it('should return missing required fields', () => {
      const row = { 注文番号: 'ORD-001' };
      const mappingResult = {
        order_code: 'ORD-001',
        customer_name: '',
        price: '',
      };

      const missing = CSVDebugHelper.validateFieldMapping(row, 'test', mappingResult);
      expect(missing).toContain('customer_name');
      expect(missing).toContain('price');
    });

    it('should suggest similar headers for missing fields', () => {
      const row = { '売上ID': 'ORD-001', '購入者 名前': '田中太郎', '販売価格': '3000' };
      const mappingResult = {
        order_code: '',
        customer_name: '',
        price: '',
      };

      expect(() => CSVDebugHelper.validateFieldMapping(row, 'test', mappingResult)).not.toThrow();
    });
  });

  describe('analyzeAndLogCSV', () => {
    it('should analyze and return result', () => {
      const data = [
        { col1: 'val1', col2: 'val2' },
        { col1: 'val3', col2: 'val4' },
      ];

      const result = analyzeAndLogCSV(data, 'test-source');
      expect(result.totalRows).toBe(2);
      expect(result.headers).toEqual(['col1', 'col2']);
    });
  });

  describe('validateAndLogMapping', () => {
    it('should validate mapping and return missing fields', () => {
      const row = { 注文番号: 'ORD-001' };
      const mappingResult = { order_code: 'ORD-001', customer_name: '', price: '' };

      const missing = validateAndLogMapping(row, 'test', mappingResult);
      expect(Array.isArray(missing)).toBe(true);
    });
  });
});
