'use client';

import { useState, useEffect } from 'react';
import { Calendar, Package, AlertCircle, Download } from 'lucide-react';
import { OrderList } from '@/components/OrderList';
import { OrderFilters } from '@/components/OrderFilters';
import { ExportModal } from '@/components/ExportModal';
import type { Order, OrderFilters as FilterType } from '@/types/order';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterType>({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    hasDeliveryDate: 'all',
    hasMemo: 'all'
  });
  const [showExportModal, setShowExportModal] = useState(false);
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

  const handleExport = () => {
    if (selectedOrders.length === 0) {
      alert('エクスポートする注文を選択してください');
      return;
    }
    setShowExportModal(true);
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
            <h1 className="text-2xl font-semibold text-gray-900">注文管理</h1>
            <p className="text-sm text-gray-600 mt-1">
              総件数: {filteredOrders.length}件
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={selectedOrders.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              伝票CSV出力 ({selectedOrders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <OrderFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Two-pane order list */}
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
              <Package className="w-4 h-4" />
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

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          selectedOrders={selectedOrders}
          orders={filteredOrders}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}