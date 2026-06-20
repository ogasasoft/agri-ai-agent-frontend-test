'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Database,
  ShoppingCart,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  XCircle,
  Truck,
  Check,
  Ban,
  RotateCcw,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalCustomers: number;
  activeIntegrations: number;
  todayOrders: number;
  weeklyGrowth: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastBackup: string;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

interface StatusStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch('/api/admin/dashboard/stats'),
        fetch('/api/admin/dashboard/activities'),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.activities);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: '総ユーザー数',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'blue',
      change: '+12%',
    },
    {
      name: '総注文数',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'green',
      change: '+8%',
    },
    {
      name: '顧客数',
      value: stats?.totalCustomers || 0,
      icon: Database,
      color: 'purple',
      change: '+15%',
    },
    {
      name: '今日の注文',
      value: stats?.todayOrders || 0,
      icon: TrendingUp,
      color: 'orange',
      change: '+23%',
    },
  ];

  const statusConfig = [
    {
      key: 'pending',
      label: '保留中',
      icon: Package,
      color: 'bg-yellow-100 text-yellow-600',
      borderColor: 'border-yellow-200',
    },
    {
      key: 'processing',
      label: '処理中',
      icon: RotateCcw,
      color: 'bg-blue-100 text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      key: 'shipped',
      label: '出荷済み',
      icon: Truck,
      color: 'bg-indigo-100 text-indigo-600',
      borderColor: 'border-indigo-200',
    },
    {
      key: 'delivered',
      label: '配達完了',
      icon: Check,
      color: 'bg-green-100 text-green-600',
      borderColor: 'border-green-200',
    },
    {
      key: 'cancelled',
      label: 'キャンセル',
      icon: XCircle,
      color: 'bg-red-100 text-red-600',
      borderColor: 'border-red-200',
    },
    {
      key: 'refunded',
      label: '返金済み',
      icon: Ban,
      color: 'bg-gray-100 text-gray-600',
      borderColor: 'border-gray-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
          管理者ダッシュボード
        </h1>
        <p className="mt-2 text-sm text-gray-700">システム全体の概要と最新の活動状況</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 py-6 shadow sm:px-6"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md bg-${card.color}-100`}>
                    <Icon className={`h-6 w-6 text-${card.color}-600`} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {card.value.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        {card.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* System Health */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">システム状態</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">データベース接続</span>
                </div>
                <span className="text-sm font-medium text-green-600">正常</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">API エンドポイント</span>
                </div>
                <span className="text-sm font-medium text-green-600">正常</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm text-gray-700">外部API連携</span>
                </div>
                <span className="text-sm font-medium text-yellow-600">設定中</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-700">最終バックアップ</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {stats?.lastBackup || '今日 03:00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">最近の活動</h3>

            <div className="flow-root">
              <ul className="-mb-8 space-y-3">
                {activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <li key={activity.id}>
                      <div className="relative">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`relative px-1 ${
                              activity.severity === 'error'
                                ? 'text-red-500'
                                : activity.severity === 'warning'
                                  ? 'text-yellow-500'
                                  : activity.severity === 'success'
                                    ? 'text-green-500'
                                    : 'text-blue-500'
                            }`}
                          >
                            <Activity className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div>
                              <p className="text-sm text-gray-700">{activity.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500 text-center py-4">最近の活動はありません</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Analytics */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">注文ステータス分析</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statusConfig.map((config) => {
              const Icon = config.icon;
              const count = stats?.statusStats?.[config.key] || 0;
              const percentage = stats?.statusStats?.total
                ? ((count / stats.statusStats.total) * 100).toFixed(1)
                : 0;

              return (
                <div
                  key={config.key}
                  className={`relative overflow-hidden rounded-lg border p-4 ${
                    config.borderColor
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-md ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {config.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {count.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">管理者アクション</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/admin/users"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                  <Users className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">ユーザーID発行</h3>
                <p className="mt-2 text-sm text-gray-500">お客様用のアカウントを新規発行</p>
              </div>
            </a>

            <a
              href="/admin/customers"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  <Database className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">顧客データ管理</h3>
                <p className="mt-2 text-sm text-gray-500">全顧客のデータを統合管理</p>
              </div>
            </a>

            <a
              href="/admin/security"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-red-50 text-red-700 ring-4 ring-white">
                  <AlertCircle className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">セキュリティ監視</h3>
                <p className="mt-2 text-sm text-gray-500">システムセキュリティとログ監視</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
