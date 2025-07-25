'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, Plus } from 'lucide-react';
import { Suspense } from 'react';

function CompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'manual';

  const isManual = type === 'manual';
  const isCsv = type === 'csv';

  return (
    <div className="min-h-full bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            注文登録が完了しました
          </h1>
          <p className="text-gray-600">
            {isManual && '新しい注文が正常に登録されました。'}
            {isCsv && 'CSVファイルからの注文データが正常に登録されました。'}
          </p>
        </div>

        {/* Status Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">登録方法</span>
              <span className="font-medium">
                {isManual && '手動登録'}
                {isCsv && 'CSVアップロード'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">登録日時</span>
              <span className="font-medium">
                {new Date().toLocaleString('ja-JP')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">ステータス</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                登録完了
              </span>
            </div>
          </div>
        </div>

        {/* Next Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">次にできること</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => router.push('/orders/shipping/pending')}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div>
                <h4 className="font-medium text-gray-900">注文管理画面へ</h4>
                <p className="text-sm text-gray-600">登録した注文を確認・管理できます</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => router.push('/orders/register/choose')}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div>
                <h4 className="font-medium text-gray-900">続けて注文登録</h4>
                <p className="text-sm text-gray-600">別の注文を追加で登録できます</p>
              </div>
              <Plus className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Dashboard Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderRegisterCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    }>
      <CompleteContent />
    </Suspense>
  );
}