/**
 * CSV処理エラーの詳細診断機能
 * ユーザーにわかりやすいエラーメッセージとソリューションを提供
 */

import { CSVHeaderAnalysis, EncodingDetectionResult } from './csv-encoding';

export interface CSVErrorDiagnostics {
  errorType: 'encoding' | 'missing_fields' | 'invalid_data' | 'file_format' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  technicalDetails: string;
  userSolutions: string[];
  developerInfo?: {
    encoding?: EncodingDetectionResult;
    headers?: CSVHeaderAnalysis;
    rawError?: string;
    debugData?: any;
  };
}

/**
 * エンコーディングエラーの診断
 */
export function diagnoseEncodingError(
  encodingResult: EncodingDetectionResult,
  headerAnalysis: CSVHeaderAnalysis
): CSVErrorDiagnostics {
  const isLowConfidence = encodingResult.confidence < 0.3; // 閾値を緩和
  const hasGarbledText = encodingResult.hasGarbledText;

  // カラーミーのShift_JISの場合、より寛容に
  const isColorme = encodingResult.text.includes('売上ID');
  const isShiftJis = encodingResult.detectedEncoding === 'shift_jis';

  if (hasGarbledText || (isLowConfidence && !(isColorme && isShiftJis))) {
    return {
      errorType: 'encoding',
      severity: hasGarbledText ? 'critical' : 'high',
      title: '文字エンコーディングの問題',
      description: hasGarbledText
        ? 'CSVファイルの文字が正しく読み込めませんでした。文字化けが発生しています。'
        : 'CSVファイルの文字エンコーディングの判定に不安があります。',
      technicalDetails: `検出されたエンコーディング: ${encodingResult.detectedEncoding} (信頼度: ${Math.round(encodingResult.confidence * 100)}%)`,
      userSolutions: [
        'CSVファイルをUTF-8エンコーディングで保存し直してください',
        'Excelの場合: 「ファイル」→「エクスポート」→「ファイルの種類の変更」→「CSV UTF-8」を選択',
        'カラーミーショップの場合: デフォルトのCSVエクスポート形式(Shift_JIS)をそのまま使用可能',
        'テキストエディタで開いて文字化けしていないか確認してください'
      ],
      developerInfo: {
        encoding: encodingResult,
        headers: headerAnalysis
      }
    };
  }

  return {
    errorType: 'encoding',
    severity: 'low',
    title: 'エンコーディング判定完了',
    description: `CSVファイルは${encodingResult.detectedEncoding}として正常に読み込まれました。`,
    technicalDetails: `信頼度: ${Math.round(encodingResult.confidence * 100)}%`,
    userSolutions: [],
    developerInfo: {
      encoding: encodingResult,
      headers: headerAnalysis
    }
  };
}

/**
 * 必須フィールド不足エラーの診断
 */
export function diagnoseMissingFieldsError(
  headerAnalysis: CSVHeaderAnalysis,
  missingFields: string[]
): CSVErrorDiagnostics {
  const dataSourceName = {
    colormi: 'カラーミーショップ',
    tabechoku: 'たべちょく',
    unknown: '不明なデータソース'
  }[headerAnalysis.dataSource];

  const solutions: string[] = [];

  // データソース別の解決策
  if (headerAnalysis.dataSource === 'colormi') {
    solutions.push(
      'カラーミーショップ管理画面で「受注管理」→「CSVダウンロード」から正しい形式でエクスポートしてください',
      '「売上明細CSVダウンロード」を使用して、商品単位でのデータを取得してください'
    );
  } else if (headerAnalysis.dataSource === 'tabechoku') {
    solutions.push(
      'たべちょく管理画面で注文データをCSV形式でエクスポートしてください',
      '注文番号、顧客名、金額の列が含まれていることを確認してください'
    );
  } else {
    solutions.push(
      'CSVファイルの1行目にヘッダー（列名）が含まれていることを確認してください',
      '最低限「注文番号」「顧客名」「金額」の列が必要です'
    );
  }

  // 類似フィールドがある場合の案内
  if (headerAnalysis.suggestions.some(s => s.includes('類似フィールド'))) {
    solutions.push('類似する列名が見つかりました。列名を確認して正しい形式に修正してください');
  }

  solutions.push(
    'CSVファイルをテキストエディタまたはExcelで開いて、ヘッダー行（1行目）を確認してください',
    '問題が解決しない場合は、サンプルCSVファイルをご確認ください'
  );

  return {
    errorType: 'missing_fields',
    severity: 'critical',
    title: `必須列が不足しています (${dataSourceName})`,
    description: `CSVファイルに必要な列が見つかりません: ${missingFields.join(', ')}`,
    technicalDetails: `検出されたヘッダー: ${headerAnalysis.headers.slice(0, 5).join(', ')}${headerAnalysis.headers.length > 5 ? '...' : ''}`,
    userSolutions: solutions,
    developerInfo: {
      headers: headerAnalysis
    }
  };
}

/**
 * ファイル形式エラーの診断
 */
export function diagnoseFileFormatError(fileName: string, fileSize: number): CSVErrorDiagnostics {
  const isCSV = fileName.toLowerCase().endsWith('.csv');
  const isEmpty = fileSize === 0;
  const isTooLarge = fileSize > 10 * 1024 * 1024; // 10MB

  if (!isCSV) {
    return {
      errorType: 'file_format',
      severity: 'critical',
      title: 'ファイル形式が正しくありません',
      description: 'CSVファイル（.csv）のみアップロード可能です。',
      technicalDetails: `アップロードされたファイル: ${fileName} (${Math.round(fileSize / 1024)}KB)`,
      userSolutions: [
        'ファイルの拡張子が「.csv」であることを確認してください',
        'Excelファイル(.xlsx)の場合は「名前を付けて保存」でCSV形式に変換してください',
        'ファイル名に特殊文字が含まれていないか確認してください'
      ]
    };
  }

  if (isEmpty) {
    return {
      errorType: 'file_format',
      severity: 'critical',
      title: 'ファイルが空です',
      description: 'アップロードされたCSVファイルにデータが含まれていません。',
      technicalDetails: `ファイルサイズ: ${fileSize}バイト`,
      userSolutions: [
        'CSVファイルにデータが含まれていることを確認してください',
        'ファイルが破損していないか確認してください',
        '正しいファイルを選択しているか確認してください'
      ]
    };
  }

  if (isTooLarge) {
    return {
      errorType: 'file_format',
      severity: 'high',
      title: 'ファイルサイズが大きすぎます',
      description: 'CSVファイルのサイズは10MB以下にしてください。',
      technicalDetails: `ファイルサイズ: ${Math.round(fileSize / 1024 / 1024)}MB`,
      userSolutions: [
        'CSVファイルを複数に分割してアップロードしてください',
        '不要な列や行を削除してファイルサイズを削減してください',
        'データの期間を短縮して再エクスポートしてください'
      ]
    };
  }

  return {
    errorType: 'file_format',
    severity: 'low',
    title: 'ファイル形式は正常です',
    description: `CSVファイル「${fileName}」は正常に読み込み可能です。`,
    technicalDetails: `ファイルサイズ: ${Math.round(fileSize / 1024)}KB`,
    userSolutions: []
  };
}

/**
 * データ検証エラーの診断
 */
export function diagnoseDataValidationError(
  validationErrors: string[],
  totalRows: number,
  processedRows: number
): CSVErrorDiagnostics {
  const errorRate = validationErrors.length / totalRows;
  const severity = errorRate > 0.5 ? 'critical' : errorRate > 0.2 ? 'high' : 'medium';

  // エラーパターンの分析
  const errorPatterns = analyzeValidationErrorPatterns(validationErrors);

  return {
    errorType: 'invalid_data',
    severity,
    title: 'データ検証エラー',
    description: `${validationErrors.length}件のデータエラーが見つかりました (全${totalRows}行中)`,
    technicalDetails: `処理成功: ${processedRows}行、エラー: ${validationErrors.length}行`,
    userSolutions: generateDataValidationSolutions(errorPatterns),
    developerInfo: {
      debugData: {
        errorPatterns,
        sampleErrors: validationErrors.slice(0, 5),
        errorRate: Math.round(errorRate * 100)
      }
    }
  };
}

/**
 * 検証エラーのパターン分析
 */
function analyzeValidationErrorPatterns(errors: string[]): {
  missingOrderCode: number;
  missingCustomerName: number;
  missingPrice: number;
  invalidPrice: number;
  other: number;
} {
  const patterns = {
    missingOrderCode: 0,
    missingCustomerName: 0,
    missingPrice: 0,
    invalidPrice: 0,
    other: 0
  };

  for (const error of errors) {
    if (error.includes('注文番号が必須')) {
      patterns.missingOrderCode++;
    } else if (error.includes('顧客名が必須')) {
      patterns.missingCustomerName++;
    } else if (error.includes('金額が必須')) {
      patterns.missingPrice++;
    } else if (error.includes('金額の形式')) {
      patterns.invalidPrice++;
    } else {
      patterns.other++;
    }
  }

  return patterns;
}

/**
 * データ検証エラーの解決策生成
 */
function generateDataValidationSolutions(errorPatterns: ReturnType<typeof analyzeValidationErrorPatterns>): string[] {
  const solutions: string[] = [];

  if (errorPatterns.missingOrderCode > 0) {
    solutions.push('注文番号が空の行があります。すべての行に注文番号を入力してください');
  }

  if (errorPatterns.missingCustomerName > 0) {
    solutions.push('顧客名が空の行があります。すべての行に顧客名を入力してください');
  }

  if (errorPatterns.missingPrice > 0) {
    solutions.push('金額が空の行があります。すべての行に金額を入力してください');
  }

  if (errorPatterns.invalidPrice > 0) {
    solutions.push('金額の形式が正しくない行があります。半角数字で入力してください（例: 1500）');
  }

  solutions.push(
    'CSVファイルをExcelで開いて、エラーがある行を修正してください',
    '空白行や不完全な行を削除してください',
    '問題が解決しない場合は、正常な行のみでCSVファイルを作成し直してください'
  );

  return solutions;
}

/**
 * 一般的な例外エラーの診断
 */
export function diagnoseUnknownError(error: Error, context?: any): CSVErrorDiagnostics {
  // エラーメッセージから原因を推測
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('encoding') || errorMessage.includes('decode')) {
    return {
      errorType: 'encoding',
      severity: 'high',
      title: '文字エンコーディングエラー',
      description: 'ファイルの文字エンコーディングに問題があります。',
      technicalDetails: error.message,
      userSolutions: [
        'CSVファイルをUTF-8エンコーディングで保存し直してください',
        'ファイルが破損していないか確認してください'
      ],
      developerInfo: {
        rawError: error.message,
        debugData: context
      }
    };
  }

  if (errorMessage.includes('parse') || errorMessage.includes('csv')) {
    return {
      errorType: 'file_format',
      severity: 'high',
      title: 'CSVファイル解析エラー',
      description: 'CSVファイルの形式に問題があります。',
      technicalDetails: error.message,
      userSolutions: [
        'CSVファイルの形式が正しいか確認してください',
        'ダブルクォートやカンマが正しく使用されているか確認してください',
        'ファイルをテキストエディタで開いて内容を確認してください'
      ],
      developerInfo: {
        rawError: error.message,
        debugData: context
      }
    };
  }

  return {
    errorType: 'unknown',
    severity: 'high',
    title: '予期しないエラー',
    description: 'システムエラーが発生しました。',
    technicalDetails: error.message,
    userSolutions: [
      'しばらく時間をおいて再試行してください',
      'ファイルサイズを小さくして再試行してください',
      '問題が継続する場合はサポートにお問い合わせください'
    ],
    developerInfo: {
      rawError: error.message,
      debugData: context
    }
  };
}

/**
 * 診断結果をユーザー向けメッセージに変換
 */
export function formatDiagnosticsForUser(diagnostics: CSVErrorDiagnostics): {
  success: boolean;
  message: string;
  details?: {
    errorType: string;
    title: string;
    description: string;
    solutions: string[];
    technicalInfo?: string;
  };
} {
  const isSuccess = diagnostics.severity === 'low' && diagnostics.userSolutions.length === 0;

  if (isSuccess) {
    return {
      success: true,
      message: diagnostics.description
    };
  }

  return {
    success: false,
    message: diagnostics.title,
    details: {
      errorType: diagnostics.errorType,
      title: diagnostics.title,
      description: diagnostics.description,
      solutions: diagnostics.userSolutions,
      technicalInfo: process.env.NODE_ENV === 'development' ? diagnostics.technicalDetails : undefined
    }
  };
}