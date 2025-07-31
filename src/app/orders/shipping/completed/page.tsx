'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Calendar, ArrowLeft, Search } from 'lucide-react';
import { OrderList } from '@/components/OrderList';
import { OrderFilters } from '@/components/OrderFilters';
import type { Order, OrderFilters as FilterType } from '@/types/order';

export default function ShippingCompletedPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterType>({
    dateFrom: '',
    dateTo: '',
    status: 'shipped', // デフォルトで発送済みを選択
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
      
      // APIレスポンスの構造に応じて配列を設定
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error('予期しないAPIレスポンス形式:', data);
        setOrders([]);
      }
    } catch (error) {
      console.error('注文データの取得に失敗しました:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    // 発送済みまたは配達完了のみ表示
    if (order.status !== 'shipped' && order.status !== 'delivered') return false;
    
    if (filters.dateFrom && order.order_date < filters.dateFrom) return false;
    if (filters.dateTo && order.order_date > filters.dateTo) return false;
    if (filters.status !== 'all' && filters.status !== 'shipped' && order.status !== filters.status) return false;
    if (filters.hasDeliveryDate === 'yes' && !order.delivery_date) return false;
    if (filters.hasDeliveryDate === 'no' && order.delivery_date) return false;
    if (filters.hasMemo === 'yes' && !order.has_memo) return false;
    if (filters.hasMemo === 'no' && order.has_memo) return false;
    return true;
  }) : [];

  const shippedOrders = filteredOrders.filter(order => order.status === 'shipped');
  const deliveredOrders = filteredOrders.filter(order => order.status === 'delivered');

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
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/orders/shipping/pending')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              発送対象に戻る
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">発送済み注文</h1>
              <p className="text-sm text-gray-600 mt-1">
                発送済み: {filteredOrders.length}件
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={selectedOrders.length === 0}
            >
              <Search className="w-4 h-4" />
              配送状況確認 ({selectedOrders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <OrderFilters 
          filters={filters} 
          onFiltersChange={setFilters}
          hideStatusFilter={true} // 発送済み画面では状態フィルターを隠す
        />
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">発送済み注文がありません</h3>
            <p className="text-gray-600">
              まだ発送済みの注文がありません。
            </p>
          </div>
        </div>
      )}

      {/* Two-pane order list */}
      {filteredOrders.length > 0 && (
        <div className="flex-1 flex overflow-hidden">
          {/* Shipped orders */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <Package className="w-4 h-4" />
                <span className="font-medium">発送済み ({shippedOrders.length}件)</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <OrderList
                orders={shippedOrders}
                selectedOrders={selectedOrders}
                onSelectionChange={setSelectedOrders}
                showShippingInfo={true}
              />
            </div>
          </div>

          {/* Delivered orders */}
          <div className="flex-1 flex flex-col">
            <div className="bg-green-50 px-4 py-3 border-b border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">配達完了 ({deliveredOrders.length}件)</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <OrderList
                orders={deliveredOrders}
                selectedOrders={selectedOrders}
                onSelectionChange={setSelectedOrders}
                showShippingInfo={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}