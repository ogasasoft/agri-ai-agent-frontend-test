'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Package, AlertCircle, Carrot, Apple, Coffee, ShoppingBag, Heart, Star, Leaf, Zap } from 'lucide-react';
import { OrderList } from '@/components/OrderList';
import { OrderFilters } from '@/components/OrderFilters';
import ShippingLabelButton from '@/components/ShippingLabelButton';
import YamatoCsvButton from '@/components/YamatoCsvButton';
import type { Order, OrderFilters as FilterType } from '@/types/order';
import type { YamatoApiResponse } from '@/types/yamato';

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

export default function ShippingPendingPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterType>({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    hasDeliveryDate: 'all',
    hasMemo: 'all'
  });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchOrders();
    fetchCategories();
  }, []);

  const fetchOrders = async () => {
    try {
      // セッショントークンを取得
      const sessionToken = document.cookie.split('session_token=')[1]?.split(';')[0];
      
      const response = await fetch('/api/orders', {
        credentials: 'include', // クッキーを含める
        headers: {
          'x-session-token': sessionToken || ''
        }
      });
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

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('カテゴリデータの取得に失敗しました:', error);
    }
  };

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    // 発送済みは除外
    if (order.status === 'shipped' || order.status === 'delivered') return false;
    
    // カテゴリフィルター
    if (categoryFilter !== 'all' && order.category_id !== categoryFilter) return false;
    
    if (filters.dateFrom && order.order_date < filters.dateFrom) return false;
    if (filters.dateTo && order.order_date > filters.dateTo) return false;
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.hasDeliveryDate === 'yes' && !order.delivery_date) return false;
    if (filters.hasDeliveryDate === 'no' && order.delivery_date) return false;
    if (filters.hasMemo === 'yes' && !order.has_memo) return false;
    if (filters.hasMemo === 'no' && order.has_memo) return false;
    return true;
  }) : [];

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

  const handleCsvGenerated = (orderIds: number[]) => {
    // CSV生成後、発送確認画面に遷移
    router.push(`/orders/shipping/confirm?orderIds=${orderIds.join(',')}`);
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
            <YamatoCsvButton
              selectedOrders={filteredOrders.filter(order => 
                selectedOrders.includes(order.id.toString())
              )}
              onCsvGenerated={handleCsvGenerated}
            />
            <ShippingLabelButton
              selectedOrders={filteredOrders.filter(order => 
                selectedOrders.includes(order.id.toString())
              )}
              onShippingComplete={handleShippingComplete}
              buttonText="発送書類作成"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        {/* Category Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">商品カテゴリ</label>
          <div className="flex gap-2 flex-wrap">
            {/* All categories button */}
            <button
              onClick={() => setCategoryFilter('all')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Package className={`w-4 h-4 ${categoryFilter === 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className="text-sm">すべて</span>
            </button>
            
            {/* Dynamic category buttons */}
            {categories.map((category) => {
              const IconComponent = iconComponents[category.icon as keyof typeof iconComponents] || Package;
              const isSelected = categoryFilter === category.id;
              const orderCount = Array.isArray(orders) ? orders.filter(o => o.category_id === category.id && o.status !== 'shipped' && o.status !== 'delivered').length : 0;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 ${isSelected ? 'text-blue-600' : colorClasses[category.color as keyof typeof colorClasses] || 'text-gray-600'}`} />
                  <span className="text-sm">{category.name}</span>
                  {orderCount > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {orderCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <OrderFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">発送対象注文がありません</h3>
            <p className="text-gray-600">
              {!Array.isArray(orders) || orders.length === 0 
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