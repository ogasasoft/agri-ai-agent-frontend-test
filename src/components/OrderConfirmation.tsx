'use client';

import { Order } from '@/types/order';

interface OrderConfirmationProps {
  orderData: any;
  orderType: 'manual' | 'csv';
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function OrderConfirmation({ 
  orderData, 
  orderType, 
  onConfirm, 
  onBack, 
  isSubmitting = false 
}: OrderConfirmationProps) {
  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  
  if (orderType === 'csv') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">CSV登録内容確認</h1>
            <p className="text-sm text-gray-600 mt-1">
              以下の内容で {orderData.length} 件の注文を登録します
            </p>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">注文番号</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">顧客名</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">金額</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">注文日</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">配達希望日</th>
                  </tr>
                </thead>
                <tbody>
                  {orderData.slice(0, 5).map((order: any, index: number) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm">{order.order_number}</td>
                      <td className="px-4 py-2 text-sm">{order.customer_name}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(order.total_amount)}</td>
                      <td className="px-4 py-2 text-sm">{order.order_date}</td>
                      <td className="px-4 py-2 text-sm">{order.delivery_date || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orderData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  その他 {orderData.length - 5} 件...
                </p>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-blue-900">合計金額</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(orderData.reduce((sum: number, order: any) => sum + order.total_amount, 0))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button onClick={onBack} className="btn-secondary">
              戻る
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '登録中...' : '登録実行'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Manual order confirmation
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">注文内容確認</h1>
          <p className="text-sm text-gray-600 mt-1">
            以下の内容で注文を登録します
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">注文番号:</span>
                <span className="text-sm font-medium">{orderData.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">顧客名:</span>
                <span className="text-sm font-medium">{orderData.customer_name}</span>
              </div>
              {orderData.customer_phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">電話番号:</span>
                  <span className="text-sm font-medium">{orderData.customer_phone}</span>
                </div>
              )}
              {orderData.customer_address && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">住所:</span>
                  <span className="text-sm font-medium">{orderData.customer_address}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">注文日:</span>
                <span className="text-sm font-medium">{orderData.order_date}</span>
              </div>
              {orderData.delivery_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">配達希望日:</span>
                  <span className="text-sm font-medium">{orderData.delivery_date}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ステータス:</span>
                <span className="text-sm font-medium">
                  {orderData.status === 'pending' ? '未処理' :
                   orderData.status === 'processing' ? '処理中' :
                   orderData.status === 'shipped' ? '発送済' : '配達完了'}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">注文商品</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">商品名</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">数量</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">単価</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {orderData.items.map((item: any, index: number) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm">{item.product_name}</td>
                      <td className="px-4 py-2 text-sm">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-blue-900">合計金額</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(orderData.total_amount)}
              </span>
            </div>
          </div>

          {/* Memo */}
          {orderData.memo && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">備考</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{orderData.memo}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onBack} className="btn-secondary">
            戻る
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '登録中...' : '注文登録'}
          </button>
        </div>
      </div>
    </div>
  );
}