// CSV処理専用デバッグユーティリティ
import { debugLogger } from './debug-logger';

interface CSVAnalysisResult {
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  emptyFields: Record<string, number>;
  duplicateHeaders: string[];
  suspiciousData: Array<{
    row: number;
    field: string;
    value: string;
    reason: string;
  }>;
}

export class CSVDebugHelper {
  static analyzeCSV(data: Record<string, string>[]): CSVAnalysisResult {
    if (data.length === 0) {
      return {
        headers: [],
        sampleRows: [],
        totalRows: 0,
        emptyFields: {},
        duplicateHeaders: [],
        suspiciousData: [],
      };
    }

    const headers = Object.keys(data[0]);
    const sampleRows = data.slice(0, 3); // 最初の3行をサンプルとして取得
    const emptyFields: Record<string, number> = {};
    const suspiciousData: Array<{ row: number; field: string; value: string; reason: string }> = [];

    // 空フィールドと怪しいデータの分析
    data.forEach((row, rowIndex) => {
      headers.forEach((header) => {
        const value = row[header] || '';

        // 空フィールドのカウント
        if (!value.trim()) {
          emptyFields[header] = (emptyFields[header] || 0) + 1;
        }

        // 怪しいデータの検出
        if (value.length > 100) {
          suspiciousData.push({
            row: rowIndex + 1,
            field: header,
            value: value.substring(0, 50) + '...',
            reason: 'データが異常に長い',
          });
        }

        if (header.includes('価格') || header.includes('金額') || header.includes('料金')) {
          if (value && isNaN(parseInt(value.replace(/[,¥]/g, '')))) {
            suspiciousData.push({
              row: rowIndex + 1,
              field: header,
              value,
              reason: '価格フィールドに数値以外の値',
            });
          }
        }
      });
    });

    // 重複ヘッダーの検出
    const headerCounts = headers.reduce((acc: Record<string, number>, header) => {
      acc[header] = (acc[header] || 0) + 1;
      return acc;
    }, {});
    const duplicateHeaders = Object.keys(headerCounts).filter((header) => headerCounts[header] > 1);

    return {
      headers,
      sampleRows,
      totalRows: data.length,
      emptyFields,
      duplicateHeaders,
      suspiciousData,
    };
  }

  static logCSVAnalysis(analysis: CSVAnalysisResult, dataSource: string) {
    analysis.headers.forEach((header, index) => {
      const emptyCount = analysis.emptyFields[header] || 0;
      const emptyPercentage =
        analysis.totalRows > 0 ? ((emptyCount / analysis.totalRows) * 100).toFixed(1) : '0';
    });

    if (analysis.duplicateHeaders.length > 0) {
    }

    analysis.sampleRows.forEach((row, index) => {
      analysis.headers.forEach((header) => {
        const value = row[header] || '';
        const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
      });
    });

    if (analysis.suspiciousData.length > 0) {
      analysis.suspiciousData.slice(0, 10).forEach((item) => {
        // 最初の10件のみ表示
      });

      if (analysis.suspiciousData.length > 10) {
      }
    }
  }

  static validateFieldMapping(
    row: Record<string, string>,
    dataSource: string,
    mappingResult: Record<string, string>
  ) {
    const requiredFields = ['order_code', 'customer_name', 'price'];
    const missingFields: string[] = [];

    Object.entries(mappingResult).forEach(([field, value]) => {
      const status = value ? '✅' : '❌';

      if (requiredFields.includes(field) && !value) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      // 類似フィールド名の提案
      const availableHeaders = Object.keys(row);
      missingFields.forEach((missing) => {
        const suggestions = this.findSimilarHeaders(missing, availableHeaders);
        if (suggestions.length > 0) {
        }
      });
    }

    return missingFields;
  }

  private static findSimilarHeaders(target: string, headers: string[]): string[] {
    const targetKeywords = this.extractKeywords(target);

    return headers
      .map((header) => ({
        header,
        score: this.calculateSimilarity(targetKeywords, this.extractKeywords(header)),
      }))
      .filter((item) => item.score > 0.3) // 30%以上の類似度
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // 上位3つ
      .map((item) => item.header);
  }

  private static extractKeywords(text: string): string[] {
    const keywordMap: Record<string, string[]> = {
      order_code: ['売上', 'ID', '注文', '番号', 'コード'],
      customer_name: ['購入者', '名前', '顧客', '氏名'],
      price: ['価格', '金額', '料金', '単価', '合計', '販売'],
      phone: ['電話', '番号', 'TEL'],
      address: ['住所', '都道府県', '市区町村'],
    };

    const targetKeywords = keywordMap[text] || [text];
    return targetKeywords;
  }

  private static calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    const text1 = keywords1.join(' ').toLowerCase();
    const text2 = keywords2.join(' ').toLowerCase();

    let matches = 0;
    keywords1.forEach((keyword) => {
      if (text2.includes(keyword.toLowerCase())) {
        matches++;
      }
    });

    return matches / Math.max(keywords1.length, keywords2.length);
  }
}

// 便利なヘルパー関数
export const analyzeAndLogCSV = (data: Record<string, string>[], dataSource: string) => {
  const analysis = CSVDebugHelper.analyzeCSV(data);
  CSVDebugHelper.logCSVAnalysis(analysis, dataSource);
  return analysis;
};

export const validateAndLogMapping = (
  row: Record<string, string>,
  dataSource: string,
  mappingResult: Record<string, string>
) => {
  return CSVDebugHelper.validateFieldMapping(row, dataSource, mappingResult);
};
