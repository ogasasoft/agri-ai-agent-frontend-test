'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, ArrowLeft, CheckCircle, AlertCircle, Carrot, Apple, Package, Eye, FileText } from 'lucide-react';
import { detectAndConvertEncoding } from '@/lib/csv-encoding';
import { Suspense } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

type ProductCategory = 'vegetables' | 'fruits' | 'other';

interface CategoryInfo {
  id: ProductCategory;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  examples: string[];
}

const categoryInfo: Record<ProductCategory, CategoryInfo> = {
  vegetables: {
    id: 'vegetables',
    name: '野菜',
    description: '新鮮な野菜の注文データ',
    icon: Carrot,
    color: 'text-green-600',
    examples: ['キャベツ', 'にんじん', 'たまねぎ', 'じゃがいも', 'ほうれん草']
  },
  fruits: {
    id: 'fruits',
    name: '果物',
    description: '新鮮な果物の注文データ',
    icon: Apple,
    color: 'text-red-600',
    examples: ['りんご', 'みかん', 'いちご', 'ぶどう', 'もも']
  },
  other: {
    id: 'other',
    name: 'その他',
    description: '加工品・その他商品の注文データ',
    icon: Package,
    color: 'text-gray-600',
    examples: ['味噌', '醤油', '米', 'パン', '卵']
  }
};


interface CSVPreviewData {
  headers: string[];
  data: string[][];
  totalRows: number;
  validRows: number;
  invalidRows: string[];
}

function CSVUploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = (searchParams.get('category') as ProductCategory) || 'other';
  const categoryId = searchParams.get('categoryId');
  const dataSource = searchParams.get('dataSource') || 'tabechoku';
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CSVPreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const categoryData = categoryInfo[category];
  const IconComponent = categoryData.icon;

  // ブラウザのデフォルトのドラッグ&ドロップ動作を防止
  useEffect(() => {
    const preventDefaultDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const preventDefaultDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragenter', preventDefaultDrag, false);
    document.addEventListener('dragover', preventDefaultDrag, false);
    document.addEventListener('drop', preventDefaultDrop, false);

    return () => {
      document.removeEventListener('dragenter', preventDefaultDrag, false);
      document.removeEventListener('dragover', preventDefaultDrag, false);
      document.removeEventListener('drop', preventDefaultDrop, false);
    };
  }, []);

  const analyzeCSV = useCallback(async (file: File) => {
    setAnalyzing(true);
    setError(null);

    try {
      // エンコーディング自動検出・変換
      const buffer = await file.arrayBuffer();
      const encodingResult = detectAndConvertEncoding(buffer);

      if (encodingResult.hasGarbledText || encodingResult.confidence < 0.3) {
        setError(`文字エンコーディングの問題が検出されました。検出されたエンコーディング: ${encodingResult.detectedEncoding} (信頼度: ${Math.round(encodingResult.confidence * 100)}%)`);
        setAnalyzing(false);
        return Promise.reject(new Error('Encoding error'));
      }

      const text = encodingResult.text;

      return new Promise<CSVPreviewData>((resolve, reject) => {
        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
          const data = results.data as string[][];
          
          if (data.length === 0) {
            reject(new Error('CSVファイルが空です'));
            return;
          }
          
          const headers = data[0];
          const rows = data.slice(1);
          
          // データソースに基づく必須項目のチェック
          let requiredColumns: string[];
          let errorMessage: string;
          
          if (dataSource === 'colormi') {
            requiredColumns = ['売上ID'];
            errorMessage = '必須列（売上ID）が見つかりません';
          } else {
            requiredColumns = ['注文番号', 'order_code'];
            errorMessage = '必須列（注文番号/order_code）が見つかりません';
          }
          
          const hasRequiredColumn = requiredColumns.some(col => 
            headers.some(header => header.toLowerCase().includes(col.toLowerCase()) || 
                                  col.toLowerCase().includes(header.toLowerCase()))
          );
          
          if (!hasRequiredColumn) {
            reject(new Error(errorMessage));
            return;
          }
          
          // データの妥当性チェック
          const invalidRows: string[] = [];
          let validRows = 0;
          
          rows.forEach((row, index) => {
            // 空行や不正な行をチェック
            const nonEmptyValues = row.filter(cell => cell && cell.trim());
            if (nonEmptyValues.length < 2) {
              invalidRows.push(`行 ${index + 2}: データが不足しています`);
            } else {
              validRows++;
            }
          });
          
          const previewData: CSVPreviewData = {
            headers,
            data: rows.slice(0, 5), // 最初の5行のみプレビュー
            totalRows: rows.length,
            validRows,
            invalidRows
          };
          
          resolve(previewData);
        },
        error: (error: any) => {
          reject(new Error(`CSVファイルの解析に失敗しました: ${error.message}`));
        }
      });
    });
    } catch (error) {
      setAnalyzing(false);
      return Promise.reject(error);
    }
  }, [dataSource]);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
        setFile(selectedFile);
        setError(null);
        setPreviewData(null);
        setShowPreview(false);
      } else {
        setError('CSVファイルを選択してください');
        setFile(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false,
    preventDropOnDocument: true,
    noClick: false
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setError(null);
      setPreviewData(null);
      setShowPreview(false);
    } else {
      setError('CSVファイルを選択してください');
      setFile(null);
    }
  };
  
  const handlePreview = async () => {
    if (!file) return;
    
    try {
      setAnalyzing(true);
      const preview = await analyzeCSV(file);
      setPreviewData(preview);
      setShowPreview(true);
      setAnalyzing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSVファイルの解析に失敗しました');
      setAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // セッション情報を取得してCSRFトークンを確認
      const sessionResponse = await fetch('/api/auth/me');

      if (!sessionResponse.ok) {
        setError('セッションの確認に失敗しました。再度ログインしてください。');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
        return;
      }

      const sessionData = await sessionResponse.json();
      let csrfToken = sessionData.session?.csrf_token || '';
      
      // Fallback: CSRFトークンをクッキーから直接取得
      if (!csrfToken) {
        csrfToken = document.cookie.split('csrf_token=')[1]?.split(';')[0] || '';
      }
      

      // categoryIdが直接URLパラメータで渡されているのでそれを使用
      const categoryIdNum = categoryId ? parseInt(categoryId) : null;
      
      if (!categoryIdNum) {
        setError('カテゴリIDが指定されていません。');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryId', categoryIdNum.toString()); // IDを送信
      formData.append('dataSource', dataSource); // データソースを送信
      formData.append('csrf_token', csrfToken); // FormDataにもCSRFトークンを追加

      const response = await fetch('/api/upload-with-category', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // 詳細な結果データをセッションストレージに保存
        sessionStorage.setItem('uploadResult', JSON.stringify(data));

        // 結果表示画面にリダイレクト
        const categoryName = categoryData?.name || 'カテゴリ';
        const redirectUrl = `/orders/register/result?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}&method=csv&registered=${data.registered_count}&skipped=${data.skipped_count}&dataSource=${dataSource}`;

        router.push(redirectUrl);
      } else {
        // 詳細なエラー情報を表示
        let errorMessage = data.message || 'アップロードに失敗しました。';
        
        // 詳細なデバッグ情報がある場合は表示
        if (data.debug_info?.data_analysis) {
          const analysis = data.debug_info.data_analysis;
          errorMessage += '\n\n📊 詳細情報:';
          if (analysis.total_rows) {
            errorMessage += `\n- 総行数: ${analysis.total_rows}`;
          }
          if (analysis.validation_errors && analysis.validation_errors.length > 0) {
            errorMessage += `\n- エラー例: ${analysis.validation_errors.slice(0, 3).join(', ')}`;
          }
          if (analysis.headers) {
            errorMessage += `\n- 検出されたヘッダー: ${analysis.headers.slice(0, 5).join(', ')}${analysis.headers.length > 5 ? '...' : ''}`;
          }
        }
        
        // 修正提案がある場合は表示
        if (data.suggestions && data.suggestions.length > 0) {
          errorMessage += '\n\n💡 修正提案:';
          data.suggestions.slice(0, 3).forEach((suggestion: string, index: number) => {
            errorMessage += `\n${index + 1}. ${suggestion}`;
          });
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('サーバーエラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/orders/register/data-source?categoryId=${categoryId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            データソース選択に戻る
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <IconComponent className={`w-6 h-6 ${categoryData.color}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{categoryData.name}のCSVアップロード</h1>
              <p className="text-gray-600">{categoryData.description}をCSVファイルで一括登録</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-500">データソース:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  dataSource === 'colormi' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {dataSource === 'colormi' ? 'カラーミー' : 'たべちょく'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="ml-2 text-sm text-gray-600">カテゴリ選択</span>
          </div>
          <div className="w-16 h-0.5 bg-green-500 mx-4"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="ml-2 text-sm text-gray-600">登録方法選択</span>
          </div>
          <div className="w-16 h-0.5 bg-green-500 mx-4"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="ml-2 text-sm text-gray-600">データソース選択</span>
          </div>
          <div className="w-16 h-0.5 bg-blue-500 mx-4"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-medium">
              4
            </div>
            <span className="ml-2 text-sm font-medium text-blue-600">CSVアップロード</span>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">CSVファイルのアップロード</h2>
          
          {!file ? (
            <div 
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} />
              
              <div>
                {isDragActive ? (
                  <p className="text-primary-600 mb-4 font-medium">ファイルをここにドロップしてください</p>
                ) : (
                  <>
                    <p className="text-gray-600 mb-2">CSVファイルをドラッグ&ドロップ</p>
                    <p className="text-sm text-gray-500 mb-4">または</p>
                    <span className="btn-primary cursor-pointer inline-block">
                      ファイルを選択
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div>
                <p className="text-green-600 font-medium mb-2">
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  {file.name}
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  ファイルサイズ: {(file.size / 1024).toFixed(1)} KB
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFile(null);
                      setPreviewData(null);
                      setShowPreview(false);
                    }}
                    className="btn-secondary"
                  >
                    ファイル変更
                  </button>
                  {!showPreview ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePreview();
                      }}
                      disabled={analyzing}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {analyzing ? '解析中...' : 'アップロード内容を確認'}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUpload();
                      }}
                      disabled={uploading}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'アップロード中...' : 'アップロード実行'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CSV Preview Display */}
        {showPreview && previewData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500" />
              <h3 className="text-xl font-semibold text-gray-900">CSVファイルのプレビュー</h3>
            </div>
            
            {/* 統計情報 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{previewData.totalRows}</div>
                <div className="text-sm text-gray-600">総データ数</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{previewData.validRows}</div>
                <div className="text-sm text-gray-600">有効データ数</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{previewData.invalidRows.length}</div>
                <div className="text-sm text-gray-600">問題のあるデータ</div>
              </div>
            </div>

            {/* データプレビュー */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">データプレビュー（最初の5行）</h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.headers.map((header, index) => (
                        <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-700 border-b border-gray-200 whitespace-nowrap">
                          {header || `列${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {previewData.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.totalRows > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  ... 他 {previewData.totalRows - 5} 行のデータがあります
                </p>
              )}
            </div>
            
            {/* エラー情報 */}
            {previewData.invalidRows.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-orange-900 mb-2">問題のあるデータ</h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  {previewData.invalidRows.slice(0, 5).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {previewData.invalidRows.length > 5 && (
                    <li>... 他 {previewData.invalidRows.length - 5} 件の問題</li>
                  )}
                </ul>
              </div>
            )}
            
            {/* アクションボタン */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                className="btn-secondary"
              >
                プレビューを閉じる
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || previewData.validRows === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'アップロード中...' : `${previewData.validRows}件のデータをアップロード`}
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-900">エラーが発生しました</h3>
                <p className="text-red-800 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}


        {/* CSV Format Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 {dataSource === 'colormi' ? 'カラーミー' : 'たべちょく'}CSVファイルの形式について</h4>
          {dataSource === 'colormi' ? (
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 必須ヘッダー: 売上ID, 購入者 名前, 購入者 住所, 購入単価</li>
              <li>• オプション: 受注日, 購入者 電話番号, 購入者 都道府県, 備考</li>
              <li>• 売上ID（注文番号）は必須で、重複チェックに使用されます</li>
              <li>• 住所は「購入者 都道府県」と「購入者 住所」が自動統合されます</li>
              <li>• 日付形式: YYYY-MM-DD または YYYY/MM/DD</li>
              <li>• 文字エンコーディング: UTF-8 または Shift_JIS</li>
            </ul>
          ) : (
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 必須ヘッダー: 注文番号, 顧客名, 住所, 金額</li>
              <li>• オプション: 電話番号, 注文日, 希望配達日, 備考</li>
              <li>• 注文番号は必須で、重複チェックに使用されます</li>
              <li>• 顧客名と金額は必須項目です</li>
              <li>• 日付形式: YYYY-MM-DD または YYYY/MM/DD</li>
              <li>• 文字エンコーディング: UTF-8 または Shift_JIS</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CSVUploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    }>
      <CSVUploadContent />
    </Suspense>
  );
}