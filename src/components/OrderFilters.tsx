'use client';

import { Filter } from 'lucide-react';
import type { OrderFilters } from '@/types/order';

interface OrderFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
}

export function OrderFilters({ filters, onFiltersChange }: OrderFiltersProps) {
  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      hasDeliveryDate: 'all',
      hasMemo: 'all'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-gray-500" />
        <span className="font-medium text-gray-900">フィルター</span>
        <button
          onClick={clearFilters}
          className="text-sm text-primary-600 hover:text-primary-700 ml-auto"
        >
          クリア
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            注文日（開始）
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="input-field w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            注文日（終了）
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="input-field w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input-field w-full text-sm"
          >
            <option value="all">すべて</option>
            <option value="pending">未処理</option>
            <option value="processing">処理中</option>
            <option value="shipped">発送済</option>
            <option value="delivered">配達完了</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            到着希望日
          </label>
          <select
            value={filters.hasDeliveryDate}
            onChange={(e) => handleFilterChange('hasDeliveryDate', e.target.value)}
            className="input-field w-full text-sm"
          >
            <option value="all">すべて</option>
            <option value="yes">あり</option>
            <option value="no">なし</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            備考
          </label>
          <select
            value={filters.hasMemo}
            onChange={(e) => handleFilterChange('hasMemo', e.target.value)}
            className="input-field w-full text-sm"
          >
            <option value="all">すべて</option>
            <option value="yes">あり</option>
            <option value="no">なし</option>
          </select>
        </div>
      </div>
    </div>
  );
}