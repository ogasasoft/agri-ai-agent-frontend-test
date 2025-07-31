'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Carrot, Apple, Package, Calendar, User, Phone, MapPin, DollarSign, FileText, Upload, Edit } from 'lucide-react';
import { Suspense } from 'react';

type ProductCategory = 'vegetables' | 'fruits' | 'other';
type RegistrationMethod = 'csv' | 'manual';

interface CategoryInfo {
  id: ProductCategory;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  successMessage: string;
  nextSteps: string[];
}

const categoryInfo: Record<ProductCategory, CategoryInfo> = {
  vegetables: {
    id: 'vegetables',
    name: '野菜',
    description: '新鮮な野菜の注文',
    icon: Carrot,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    successMessage: '野菜の注文登録が完了しました！新鮮な野菜の受注処理を開始できます。',
    nextSteps: [
      '発送待ちの注文一覧で注文状況を確認',
      '在庫状況に応じて配送日を調整',
      '品質チェック後に発送処理を実行'
    ]
  },
  fruits: {
    id: 'fruits',
    name: '果物',
    description: '新鮮な果物の注文',
    icon: Apple,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    successMessage: '果物の注文登録が完了しました！旬の果物の受注処理を開始できます。',
    nextSteps: [
      '発送待ちの注文一覧で注文状況を確認',
      '収穫時期に応じて配送スケジュールを調整',  
      '熟成状態をチェック後に発送処理を実行'
    ]
  },
  other: {
    id: 'other',
    name: 'その他',
    description: '加工品・その他商品の注文',
    icon: Package,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    successMessage: 'その他商品の注文登録が完了しました！加工品・特産品の受注処理を開始できます。',
    nextSteps: [
      '発送待ちの注文一覧で注文状況を確認',
      '商品の在庫状況と賞味期限を確認',
      '適切な梱包方法で発送処理を実行'
    ]
  }
};

interface OrderSummary {
  orderCode: string;
  customerName: string;
  phone: string;
  address: string;
  price: number;
  orderDate: string;
  deliveryDate: string | null;
  notes: string;
  registrationCount?: number; // CSV upload の場合
}

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = (searchParams.get('category') as ProductCategory) || 'other';
  const orderCode = searchParams.get('orderCode') || '';
  const method = (searchParams.get('method') as RegistrationMethod) || 'manual';
  const registrationCount = searchParams.get('count') ? parseInt(searchParams.get('count')!) : undefined;
  
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const categoryData = categoryInfo[category];
  const IconComponent = categoryData.icon;

  useEffect(() => {
    const fetchOrderSummary = async () => {
      if (method === 'csv') {
        // CSV の場合は登録数のみ表示
        setOrderSummary({
          orderCode: '',
          customerName: '',
          phone: '',
          address: '',
          price: 0,
          orderDate: '',
          deliveryDate: null,
          notes: '',
          registrationCount: registrationCount || 0
        });
        setLoading(false);
        return;
      }

      if (orderCode) {
        try {
          const response = await fetch(`/api/orders?search=${orderCode}`);
          const data = await response.json();
          
          if (data.success && data.orders.length > 0) {
            const order = data.orders[0];
            setOrderSummary({
              orderCode: order.order_code,
              customerName: order.customer_name,
              phone: order.phone || '',
              address: order.address || '',
              price: order.price,
              orderDate: order.order_date,
              deliveryDate: order.delivery_date,
              notes: order.notes || ''
            });
          }
        } catch (error) {
          console.error('Failed to fetch order:', error);
        }
      }
      setLoading(false);
    };

    fetchOrderSummary();
  }, [orderCode, method, registrationCount]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未設定';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">注文情報を読み込み中...</p>
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
            onClick={() => router.push('/orders/register/choose')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            新規登録に戻る
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${categoryData.bgColor}`}>
              <IconComponent className={`w-6 h-6 ${categoryData.color}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">登録完了</h1>
              <p className="text-gray-600">{categoryData.name}の注文登録が完了しました</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className={`rounded-lg border p-6 mb-8 ${categoryData.bgColor} border-green-200`}>
          <div className="flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-green-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                {method === 'csv' ? 'CSV一括登録完了' : '手動登録完了'}
              </h2>
              <p className="text-green-800 mb-4">{categoryData.successMessage}</p>
              
              {method === 'csv' && orderSummary?.registrationCount !== undefined && (
                <div className="bg-white rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">登録結果</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{orderSummary.registrationCount} 件</p>
                  <p className="text-sm text-gray-600">新規注文が登録されました</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary (手動登録の場合のみ) */}
        {method === 'manual' && orderSummary && orderSummary.orderCode && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5" />
              登録内容
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">注文番号</label>
                  <p className="text-gray-900 font-medium">{orderSummary.orderCode}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">顧客名</label>
                  <p className="text-gray-900">{orderSummary.customerName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">電話番号</label>
                  <p className="text-gray-900">{orderSummary.phone || '未設定'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">住所</label>
                  <p className="text-gray-900">{orderSummary.address || '未設定'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">金額</label>
                  <p className="text-gray-900 font-medium text-lg">{formatPrice(orderSummary.price)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">注文日</label>
                  <p className="text-gray-900">{formatDate(orderSummary.orderDate)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">希望配達日</label>
                  <p className="text-gray-900">{formatDate(orderSummary.deliveryDate)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">備考</label>
                  <p className="text-gray-900">{orderSummary.notes || '未設定'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">📋 次のステップ</h3>
          <ul className="space-y-2">
            {categoryData.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-blue-800">
                <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                  {index + 1}
                </span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/orders/shipping/pending')}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            発送待ちの注文を確認
          </button>
          
          <button
            onClick={() => router.push('/orders/register/choose')}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            続けて登録する
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}