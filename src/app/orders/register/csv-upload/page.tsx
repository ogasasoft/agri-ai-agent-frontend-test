'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, ArrowLeft, CheckCircle, AlertCircle, Carrot, Apple, Package, Eye, FileText } from 'lucide-react';
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

interface UploadResult {
  registered_count: number;
  skipped_count: number;
  skipped_details: {
    order_code: string;
    customer_name: string;
    price: number;
    order_date: string;
    reason: string;
    existing_data?: {
      customer_name: string;
      price: number;
      order_date: string;
    };
    error_message?: string;
  }[];
  message: string;
}

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
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
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
    
    return new Promise<CSVPreviewData>((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          const data = results.data as string[][];
          
          if (data.length === 0) {
            reject(new Error('CSVファイルが空です'));
            return;
          }
          
          const headers = data[0];
          const rows = data.slice(1);
          
          // 必須項目のチェック
          const requiredColumns = ['注文番号', 'order_code'];
          const hasRequiredColumn = requiredColumns.some(col => 
            headers.some(header => header.toLowerCase().includes(col.toLowerCase()) || 
                                  col.toLowerCase().includes(header.toLowerCase()))
          );
          
          if (!hasRequiredColumn) {
            reject(new Error('必須列（注文番号/order_code）が見つかりません'));
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
        error: (error) => {
          reject(new Error(`CSVファイルの解析に失敗しました: ${error.message}`));
        }
      });
    });
  }, []);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
        setFile(selectedFile);
        setError(null);
        setResult(null);
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
      setResult(null);
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
      
      console.log('Debug - Session data:', sessionData);
      console.log('Debug - CSRF token:', csrfToken);

      // カテゴリ一覧を取得してIDを確認
      const categoriesResponse = await fetch('/api/categories');

      let categoryId: number | null = null;

      if (categoriesResponse.ok) {
        const categoriesResponseData = await categoriesResponse.json();
        const categoriesData = categoriesResponseData.categories || [];
        
        // カテゴリ名でマッピング
        const categoryMap: Record<ProductCategory, string> = {
          vegetables: '野菜',
          fruits: '果物', 
          other: 'その他'
        };
        
        const categoryName = categoryMap[category];
        const matchedCategory = categoriesData.find((cat: any) => cat.name === categoryName);
        
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        }
      } else {
        const errorData = await categoriesResponse.json();
        setError(`カテゴリ一覧の取得に失敗しました: ${errorData.message || '不明なエラー'}`);
        return;
      }

      // カテゴリが見つからない場合はデフォルトで作成
      if (!categoryId) {
        const categoryName = category === 'vegetables' ? '野菜' : 
                            category === 'fruits' ? '果物' : 'その他';
        
        const createCategoryResponse = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({
            name: categoryName,
            description: categoryInfo[category].description,
            color: category === 'vegetables' ? 'green' : 
                   category === 'fruits' ? 'red' : 'gray',
            icon: category === 'vegetables' ? 'carrot' : 
                  category === 'fruits' ? 'apple' : 'package'
          }),
        });

        if (createCategoryResponse.ok) {
          const newCategory = await createCategoryResponse.json();
          categoryId = newCategory.id || newCategory.category?.id;
        } else {
          const errorData = await createCategoryResponse.json();
          console.log('Debug - Create category error:', errorData);
          setError(errorData.message || 'カテゴリの作成に失敗しました。');
          return;
        }
      }

      if (!categoryId) {
        setError('カテゴリの作成に失敗しました。');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryId', categoryId.toString()); // IDを送信
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
        setResult(data);
        // 成功時の処理（新規登録件数が0でも重複スキップがあれば正常）
        if (data.registered_count > 0) {
          setTimeout(() => {
            router.push(`/orders/register/confirm?category=${category}&method=csv&count=${data.registered_count}`);
          }, 2000); // 2秒後にリダイレクト
        } else if (data.skipped_count > 0) {
          // 新規登録はないが重複スキップがある場合は正常処理
          // 結果表示のみでエラーなし
        } else {
          // 登録も重複もない場合はエラー
          setError('登録可能なデータがありませんでした。CSVファイルの形式を確認してください。');
        }
      } else {
        setError(data.message || 'アップロードに失敗しました');
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
            onClick={() => router.push('/orders/register/choose')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            カテゴリ選択に戻る
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <IconComponent className={`w-6 h-6 ${categoryData.color}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{categoryData.name}のCSVアップロード</h1>
              <p className="text-gray-600">{categoryData.description}をCSVファイルで一括登録</p>
            </div>
          </div>
        </div>

        {/* Category Examples */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">この カテゴリの商品例</h3>
          <div className="flex flex-wrap gap-2">
            {categoryData.examples.map((example, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {example}
              </span>
            ))}
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
            
            {/* ヘッダー情報 */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">ヘッダー情報</h4>
              <div className="flex flex-wrap gap-2">
                {previewData.headers.map((header, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {header || `列${index + 1}`}
                  </span>
                ))}
              </div>
            </div>
            
            {/* データプレビュー */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">データプレビュー（最初の5行）</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.headers.map((header, index) => (
                        <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          {header || `列${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {previewData.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900 border-b border-gray-200">
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

        {/* Result Display */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900 mb-2">アップロード完了</h3>
                <p className="text-green-800 mb-4">{result.message}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{result.registered_count}</div>
                    <div className="text-sm text-gray-600">新規登録件数</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">{result.skipped_count}</div>
                    <div className="text-sm text-gray-600">重複スキップ件数</div>
                  </div>
                </div>

                {result.skipped_details && result.skipped_details.length > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">スキップされた注文の詳細</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">注文番号</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">顧客名</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">金額</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">注文日</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">スキップ理由</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">既存データ</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {result.skipped_details.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900 border-b">
                                {item.order_code}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border-b">
                                {item.customer_name}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border-b">
                                ¥{item.price?.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border-b">
                                {item.order_date}
                              </td>
                              <td className="px-3 py-2 text-sm border-b">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  item.reason === '重複' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {item.reason}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 border-b">
                                {item.existing_data ? (
                                  <div className="text-xs">
                                    <div>顧客: {item.existing_data.customer_name}</div>
                                    <div>金額: ¥{item.existing_data.price?.toLocaleString()}</div>
                                    <div>日付: {item.existing_data.order_date}</div>
                                  </div>
                                ) : item.error_message ? (
                                  <div className="text-xs text-red-600">{item.error_message}</div>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => router.push('/orders/shipping/pending')}
                    className="btn-primary"
                  >
                    注文一覧を確認
                  </button>
                  <button
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                      setError(null);
                    }}
                    className="btn-secondary"
                  >
                    続けてアップロード
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV Format Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 CSVファイルの形式について</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• ヘッダー行: order_code,customer_name,phone,address,price,order_date,delivery_date,notes</li>
            <li>• 注文番号（order_code）は必須で、重複チェックに使用されます</li>
            <li>• 顧客名（customer_name）と価格（price）は必須項目です</li>
            <li>• 日付形式: YYYY-MM-DD または YYYY/MM/DD</li>
            <li>• 文字エンコーディング: UTF-8 または Shift_JIS</li>
          </ul>
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