'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Keyboard, ChevronRight, ShoppingCart, Leaf } from 'lucide-react';

type RegistrationMethod = 'csv' | 'manual';
type CsvDataSource = 'tabechoku' | 'colormi';

export default function DataSourcePage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<RegistrationMethod | null>(null);
  const [selectedCsvSource, setSelectedCsvSource] = useState<CsvDataSource | null>(null);

  const handleNext = () => {
    if (!selectedMethod) return;

    if (selectedMethod === 'csv') {
      if (!selectedCsvSource) return;
      router.push(`/orders/register/csv-upload?dataSource=${selectedCsvSource}`);
    } else {
      router.push('/orders/register/manual');
    }
  };

  const canProceed = selectedMethod === 'manual' || (selectedMethod === 'csv' && selectedCsvSource);

  const registrationMethods = [
    {
      id: 'csv' as RegistrationMethod,
      name: 'CSVファイル',
      description: 'CSVファイルをアップロードして一括登録',
      icon: FileText,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'manual' as RegistrationMethod,
      name: '手動入力',
      description: 'フォームに直接入力して個別登録',
      icon: Keyboard,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  const csvDataSources = [
    {
      id: 'tabechoku' as CsvDataSource,
      name: '食べチョク',
      description: '食べチョクからエクスポートしたCSVファイル',
      icon: Leaf,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'colormi' as CsvDataSource,
      name: 'カラーミーショップ',
      description: 'カラーミーショップからエクスポートしたCSVファイル',
      icon: ShoppingCart,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">注文データの登録方法を選択</h1>
          <p className="text-gray-600">
            注文データをどのように登録しますか？
          </p>
        </div>

        {/* Step 1: Registration Method Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ステップ 1: 登録方法を選択</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registrationMethods.map((method) => {
              const IconComponent = method.icon;
              const isSelected = selectedMethod === method.id;

              return (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedMethod(method.id);
                    if (method.id === 'manual') {
                      setSelectedCsvSource(null);
                    }
                  }}
                  className={`
                    p-6 rounded-xl border-2 text-left transition-all
                    ${isSelected
                      ? `${method.borderColor} ${method.bgColor} shadow-md`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isSelected ? method.bgColor : 'bg-gray-100'}
                    `}>
                      <IconComponent className={`w-6 h-6 ${isSelected ? method.iconColor : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-2 ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                        {method.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: CSV Data Source Selection (only shown when CSV is selected) */}
        {selectedMethod === 'csv' && (
          <div className="mb-8 animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ステップ 2: データソースを選択</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {csvDataSources.map((source) => {
                const IconComponent = source.icon;
                const isSelected = selectedCsvSource === source.id;

                return (
                  <button
                    key={source.id}
                    onClick={() => setSelectedCsvSource(source.id)}
                    className={`
                      p-6 rounded-xl border-2 text-left transition-all
                      ${isSelected
                        ? `${source.borderColor} ${source.bgColor} shadow-md`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                        ${isSelected ? source.bgColor : 'bg-gray-100'}
                      `}>
                        <IconComponent className={`w-6 h-6 ${isSelected ? source.iconColor : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-2 ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                          {source.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {source.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/orders/shipping/pending')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← キャンセル
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
              ${canProceed
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            次へ
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
