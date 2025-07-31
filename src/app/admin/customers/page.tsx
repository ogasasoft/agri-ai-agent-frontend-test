'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit, Trash2, Eye, Download, 
  Filter, MoreHorizontal, User, Mail, Phone, MapPin 
} from 'lucide-react';

interface Customer {
  id: number;
  customer_name: string;
  phone?: string;
  address?: string;
  email?: string;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
  user_id: number;
  username: string;
}

export default function CustomersManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/admin/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: number) => {
    if (!confirm('この顧客データを削除しますか？')) return;

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCustomers(customers.filter(c => c.id !== customerId));
      } else {
        alert('削除に失敗しました。');
      }
    } catch (error) {
      alert('削除中にエラーが発生しました。');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.length === 0) return;
    if (!confirm(`選択した${selectedCustomers.length}件の顧客データを削除しますか？`)) return;

    try {
      const response = await fetch('/api/admin/customers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: selectedCustomers })
      });

      if (response.ok) {
        setCustomers(customers.filter(c => !selectedCustomers.includes(c.id)));
        setSelectedCustomers([]);
      } else {
        alert('一括削除に失敗しました。');
      }
    } catch (error) {
      alert('削除中にエラーが発生しました。');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
            顧客管理
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            システム内のすべての顧客データを管理できます
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <Plus className="h-4 w-4" />
            新規顧客追加
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="顧客名、電話番号、住所、ユーザー名で検索..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            フィルター
          </button>
          <button className="inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Download className="h-4 w-4" />
            エクスポート
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedCustomers.length}件の顧客が選択されています
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-x-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
              >
                <Trash2 className="h-4 w-4" />
                一括削除
              </button>
              <button
                onClick={() => setSelectedCustomers([])}
                className="inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                選択解除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={selectedCustomers.length === filteredCustomers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomers(filteredCustomers.map(c => c.id));
                      } else {
                        setSelectedCustomers([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顧客情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  連絡先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注文統計
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  所属ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録日
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomers([...selectedCustomers, customer.id]);
                        } else {
                          setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {customer.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {customer.phone && (
                        <div className="flex items-center text-sm text-gray-700">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center text-sm text-gray-700">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          {customer.email}
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center text-sm text-gray-700">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="truncate max-w-xs">{customer.address}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.total_orders}件の注文
                      </div>
                      <div className="text-sm text-gray-500">
                        総額: ¥{customer.total_spent.toLocaleString()}
                      </div>
                      {customer.last_order_date && (
                        <div className="text-xs text-gray-400">
                          最終: {new Date(customer.last_order_date).toLocaleDateString('ja-JP')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.username}</div>
                    <div className="text-sm text-gray-500">ID: {customer.user_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {/* View details */}}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingCustomer(customer)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">顧客データなし</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? '検索条件に一致する顧客が見つかりません。' : 'まだ顧客データが登録されていません。'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            前へ
          </button>
          <button className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            次へ
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{filteredCustomers.length}</span> 件の顧客
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}