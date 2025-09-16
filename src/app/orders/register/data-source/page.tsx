'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Database, Package, CheckCircle } from 'lucide-react';
import { Suspense } from 'react';

type DataSource = 'tabechoku' | 'colormi';

interface DataSourceInfo {
  id: DataSource;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
  requiredFields: string[];
  sampleHeaders: string[];
}

const dataSourceInfo: Record<DataSource, DataSourceInfo> = {
  tabechoku: {
    id: 'tabechoku',
    name: 'たべちょく',
    description: '産直ECプラットフォームの注文データ',
    icon: FileText,
    color: 'text-green-600',
    features: [
      '農産物直販に最適化',
      'シンプルなデータ構造',
      '配送日指定対応'
    ],
    requiredFields: [
      '注文番号（order_code）',
      '顧客名（customer_name）',
      '金額（price）',
      '住所（address）'
    ],
    sampleHeaders: [
      '注文番号', '顧客名', '電話番号', '住所', 
      '金額', '注文日', '希望配達日', '備考'
    ]
  },
  colormi: {
    id: 'colormi',
    name: 'カラーミー',
    description: 'カラーミーショップの受注データ',
    icon: Database,
    color: 'text-blue-600',
    features: [
      'EC総合プラットフォーム',
      '詳細な顧客情報',
      '豊富なデータ項目'
    ],
    requiredFields: [
      '売上ID（注文番号）',
      '購入者名前（顧客名）',
      '購入単価（金額）',
      '購入者住所（住所）'
    ],
    sampleHeaders: [
      '売上ID', '受注日', '購入者 名前', '購入者 郵便番号',
      '購入者 都道府県', '購入者 住所', '購入者 電話番号', 
      '購入単価', '購入数量'
    ]
  }
};

function DataSourceSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');

  useEffect(() => {
    // カテゴリ名を取得
    if (categoryId) {
      fetchCategoryName(categoryId);
    }
  }, [categoryId]);

  const fetchCategoryName = async (categoryId: string) => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      
      if (data.success) {
        const category = data.categories.find((cat: any) => cat.id === parseInt(categoryId));
        if (category) {
          setCategoryName(category.name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch category:', error);
    }
  };

  const handleDataSourceSelect = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
  };

  const handleContinue = () => {
    if (!selectedDataSource || !categoryId) return;
    
    router.push(`/orders/register/csv-upload?categoryId=${categoryId}&dataSource=${selectedDataSource}`);
  };

  const handleBack = () => {
    router.push('/orders/register/choose');
  };

  return (
    <div className="min-h-full bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            登録方法選択に戻る
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">データソース選択</h1>
          <p className="text-gray-600">
            {categoryName && `「${categoryName}」カテゴリの`}CSVデータの形式を選択してください
          </p>
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
          <div className="w-16 h-0.5 bg-blue-500 mx-4"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-medium">
              3
            </div>
            <span className="ml-2 text-sm font-medium text-blue-600">データソース選択</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-500 rounded-full text-sm font-medium">
              4
            </div>
            <span className="ml-2 text-sm text-gray-500">CSVアップロード</span>
          </div>
        </div>

        {/* Data Source Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {(Object.entries(dataSourceInfo) as [DataSource, DataSourceInfo][]).map(([id, info]) => {
            const IconComponent = info.icon;
            const isSelected = selectedDataSource === id;
            
            return (
              <div
                key={id}
                onClick={() => handleDataSourceSelect(id)}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${isSelected ? 'text-blue-600' : info.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-xl font-semibold mb-1 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {info.name}
                      </h3>
                      <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                        {info.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Features */}
                  <div className="mb-4">
                    <h4 className={`font-medium mb-2 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      特徴
                    </h4>
                    <ul className="space-y-1">
                      {info.features.map((feature, index) => (
                        <li key={index} className={`text-sm flex items-center gap-2 ${
                          isSelected ? 'text-blue-700' : 'text-gray-600'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-blue-500' : 'bg-gray-400'
                          }`}></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Required Fields */}
                  <div className="mb-4">
                    <h4 className={`font-medium mb-2 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      必須項目
                    </h4>
                    <ul className="space-y-1">
                      {info.requiredFields.map((field, index) => (
                        <li key={index} className={`text-sm flex items-center gap-2 ${
                          isSelected ? 'text-blue-700' : 'text-gray-600'
                        }`}>
                          <Package className="w-3 h-3" />
                          {field}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Sample Headers */}
                  <div className="mt-auto">
                    <h4 className={`font-medium mb-2 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      CSVヘッダー例
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {info.sampleHeaders.slice(0, 6).map((header, index) => (
                        <span 
                          key={index}
                          className={`px-2 py-1 rounded text-xs ${
                            isSelected 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {header}
                        </span>
                      ))}
                      {info.sampleHeaders.length > 6 && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          isSelected 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          ...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!selectedDataSource}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              selectedDataSource
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedDataSource 
              ? `${dataSourceInfo[selectedDataSource].name}形式でアップロード` 
              : 'データソースを選択してください'
            }
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 データソース選択について</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• お使いのECプラットフォームに合わせてデータソースを選択してください</li>
            <li>• 各データソースは異なるCSVヘッダー形式に対応しています</li>
            <li>• 必須項目が不足している場合、アップロード時にエラーが表示されます</li>
            <li>• 不明な場合は、CSVファイルのヘッダー行を確認してから選択してください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function DataSourceSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    }>
      <DataSourceSelectionContent />
    </Suspense>
  );
}