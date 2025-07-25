'use client';

import { useRouter } from 'next/navigation';
import { Upload, Edit, ArrowLeft } from 'lucide-react';

export default function OrderRegisterChoosePage() {
  const router = useRouter();

  const handleChoice = (type: 'csv' | 'manual') => {
    if (type === 'csv') {
      router.push('/upload');
    } else {
      router.push('/orders/new');
    }
  };

  return (
    <div className="min-h-full bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">注文登録方法の選択</h1>
          <p className="text-gray-600 mt-2">注文データの登録方法を選択してください</p>
        </div>

        {/* Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CSV Upload */}
          <div 
            onClick={() => handleChoice('csv')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">CSVアップロード</h3>
              <p className="text-gray-600 mb-4">
                複数の注文データを一括で登録できます。事前にCSVファイルを準備してください。
              </p>
              <div className="text-sm text-gray-500">
                推奨: 大量データの一括登録
              </div>
            </div>
          </div>

          {/* Manual Entry */}
          <div 
            onClick={() => handleChoice('manual')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <Edit className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">手動登録</h3>
              <p className="text-gray-600 mb-4">
                フォームに直接入力して注文データを登録できます。1件ずつの登録に適しています。
              </p>
              <div className="text-sm text-gray-500">
                推奨: 少数データの個別登録
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 登録方法の選び方</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>CSVアップロード</strong>: 10件以上の注文データがある場合</li>
            <li>• <strong>手動登録</strong>: 1〜数件の注文データを登録する場合</li>
          </ul>
        </div>
      </div>
    </div>
  );
}