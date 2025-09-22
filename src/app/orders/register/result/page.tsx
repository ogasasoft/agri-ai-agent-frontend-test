'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertTriangle, Clock, XCircle, FileText, TrendingUp } from 'lucide-react';
import { Suspense } from 'react';

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

function UploadResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const method = searchParams.get('method');
  const dataSource = searchParams.get('dataSource');
  const registeredCount = parseInt(searchParams.get('registered') || '0');
  const skippedCount = parseInt(searchParams.get('skipped') || '0');
  const categoryName = searchParams.get('categoryName') || 'カテゴリ';

  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // セッションストレージから詳細結果を取得
    const resultData = sessionStorage.getItem('uploadResult');
    if (resultData) {
      try {
        const parsedResult = JSON.parse(resultData);
        setUploadResult(parsedResult);
        sessionStorage.removeItem('uploadResult'); // 使用後に削除
      } catch (error) {
        console.error('Failed to parse upload result:', error);
      }
    }
    setLoading(false);
  }, []);

  const getSkipReasonIcon = (reason: string) => {
    switch (reason) {
      case '重複':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'DBエラー':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSkipReasonColor = (reason: string) => {
    switch (reason) {
      case '重複':
        return 'bg-yellow-50 border-yellow-200';
      case 'DBエラー':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">結果を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/orders/shipping/pending')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            注文一覧に戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">アップロード結果</h1>
          <p className="text-gray-600">{categoryName}カテゴリの注文データ処理が完了しました</p>
        </div>

        {/* 成功サマリー */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">処理完了</h2>
              <p className="text-gray-600">{uploadResult?.message || `${categoryName}カテゴリの注文データを処理しました`}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 登録成功 */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">新規登録</h3>
              </div>
              <p className="text-2xl font-bold text-green-900">{registeredCount}件</p>
              <p className="text-sm text-green-700">正常に登録されました</p>
            </div>

            {/* スキップ */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-900">スキップ</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{skippedCount}件</p>
              <p className="text-sm text-yellow-700">重複等により除外されました</p>
            </div>
          </div>
        </div>

        {/* スキップ詳細 */}
        {uploadResult && uploadResult.skipped_details && uploadResult.skipped_details.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">スキップされた注文の詳細</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">スキップ理由</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">注文番号</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">顧客名</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">金額</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">注文日</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResult.skipped_details.map((item, index) => (
                    <tr key={index} className={`border-b border-gray-100 ${getSkipReasonColor(item.reason)}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getSkipReasonIcon(item.reason)}
                          <span className="font-medium text-sm">{item.reason}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{item.order_code}</td>
                      <td className="py-3 px-4">{item.customer_name}</td>
                      <td className="py-3 px-4">{formatPrice(item.price)}</td>
                      <td className="py-3 px-4">{formatDate(item.order_date)}</td>
                      <td className="py-3 px-4">
                        {item.reason === '重複' && item.existing_data && (
                          <div className="text-xs text-gray-600">
                            <p>既存: {item.existing_data.customer_name}</p>
                            <p>{formatPrice(item.existing_data.price)} ({formatDate(item.existing_data.order_date)})</p>
                          </div>
                        )}
                        {item.error_message && (
                          <div className="text-xs text-red-600">
                            {item.error_message}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* アクション */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/orders/shipping/pending')}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            注文一覧を確認する
          </button>
          <button
            onClick={() => router.push(`/orders/register/choose`)}
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            新しい注文を登録する
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UploadResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    }>
      <UploadResultContent />
    </Suspense>
  );
}