'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  Download,
  Users,
  TrendingDown,
  ShoppingBag,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  totalShipped: number;
  totalRevenue: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  revenueGrowth: number;
  orderGrowth: number;
}

interface DailyTrend {
  date: string;
  orderCount: number;
  revenue: number;
}

interface CategoryStat {
  categoryId: number | null;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  orderCount: number;
  revenue: number;
}

interface TopCustomer {
  customerName: string;
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
}

interface CustomerAnalysis {
  newCustomers: number;
  repeatCustomers: number;
}

interface WeekdayStat {
  weekday: number;
  orderCount: number;
  revenue: number;
}

interface DashboardData {
  stats: DashboardStats;
  dailyTrend: DailyTrend[];
  categoryStats: CategoryStat[];
  topCustomers: TopCustomer[];
  customerAnalysis: CustomerAnalysis;
  weekdayStats: WeekdayStat[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDateRange();
  }, []);

  const initializeDateRange = async () => {
    try {
      const sessionToken = document.cookie.split('session_token=')[1]?.split(';')[0];

      const response = await fetch('/api/dashboard/latest-date', {
        credentials: 'include',
        headers: {
          'x-session-token': sessionToken || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        const latestDate = new Date(result.latestDate);
        const oneMonthAgo = new Date(latestDate);
        oneMonthAgo.setMonth(latestDate.getMonth() - 1);

        const newDateRange = {
          from: oneMonthAgo.toISOString().split('T')[0],
          to: latestDate.toISOString().split('T')[0]
        };

        setDateRange(newDateRange);

        // 日付範囲が設定された後にダッシュボードデータを取得
        await fetchDashboardDataWithRange(newDateRange);
      } else {
        // エラーの場合は今日から1ヶ月前をデフォルトとする
        const today = new Date();
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);

        const fallbackRange = {
          from: oneMonthAgo.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };

        setDateRange(fallbackRange);
        await fetchDashboardDataWithRange(fallbackRange);
      }
    } catch (error) {
      console.error('最新日付の取得エラー:', error);

      // エラーの場合は今日から1ヶ月前をデフォルトとする
      const today = new Date();
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);

      const fallbackRange = {
        from: oneMonthAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
      };

      setDateRange(fallbackRange);
      await fetchDashboardDataWithRange(fallbackRange);
    }
  };

  const fetchDashboardDataWithRange = async (range: { from: string; to: string }) => {
    setLoading(true);
    try {
      const sessionToken = document.cookie.split('session_token=')[1]?.split(';')[0];

      const response = await fetch(
        `/api/dashboard/stats?from=${range.from}&to=${range.to}`,
        {
          credentials: 'include',
          headers: {
            'x-session-token': sessionToken || ''
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error('ダッシュボードデータの取得に失敗しました');
      }
    } catch (error) {
      console.error('ダッシュボードデータの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    await fetchDashboardDataWithRange(dateRange);
  };

  const exportToCsv = () => {
    if (!data) return;

    const csvRows = [
      ['カテゴリ名', '注文件数', '売上金額'],
      ...data.categoryStats.map(cat => [
        cat.categoryName,
        cat.orderCount,
        cat.revenue
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_${dateRange.from}_${dateRange.to}.csv`);
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

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getWeekdayName = (dow: number) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[dow];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">データの読み込みに失敗しました</p>
      </div>
    );
  }

  const { stats, dailyTrend, categoryStats, topCustomers, customerAnalysis, weekdayStats } = data;
  const repeatRate = (customerAnalysis.newCustomers + customerAnalysis.repeatCustomers) > 0
    ? (customerAnalysis.repeatCustomers / (customerAnalysis.newCustomers + customerAnalysis.repeatCustomers)) * 100
    : 0;

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">ダッシュボード</h1>
            <p className="text-sm text-gray-600 mt-1">発送済注文の売上分析</p>
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
              onClick={fetchDashboardData}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              更新
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
                <p className="text-sm font-medium text-gray-600">発送済注文数</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalShipped}</p>
                <div className="flex items-center mt-2">
                  {stats.orderGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${stats.orderGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(stats.orderGrowth)}
                  </span>
                </div>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総売上</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <div className="flex items-center mt-2">
                  {stats.revenueGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(stats.revenueGrowth)}
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均注文単価</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.avgOrderValue)}
                </p>
              </div>
              <ShoppingBag className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ユニーク顧客数</p>
                <p className="text-3xl font-bold text-gray-900">{stats.uniqueCustomers}</p>
                <p className="text-xs text-gray-500 mt-2">
                  リピート率: {repeatRate.toFixed(1)}%
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                日別売上推移
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {dailyTrend.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{day.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{day.orderCount}件</span>
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min((day.revenue / Math.max(...dailyTrend.map(d => d.revenue))) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-24 text-right">
                        {formatCurrency(day.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Stats */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                カテゴリ別売上
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {categoryStats.slice(0, 5).map((cat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate flex-1">
                      {cat.categoryName}
                    </span>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm text-gray-500">{cat.orderCount}件</span>
                      <span className="text-sm font-medium text-gray-900 w-24 text-right">
                        {formatCurrency(cat.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">優良顧客ランキング</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      順位
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      顧客名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      注文数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      合計金額
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topCustomers.map((customer, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.orderCount}件
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Weekday Analysis */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">曜日別注文傾向</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {weekdayStats.map((day) => (
                  <div key={day.weekday} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 w-8">
                      {getWeekdayName(day.weekday)}
                    </span>
                    <div className="flex items-center gap-3 flex-1 ml-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min((day.orderCount / Math.max(...weekdayStats.map(d => d.orderCount))) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-16">{day.orderCount}件</span>
                      <span className="text-sm font-medium text-gray-900 w-24 text-right">
                        {formatCurrency(day.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Segment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">顧客セグメント</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">新規顧客</p>
                <p className="text-2xl font-bold text-blue-600">{customerAnalysis.newCustomers}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">リピーター</p>
                <p className="text-2xl font-bold text-green-600">{customerAnalysis.repeatCustomers}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
