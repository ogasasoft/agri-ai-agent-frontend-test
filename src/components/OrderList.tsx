'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertCircle, MessageSquare } from 'lucide-react';
import type { Order } from '@/types/order';

interface OrderListProps {
  orders: Order[];
  selectedOrders: string[];
  onSelectionChange: (selected: string[]) => void;
}

export function OrderList({ orders, selectedOrders, onSelectionChange }: OrderListProps) {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allOrderIds = orders.map(order => order.id.toString());
      const uniqueOrderIds = Array.from(new Set([...selectedOrders, ...allOrderIds]));
      onSelectionChange(uniqueOrderIds);
    } else {
      const orderIds = orders.map(order => order.id.toString());
      onSelectionChange(selectedOrders.filter(id => !orderIds.includes(id)));
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedOrders, orderId]);
    } else {
      onSelectionChange(selectedOrders.filter(id => id !== orderId));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '未処理';
      case 'processing':
        return '処理中';
      case 'shipped':
        return '発送済';
      case 'delivered':
        return '配達完了';
      default:
        return status;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>該当する注文がありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700">
            すべて選択 ({orders.length}件)
          </span>
        </label>
      </div>

      {/* Order list */}
      <div className="divide-y divide-gray-200">
        {orders.map((order) => {
          const isSelected = selectedOrders.includes(order.id.toString());
          
          return (
            <div
              key={order.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                order.has_memo ? 'highlight-memo' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleSelectOrder(order.id.toString(), e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                
                <div className="flex-1 min-w-0">
                  {/* Order number and status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {order.order_number}
                      </span>
                      {order.has_memo && (
                        <MessageSquare className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  
                  {/* Customer and amount */}
                  <div className="text-sm text-gray-600 mb-2">
                    <div className="flex justify-between">
                      <span>{order.customer_name_masked}</span>
                      <span className="font-medium">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                  
                  {/* Dates */}
                  <div className="text-sm text-gray-500">
                    <div className="flex justify-between">
                      <span>
                        注文日: {format(new Date(order.order_date), 'MM/dd', { locale: ja })}
                      </span>
                      {order.delivery_date && (
                        <span>
                          希望日: {format(new Date(order.delivery_date), 'MM/dd', { locale: ja })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}