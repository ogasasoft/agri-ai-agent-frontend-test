'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, ArrowLeft, CheckCircle, AlertCircle, Carrot, Apple, Package } from 'lucide-react';
import { Suspense } from 'react';
import { useDropzone } from 'react-dropzone';

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
  skipped_order_codes: string[];
  message: string;
}

function CSVUploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = (searchParams.get('category') as ProductCategory) || 'other';
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile && selectedFile.type === 'text/csv') {
        setFile(selectedFile);
        setError(null);
        setResult(null);
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
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('CSVファイルを選択してください');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // まずセッション情報を取得してCSRFトークンを確認
      const sessionToken = document.cookie.split('session_token=')[1]?.split(';')[0] || '';
      
      // セッション情報を取得
      const sessionResponse = await fetch('/api/auth/me', {
        headers: {
          'x-session-token': sessionToken,
        },
      });

      if (!sessionResponse.ok) {
        setError('セッションの確認に失敗しました。再度ログインしてください。');
        return;
      }

      const sessionData = await sessionResponse.json();
      const csrfToken = sessionData.session?.csrf_token || '';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('csrf_token', csrfToken); // FormDataにもCSRFトークンを追加

      const response = await fetch('/api/upload-with-category', {
        method: 'POST',
        headers: {
          'x-session-token': sessionToken,
          'x-csrf-token': csrfToken,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        // 成功時は確認画面にリダイレクト
        setTimeout(() => {
          router.push(`/orders/register/confirm?category=${category}&method=csv&count=${data.registered_count}`);
        }, 2000); // 2秒後にリダイレクト
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
                    }}
                    className="btn-secondary"
                  >
                    ファイル変更
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUpload();
                    }}
                    disabled={uploading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'アップロード中...' : 'アップロード開始'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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

                {result.skipped_order_codes.length > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">スキップされた注文番号</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.skipped_order_codes.map((code, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                          {code}
                        </span>
                      ))}
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