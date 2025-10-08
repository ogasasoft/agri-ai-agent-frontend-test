'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Package, User, Phone, MapPin, Calendar, FileText, ArrowLeft } from 'lucide-react';
import type { Order } from '@/types/order';

function ShippingConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'normal' | 'cool' | 'frozen'>('normal');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const orderIdsParam = searchParams.get('orderIds');
    const deliveryTypeParam = searchParams.get('deliveryType') as 'normal' | 'cool' | 'frozen';
    const notesParam = searchParams.get('notes');

    if (deliveryTypeParam) setDeliveryType(deliveryTypeParam);
    if (notesParam) setNotes(decodeURIComponent(notesParam));

    if (orderIdsParam) {
      const orderIds = orderIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (orderIds.length > 0) {
        fetchOrders(orderIds);
      } else {
        router.push('/orders/shipping/pending');
      }
    } else {
      router.push('/orders/shipping/pending');
    }
  }, [searchParams, router]);

  const fetchOrders = async (orderIds: number[]) => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      
      let allOrders = [];
      if (data.success && Array.isArray(data.orders)) {
        allOrders = data.orders;
      } else if (Array.isArray(data)) {
        allOrders = data;
      }

      // 指定されたIDの注文のみをフィルタリング
      const targetOrders = allOrders.filter((order: Order) => 
        orderIds.includes(order.id)
      );
      
      setOrders(targetOrders);
    } catch (error) {
      console.error('注文データの取得に失敗しました:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShipping = async () => {
    if (orders.length === 0) return;

    setConfirming(true);

    try {
      // Get authentication tokens from cookies
      const sessionToken = document.cookie.split('session_token=')[1]?.split(';')[0] || '';
      const csrfToken = document.cookie.split('csrf_token=')[1]?.split(';')[0] || '';

      const response = await fetch('/api/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          order_ids: orders.map(o => o.id),
          delivery_type: deliveryType,
          notes
        }),
      });

      if (!response.ok) {
        throw new Error('発送処理に失敗しました');
      }

      const result = await response.json();

      if (result.success) {
        // 成功した注文IDを取得して完了画面に遷移
        const successOrderIds = orders.map(o => o.id).join(',');
        router.push(`/orders/shipping/complete?orderIds=${successOrderIds}`);
      } else {
        alert('発送処理に失敗しました: ' + (result.message || '不明なエラー'));
      }

    } catch (error) {
      console.error('発送確認の処理に失敗しました:', error);
      alert('発送確認の処理に失敗しました。もう一度お試しください。');
    } finally {
      setConfirming(false);
    }
  };

  const getDeliveryTypeText = (type: string) => {
    switch (type) {
      case 'normal': return '常温';
      case 'cool': return '冷蔵';
      case 'frozen': return '冷凍';
      default: return type;
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return address.length > 30 ? address.substring(0, 30) + '...' : address;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '指定なし';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">注文が見つかりません</h3>
          <p className="text-gray-600 mb-4">指定された注文データが存在しません。</p>
          <button
            onClick={() => router.push('/orders/shipping/pending')}
            className="btn-primary"
          >
            発送待一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/orders/shipping/pending')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">発送確認</h1>
              <p className="text-sm text-gray-600 mt-1">
                以下の {orders.length} 件の注文を発送済みにします
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/orders/shipping/pending')}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirmShipping}
              disabled={confirming}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                confirming
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              }`}
            >
              {confirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>処理中...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>発送処理を実行</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-auto p-6">
        {/* 配送設定 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">配送設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                配送タイプ
              </label>
              <div className="bg-gray-50 px-4 py-2 rounded-lg">
                <span className="text-gray-900">{getDeliveryTypeText(deliveryType)}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                注文件数
              </label>
              <div className="bg-gray-50 px-4 py-2 rounded-lg">
                <span className="text-gray-900">{orders.length}件</span>
              </div>
            </div>
          </div>
          {notes && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <div className="bg-gray-50 px-4 py-2 rounded-lg">
                <span className="text-gray-900">{notes}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Package className="w-5 h-5" />
            <span className="font-medium">発送前の最終確認</span>
          </div>
          <p className="text-sm text-blue-600">
            以下の内容で発送処理を実行します。内容をご確認の上、「発送処理を実行」ボタンを押してください。<br />
            処理後は注文ステータスが「発送済み」に変更されます。
          </p>
        </div>

        <div className="space-y-4">
          {orders.map((order, index) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      注文番号: {order.order_number || `#${order.id}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      注文日: {new Date(order.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ¥{order.total_amount?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 顧客情報 */}
                <div>
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                      <Phone className="w-3 h-3" />
                      <span>{order.customer_phone}</span>
                    </div>
                  )}
                  {order.customer_address && (
                    <div className="flex items-start gap-2 text-gray-600 text-sm">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{formatAddress(order.customer_address)}</span>
                    </div>
                  )}
                </div>

                {/* 配送情報 */}
                <div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>到着希望日: {order.delivery_date ? formatDate(order.delivery_date) : '未指定'}</span>
                  </div>
                  {order.memo && (
                    <div className="flex items-start gap-2 text-gray-600 text-sm">
                      <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{order.memo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShippingConfirmPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>}>
      <ShippingConfirmContent />
    </Suspense>
  );
}