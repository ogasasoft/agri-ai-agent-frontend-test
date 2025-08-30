'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, TrendingUp, Package, DollarSign, Download, Lightbulb, AlertTriangle, Info, TrendingDown } from 'lucide-react';

// Charts コンポーネントを動的インポートでSSRから除外
const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), { 
  ssr: false,
  loading: () => <div className="w-full h-64 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
});
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

interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'trend';
  title: string;
  message: string;
  suggestion?: string;
  priority: 'high' | 'medium' | 'low';
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
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

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
      
      // AI分析を実行
      await fetchAIInsights(newStats, mockProductStats);
      
    } catch (error) {
      console.error('ダッシュボードデータの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async (stats: DashboardStats, productStats: ProductStats[]) => {
    setInsightsLoading(true);
    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stats,
          productStats,
          dateRange
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiInsights(data.insights || []);
      }
    } catch (error) {
      console.error('AI分析の取得に失敗しました:', error);
    } finally {
      setInsightsLoading(false);
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

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return <Package className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'trend':
        return <TrendingUp className="w-5 h-5 text-purple-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-gray-500" />;
    }
  };

  const getInsightBgColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'trend':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const statusColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  
  // Create status data for charts
  const statusData = [
    { name: '処理中', value: stats.pendingOrders },
    { name: '配送済み', value: stats.deliveredOrders },
    { name: '合計', value: stats.totalOrders }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Main Content */}
      <div className="space-y-6">
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
                onClick={() => setShowAIModal(true)}
                className="btn-secondary flex items-center gap-2 mr-3"
              >
                <Lightbulb className="w-4 h-4" />
                AI提案
                {aiInsights.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {aiInsights.length}
                  </span>
                )}
              </button>
              
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
        <DashboardCharts 
          productStats={productStats} 
          statusData={statusData}
        />

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

      {/* AI Insights Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] mx-4 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">AI提案</h2>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">データ分析に基づく改善提案</p>
              
              {insightsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-sm text-gray-500">分析中...</span>
                </div>
              ) : aiInsights.length > 0 ? (
                <div className="space-y-4">
                  {aiInsights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getInsightBgColor(insight.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm mb-1">
                            {insight.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {insight.message}
                          </p>
                          {insight.suggestion && (
                            <div className="bg-white bg-opacity-50 rounded p-3 mb-2">
                              <p className="text-sm text-gray-700 font-medium">
                                💡 提案: {insight.suggestion}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              insight.priority === 'high' 
                                ? 'bg-red-100 text-red-600' 
                                : insight.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              優先度: {insight.priority === 'high' ? '高' : insight.priority === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    AI提案はまだありません
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    注文データが蓄積されると、改善提案が表示されます
                  </p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAIModal(false)}
                className="btn-secondary"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}