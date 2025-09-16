'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Edit, ArrowLeft, Package, Carrot, Apple, Coffee, ShoppingBag, Heart, Star, Leaf, Zap } from 'lucide-react';

type RegistrationType = 'csv' | 'manual';

interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  order_count: number;
}

const iconComponents = {
  Package,
  Carrot,
  Apple,
  Coffee,
  ShoppingBag,
  Heart,
  Star,
  Leaf,
  Zap
};

const colorClasses = {
  gray: 'text-gray-600',
  red: 'text-red-600',
  green: 'text-green-600',
  blue: 'text-blue-600',
  yellow: 'text-yellow-600',
  purple: 'text-purple-600',
  pink: 'text-pink-600',
  indigo: 'text-indigo-600'
};

export default function OrderRegisterChoosePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategory(categoryId);
  };

  const handleRegistrationChoice = (type: RegistrationType) => {
    if (!selectedCategory) return;
    
    if (type === 'csv') {
      router.push(`/orders/register/data-source?categoryId=${selectedCategory}`);
    } else {
      router.push(`/orders/register/manual?categoryId=${selectedCategory}`);
    }
  };

  const getIconComponent = (iconName: string) => {
    return iconComponents[iconName as keyof typeof iconComponents] || Package;
  };

  const getColorClass = (colorName: string) => {
    return colorClasses[colorName as keyof typeof colorClasses] || 'text-gray-600';
  };

  return (
    <div className="min-h-full bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">注文登録</h1>
          <p className="text-gray-600 mt-2">商品カテゴリと登録方法を選択してください</p>
        </div>

        {/* Step 1: Category Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">1. 商品カテゴリを選択</h2>
            <button
              onClick={() => router.push('/categories')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              カテゴリを管理
            </button>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-4 animate-pulse">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">カテゴリがありません</h3>
              <p className="text-gray-600 mb-4">最初のカテゴリを作成してください。</p>
              <button
                onClick={() => router.push('/categories')}
                className="btn-primary"
              >
                カテゴリを作成
              </button>
            </div>
          ) : (
            <div className={`grid gap-4 ${categories.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
              {categories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                const isSelected = selectedCategory === category.id;
                
                return (
                  <div
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                        isSelected ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${isSelected ? 'text-blue-600' : getColorClass(category.color)}`} />
                      </div>
                      <h3 className={`font-semibold mb-1 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {category.name}
                      </h3>
                      <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                        {category.description}
                      </p>
                      {category.order_count > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {category.order_count}件の注文
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Registration Method Selection */}
        <div className={`transition-opacity duration-300 ${selectedCategory ? 'opacity-100' : 'opacity-50'}`}>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. 登録方法を選択</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CSV Upload */}
            <div 
              onClick={() => handleRegistrationChoice('csv')}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-shadow ${
                selectedCategory 
                  ? 'cursor-pointer hover:shadow-md group' 
                  : 'cursor-not-allowed opacity-75'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  selectedCategory ? 'group-hover:bg-blue-200' : ''
                }`}>
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
              onClick={() => handleRegistrationChoice('manual')}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-shadow ${
                selectedCategory 
                  ? 'cursor-pointer hover:shadow-md group' 
                  : 'cursor-not-allowed opacity-75'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  selectedCategory ? 'group-hover:bg-green-200' : ''
                }`}>
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
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 登録の流れ</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>ステップ1</strong>: 登録する商品のカテゴリを選択</li>
            <li>• <strong>ステップ2</strong>: 登録方法（CSV / 手動）を選択</li>
            <li>• カテゴリごとに最適化された確認画面が表示されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}