'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Package, DollarSign, Download } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { Order } from '@/types/order';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

interface ProductStats {
  productName: string;
  orderCount: number;
  revenue: number;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0
  });
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch orders
      const ordersResponse = await fetch('/api/orders');
      const ordersData = await ordersResponse.json();
      
      // Filter by date range
      const filteredOrders = ordersData.filter((order: Order) => {
        const orderDate = new Date(order.order_date);
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        return orderDate >= fromDate && orderDate <= toDate;
      });

      setOrders(filteredOrders);
      
      // Calculate stats
      const newStats: DashboardStats = {
        totalOrders: filteredOrders.length,
        totalRevenue: filteredOrders.reduce((sum: number, order: Order) => sum + order.total_amount, 0),
        pendingOrders: filteredOrders.filter((order: Order) => order.status === 'pending').length,
        deliveredOrders: filteredOrders.filter((order: Order) => order.status === 'delivered').length,
      };
      setStats(newStats);

      // Generate mock product stats (in real app, this would come from order_items)
      const mockProductStats: ProductStats[] = [
        { productName: '有機野菜セット', orderCount: 45, revenue: 450000 },
        { productName: '無農薬米', orderCount: 32, revenue: 320000 },
        { productName: '季節の果物', orderCount: 28, revenue: 280000 },
        { productName: '手作り味噌', orderCount: 18, revenue: 90000 },
        { productName: '自然卵', orderCount: 25, revenue: 125000 },
      ];
      setProductStats(mockProductStats);
      
    } catch (error) {
      console.error('ダッシュボードデータの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    const csvData = productStats.map(product => [
      product.productName,
      product.orderCount,
      product.revenue
    ]);
    
    const csvContent = [
      ['商品名', '注文件数', '売上'],
      ...csvData
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `product_stats_${dateRange.from}_${dateRange.to}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const statusColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-600 mt-1">売上分析と注文統計</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="input-field text-sm"
            />
            <span className="text-gray-500">〜</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="input-field text-sm"
            />
          </div>
          
          <button
            onClick={exportToCsv}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV出力
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総注文数</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <Package className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総売上</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">未処理注文</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">配達完了</p>
              <p className="text-3xl font-bold text-green-600">{stats.deliveredOrders}</p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Sales Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">商品別注文件数</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="productName" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orderCount" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">商品別売上</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productStats}
                dataKey="revenue"
                nameKey="productName"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ productName, revenue }) => 
                  `${productName}: ${formatCurrency(revenue)}`
                }
              >
                {productStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Stats Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">商品別詳細統計</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注文件数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  売上金額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均単価
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productStats.map((product, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.orderCount}件
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(product.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(Math.round(product.revenue / product.orderCount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}