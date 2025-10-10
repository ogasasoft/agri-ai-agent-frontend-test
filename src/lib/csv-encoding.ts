/**
 * CSV文字エンコーディング検出・変換ユーティリティ
 * 日本語CSVファイルの様々なエンコーディングに対応
 */

export interface EncodingDetectionResult {
  text: string;
  detectedEncoding: string;
  confidence: number;
  isJapanese: boolean;
  hasGarbledText: boolean;
  encodingAttempts: Array<{
    encoding: string;
    success: boolean;
    error?: string;
  }>;
}

export interface CSVHeaderAnalysis {
  headers: string[];
  possibleEncodings: string[];
  dataSource: 'colormi' | 'tabechoku' | 'unknown';
  hasRequiredFields: boolean;
  missingFields: string[];
  suggestions: string[];
}

// 日本語CSVでよく使われるエンコーディング（優先順）
const JAPANESE_ENCODINGS = [
  'shift_jis',      // カラーミー、多くの日本のECシステム
  'utf-8',          // 近年の標準、たべちょく
  'euc-jp',         // 古いUNIXシステム
  'iso-2022-jp',    // メール添付ファイル
  'utf-16le',       // Excel出力
  'utf-16be'        // Mac Excel出力
] as const;

// データソース推定のためのプレビュー関数
function quickDataSourceCheck(buffer: ArrayBuffer): 'colormi' | 'tabechoku' | 'unknown' {
  try {
    // Shift_JISで最初の100バイトをチェック
    const preview = new TextDecoder('shift_jis').decode(buffer.slice(0, 100));
    if (preview.includes('売上ID')) return 'colormi';
    if (preview.includes('注文番号')) return 'tabechoku';
  } catch (e) {
    // Shift_JISで失敗した場合、UTF-8を試す
    try {
      const preview = new TextDecoder('utf-8').decode(buffer.slice(0, 100));
      if (preview.includes('売上ID')) return 'colormi';
      if (preview.includes('注文番号')) return 'tabechoku';
    } catch (e2) {
      // どちらも失敗
    }
  }
  return 'unknown';
}

// 各データソースの特徴的なヘッダーパターン
const DATA_SOURCE_PATTERNS = {
  colormi: [
    '売上ID', '受注日', '購入者', '販売価格', '商品ID', 'デバイス', '購入者 名前', '購入者 電話番号', '購入商品 販売価格'
  ],
  tabechoku: [
    '注文番号', '顧客名', '希望配達日', '金額', '備考'
  ]
} as const;

// 文字化けパターンの検出（緩和版）
const GARBLED_PATTERNS = [
  /\ufffd{2,}/,                    // 連続した置換文字のみ（2個以上）
  /[\x00-\x08\x0B\x0C\x0E-\x1F]{3,}/, // 連続した制御文字（3個以上）
];

/**
 * 複数のエンコーディングを試してCSVテキストを変換
 */
export function detectAndConvertEncoding(buffer: ArrayBuffer): EncodingDetectionResult {
  const attempts: Array<{ encoding: string; success: boolean; error?: string }> = [];
  let bestResult: { text: string; encoding: string; confidence: number } | null = null;

  // データソースの事前推定
  const probableDataSource = quickDataSourceCheck(buffer);

  // カラーミーの場合、Shift_JISの信頼度を大幅に上げる
  const encodingPriority = probableDataSource === 'colormi'
    ? ['shift_jis', 'utf-8', 'euc-jp', 'iso-2022-jp', 'utf-16le', 'utf-16be']
    : Array.from(JAPANESE_ENCODINGS);

  for (const encoding of encodingPriority) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: true });
      const text = decoder.decode(buffer);

      const analysis = analyzeDecodedText(text, encoding);
      attempts.push({ encoding, success: true });

      // カラーミーでShift_JISが成功した場合、大幅なボーナス
      let adjustedConfidence = analysis.confidence;
      if (probableDataSource === 'colormi' && encoding === 'shift_jis' && analysis.confidence > 0.5) {
        adjustedConfidence = Math.min(1.0, analysis.confidence + 0.3);
      }

      if (!bestResult || adjustedConfidence > bestResult.confidence) {
        bestResult = {
          text,
          encoding,
          confidence: adjustedConfidence
        };
      }
    } catch (error) {
      attempts.push({
        encoding,
        success: false,
        error: error instanceof Error ? error.message : '復号化失敗'
      });
    }
  }

  // 最良の結果がない場合はUTF-8でフォールバック
  if (!bestResult) {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(buffer);
    bestResult = { text, encoding: 'utf-8', confidence: 0.1 };
  }

  const finalAnalysis = analyzeDecodedText(bestResult.text, bestResult.encoding);

  return {
    text: bestResult.text,
    detectedEncoding: bestResult.encoding,
    confidence: bestResult.confidence,
    isJapanese: finalAnalysis.isJapanese,
    hasGarbledText: finalAnalysis.hasGarbledText,
    encodingAttempts: attempts
  };
}

/**
 * 復号化されたテキストの品質を分析
 */
function analyzeDecodedText(text: string, encoding: string): {
  confidence: number;
  isJapanese: boolean;
  hasGarbledText: boolean;
} {
  let confidence = 0;
  let isJapanese = false;
  let hasGarbledText = false;

  // 文字化けパターンの検出
  for (const pattern of GARBLED_PATTERNS) {
    if (pattern.test(text)) {
      hasGarbledText = true;
      confidence -= 0.3;
      break;
    }
  }

  // 日本語文字の検出
  const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g);
  if (japaneseChars && japaneseChars.length > 0) {
    isJapanese = true;
    confidence += Math.min(japaneseChars.length / text.length, 0.5);
  }

  // CSVヘッダーの妥当性チェック
  const firstLine = text.split('\n')[0];
  if (firstLine && firstLine.includes(',') && firstLine.includes('"')) {
    confidence += 0.3; // 正しいCSV形式（ボーナス増加）
  }

  // カラーミーやたべちょくの特徴的なヘッダーを検出
  if (firstLine && (firstLine.includes('売上ID') || firstLine.includes('注文番号'))) {
    confidence += 0.4; // 確実にECシステムのCSV（ボーナス増加）
  }

  // エンコーディング固有のボーナス
  if (encoding === 'shift_jis' && isJapanese && !hasGarbledText) {
    confidence += 0.4; // Shift_JISは日本語CSVで一般的
  }
  if (encoding === 'utf-8' && !hasGarbledText) {
    confidence += 0.3; // UTF-8は近年の標準
  }

  // デバッグ情報（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log(`Encoding analysis for ${encoding}:`, {
      isJapanese,
      hasGarbledText,
      japaneseCharCount: japaneseChars?.length || 0,
      textLength: text.length,
      japaneseRatio: japaneseChars ? japaneseChars.length / text.length : 0,
      hasCSVFormat: firstLine?.includes(',') && firstLine?.includes('"'),
      hasECHeaders: firstLine?.includes('売上ID') || firstLine?.includes('注文番号'),
      rawConfidence: confidence,
      finalConfidence: Math.max(0, Math.min(1, confidence + 0.2))
    });
  }

  return {
    confidence: Math.max(0, Math.min(1, confidence + 0.2)), // 基準値0.2 + 調整（さらに緩和）
    isJapanese,
    hasGarbledText
  };
}

/**
 * CSVヘッダーを分析してデータソースを推定
 */
export function analyzeCSVHeaders(csvText: string): CSVHeaderAnalysis {
  const firstLine = csvText.split('\n')[0];
  const headers = firstLine
    .split(',')
    .map(h => h.trim().replace(/^"(.*)"$/, '$1')); // クォート除去

  let dataSource: 'colormi' | 'tabechoku' | 'unknown' = 'unknown';
  let confidence = 0;

  // データソースの推定
  for (const [source, patterns] of Object.entries(DATA_SOURCE_PATTERNS)) {
    const matchCount = patterns.filter(pattern =>
      headers.some(header => header.includes(pattern))
    ).length;

    const sourceConfidence = matchCount / patterns.length;
    if (sourceConfidence > confidence) {
      confidence = sourceConfidence;
      dataSource = source as 'colormi' | 'tabechoku';
    }
  }

  // 必須フィールドチェック
  const requiredFields = getRequiredFieldsForDataSource(dataSource);
  const missingFields: string[] = [];
  const hasRequiredFields = requiredFields.every(field => {
    const found = headers.some(header => field.patterns.some(pattern => header.includes(pattern)));
    if (!found) {
      missingFields.push(field.name);
    }
    return found;
  });

  // 改善提案の生成
  const suggestions = generateSuggestions(headers, dataSource, missingFields);

  return {
    headers,
    possibleEncodings: confidence > 0.6 ? [getPreferredEncoding(dataSource)] : JAPANESE_ENCODINGS.slice(),
    dataSource,
    hasRequiredFields,
    missingFields,
    suggestions
  };
}

/**
 * データソース別の必須フィールド定義
 */
function getRequiredFieldsForDataSource(dataSource: string) {
  const fields = {
    colormi: [
      { name: '売上ID', patterns: ['売上ID', 'ID'] },
      { name: '顧客名', patterns: ['購入者 名前', '名前', '顧客名'] },
      { name: '金額', patterns: ['販売価格', '金額', '価格', '合計'] },
    ],
    tabechoku: [
      { name: '注文番号', patterns: ['注文番号', '番号'] },
      { name: '顧客名', patterns: ['お届け先名', '注文者名', '顧客名', '名前'] },
      { name: '金額', patterns: ['商品代金', 'お支払い額', '生産者へのお支払い額', '金額', '価格'] },
    ],
    unknown: [
      { name: '注文ID', patterns: ['ID', '番号', 'コード'] },
      { name: '顧客名', patterns: ['名前', '顧客', '購入者'] },
      { name: '金額', patterns: ['金額', '価格', '料金'] },
    ]
  };

  return fields[dataSource as keyof typeof fields] || fields.unknown;
}

/**
 * データソース別の推奨エンコーディング
 */
function getPreferredEncoding(dataSource: string): string {
  const preferences = {
    colormi: 'shift_jis',
    tabechoku: 'utf-8',
    unknown: 'shift_jis' // 日本のECシステムの多くがShift_JIS
  };

  return preferences[dataSource as keyof typeof preferences] || 'shift_jis';
}

/**
 * 改善提案の生成
 */
function generateSuggestions(headers: string[], dataSource: string, missingFields: string[]): string[] {
  const suggestions: string[] = [];

  if (missingFields.length > 0) {
    suggestions.push(`不足している必須列: ${missingFields.join(', ')}`);

    // 類似フィールドの提案
    const similarFields = findSimilarFields(headers, missingFields, dataSource);
    if (similarFields.length > 0) {
      suggestions.push(`類似フィールドが見つかりました: ${similarFields.join(', ')}`);
    }
  }

  if (dataSource === 'unknown') {
    suggestions.push('データソースが特定できません。ヘッダー行が正しく読み込まれているか確認してください。');
  }

  // エンコーディング関連の提案
  const hasGarbledChars = headers.some(h => GARBLED_PATTERNS.some(p => p.test(h)));
  if (hasGarbledChars) {
    suggestions.push('文字化けが検出されました。ファイルの文字エンコーディングを確認してください。');
  }

  return suggestions;
}

/**
 * 類似フィールドの検索
 */
function findSimilarFields(headers: string[], missingFields: string[], dataSource: string): string[] {
  const requiredFields = getRequiredFieldsForDataSource(dataSource);
  const similarFields: string[] = [];

  for (const missing of missingFields) {
    const requiredField = requiredFields.find(rf => rf.name === missing);
    if (requiredField) {
      for (const header of headers) {
        if (requiredField.patterns.some(pattern =>
          header.includes(pattern.substring(0, Math.max(2, pattern.length - 1)))
        )) {
          similarFields.push(`"${header}" (${missing}の代替候補)`);
        }
      }
    }
  }

  return similarFields;
}

/**
 * デバッグ情報の生成
 */
export function generateEncodingDebugInfo(result: EncodingDetectionResult, analysis: CSVHeaderAnalysis) {
  return {
    encoding: {
      detected: result.detectedEncoding,
      confidence: result.confidence,
      isJapanese: result.isJapanese,
      hasGarbledText: result.hasGarbledText,
      allAttempts: result.encodingAttempts
    },
    csv: {
      dataSource: analysis.dataSource,
      headerCount: analysis.headers.length,
      headers: analysis.headers.slice(0, 10), // 最初の10個のみ
      hasRequiredFields: analysis.hasRequiredFields,
      missingFields: analysis.missingFields
    },
    suggestions: analysis.suggestions
  };
}