'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Carrot, Apple, Package, Calendar, User, Phone, MapPin, DollarSign, FileText } from 'lucide-react';
import { Suspense } from 'react';
import { useFormErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type ProductCategory = 'vegetables' | 'fruits' | 'other';

interface CategoryInfo {
  id: ProductCategory;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  placeholders: {
    orderCode: string;
    customerName: string;
    phone: string;
    address: string;
    price: string;
    notes: string;
  };
}

const categoryInfo: Record<ProductCategory, CategoryInfo> = {
  vegetables: {
    id: 'vegetables',
    name: '野菜',
    description: '新鮮な野菜の注文登録',
    icon: Carrot,
    color: 'text-green-600',
    placeholders: {
      orderCode: 'VEG-001',
      customerName: '田中太郎',
      phone: '090-1234-5678',
      address: '東京都渋谷区...',
      price: '1500',
      notes: 'キャベツ 2玉、にんじん 1袋'
    }
  },
  fruits: {
    id: 'fruits',
    name: '果物',
    description: '新鮮な果物の注文登録',
    icon: Apple,
    color: 'text-red-600',
    placeholders: {
      orderCode: 'FRT-001',
      customerName: '佐藤花子',
      phone: '080-9876-5432',
      address: '神奈川県横浜市...',
      price: '2800',
      notes: 'りんご 5個、みかん 1箱'
    }
  },
  other: {
    id: 'other',
    name: 'その他',
    description: '加工品・その他商品の注文登録',
    icon: Package,
    color: 'text-gray-600',
    placeholders: {
      orderCode: 'OTH-001',
      customerName: '山田次郎',
      phone: '070-1111-2222',
      address: '大阪府大阪市...',
      price: '800',
      notes: '手作り味噌 1kg'
    }
  }
};

interface FormData {
  orderCode: string;
  customerName: string;
  phone: string;
  address: string;
  price: string;
  orderDate: string;
  deliveryDate: string;
  notes: string;
}

function ManualRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = (searchParams.get('category') as ProductCategory) || 'other';
  
  const [formData, setFormData] = useState<FormData>({
    orderCode: '',
    customerName: '',
    phone: '',
    address: '',
    price: '',
    orderDate: new Date().toISOString().split('T')[0], // 今日の日付をデフォルト
    deliveryDate: '',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categoryData = categoryInfo[category];
  const IconComponent = categoryData.icon;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.orderCode.trim()) {
      newErrors.orderCode = '注文番号は必須です';
    }
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = '顧客名は必須です';
    }
    
    if (!formData.price.trim()) {
      newErrors.price = '金額は必須です';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = '有効な金額を入力してください';
    }
    
    if (!formData.orderDate) {
      newErrors.orderDate = '注文日は必須です';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get authentication tokens from cookies
      const sessionToken = document.cookie.split('session_token=')[1]?.split(';')[0] || '';
      const csrfToken = document.cookie.split('csrf_token=')[1]?.split(';')[0] || '';
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          order_code: formData.orderCode.trim(),
          customer_name: formData.customerName.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          price: Number(formData.price),
          order_date: formData.orderDate,
          delivery_date: formData.deliveryDate || null,
          notes: formData.notes.trim(),
          product_category: category,
          source: 'manual_entry'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // 成功時は確認画面に遷移
        router.push(`/orders/register/confirm?category=${category}&orderCode=${formData.orderCode}&method=manual`);
      } else {
        // Handle different error types
        if (response.status === 409) {
          // Duplicate order code
          setErrors({ orderCode: result.message || '注文番号が重複しています' });
        } else if (response.status === 400) {
          // Validation error
          setErrors({ submit: result.message || '入力データに問題があります' });
        } else {
          // Other errors
          setErrors({ submit: result.message || '登録に失敗しました' });
        }
      }
    } catch (error) {
      // AI判断型エラーハンドリング
      const errorDetails = handleSubmissionError(error, formData);
      setErrors({
        submit: errorDetails.message,
        details: errorDetails.suggestions?.join(' ') || ''
      });
    } finally {
      setIsSubmitting(false);
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
              <h1 className="text-3xl font-bold text-gray-900">{categoryData.name}の手動登録</h1>
              <p className="text-gray-600">{categoryData.description}をフォームで個別登録</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Code & Customer Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              基本情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  注文番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.orderCode}
                  onChange={(e) => handleInputChange('orderCode', e.target.value)}
                  placeholder={categoryData.placeholders.orderCode}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.orderCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.orderCode && <p className="text-red-500 text-sm mt-1">{errors.orderCode}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  顧客名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder={categoryData.placeholders.customerName}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.customerName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              連絡先情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={categoryData.placeholders.phone}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder={categoryData.placeholders.address}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              注文詳細
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金額 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder={categoryData.placeholders.price}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  注文日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => handleInputChange('orderDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.orderDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.orderDate && <p className="text-red-500 text-sm mt-1">{errors.orderDate}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">希望配達日</label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              備考
            </h2>
            
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder={categoryData.placeholders.notes}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/orders/register/choose')}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManualRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    }>
      <ManualRegistrationContent />
    </Suspense>
  );
}