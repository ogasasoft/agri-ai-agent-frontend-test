'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Package, AlertCircle } from 'lucide-react';
import { OrderList } from '@/components/OrderList';
import { OrderFilters } from '@/components/OrderFilters';
import ShippingLabelButton from '@/components/ShippingLabelButton';
import type { Order, OrderFilters as FilterType } from '@/types/order';
import type { YamatoApiResponse } from '@/types/yamato';

export default function ShippingPendingPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterType>({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    hasDeliveryDate: 'all',
    hasMemo: 'all'
  });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('注文データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    // 発送済みは除外
    if (order.status === 'shipped' || order.status === 'delivered') return false;
    
    if (filters.dateFrom && order.order_date < filters.dateFrom) return false;
    if (filters.dateTo && order.order_date > filters.dateTo) return false;
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.hasDeliveryDate === 'yes' && !order.delivery_date) return false;
    if (filters.hasDeliveryDate === 'no' && order.delivery_date) return false;
    if (filters.hasMemo === 'yes' && !order.has_memo) return false;
    if (filters.hasMemo === 'no' && order.has_memo) return false;
    return true;
  });

  const ordersWithDeliveryDate = filteredOrders.filter(order => order.delivery_date);
  const ordersWithoutDeliveryDate = filteredOrders.filter(order => !order.delivery_date);

  const handleShippingComplete = (response: YamatoApiResponse) => {
    // 発送完了画面に遷移
    const successOrderIds = response.results
      .filter(result => result.success)
      .map(result => result.order_id)
      .join(',');
    
    if (successOrderIds) {
      router.push(`/orders/shipping/complete?orderIds=${successOrderIds}&batchId=${response.batch_id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">発送対象注文</h1>
            <p className="text-sm text-gray-600 mt-1">
              未発送注文: {filteredOrders.length}件
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/orders/shipping/completed')}
              className="btn-secondary flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              発送済み注文を見る
            </button>
            <ShippingLabelButton
              selectedOrders={filteredOrders.filter(order => 
                selectedOrders.includes(order.id.toString())
              )}
              onShippingComplete={handleShippingComplete}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <OrderFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">発送対象注文がありません</h3>
            <p className="text-gray-600">
              {orders.length === 0 
                ? '注文データが登録されていません。' 
                : 'すべての注文が発送済みです。'
              }
            </p>
          </div>
        </div>
      )}

      {/* Two-pane order list */}
      {filteredOrders.length > 0 && (
        <div className="flex-1 flex overflow-hidden">
          {/* Orders with delivery date */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            <div className="bg-green-50 px-4 py-3 border-b border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">到着希望日あり ({ordersWithDeliveryDate.length}件)</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <OrderList
                orders={ordersWithDeliveryDate}
                selectedOrders={selectedOrders}
                onSelectionChange={setSelectedOrders}
              />
            </div>
          </div>

          {/* Orders without delivery date */}
          <div className="flex-1 flex flex-col">
            <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">到着希望日なし ({ordersWithoutDeliveryDate.length}件)</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <OrderList
                orders={ordersWithoutDeliveryDate}
                selectedOrders={selectedOrders}
                onSelectionChange={setSelectedOrders}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}