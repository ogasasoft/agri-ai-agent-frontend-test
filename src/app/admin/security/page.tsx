'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, Eye, Lock, 
  Activity, TrendingUp, RefreshCw, Download,
  Clock, MapPin, Monitor, AlertCircle
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip_address: string;
  user_agent: string;
  details: any;
  created_at: string;
}

interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  failedLogins: number;
  blockedIPs: number;
  todayEvents: number;
  activeThreats: number;
}

interface RateLimitStatus {
  identifier: string;
  category: string;
  attempts: number;
  window_start: string;
  last_attempt: string;
}

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      const [eventsResponse, statsResponse, rateLimitsResponse] = await Promise.all([
        fetch('/api/admin/security/events', {
          headers: {
            'x-session-token': document.cookie.split('session_token=')[1]?.split(';')[0] || '',
            'x-csrf-token': document.cookie.split('csrf_token=')[1]?.split(';')[0] || '',
          }
        }),
        fetch('/api/admin/security/stats', {
          headers: {
            'x-session-token': document.cookie.split('session_token=')[1]?.split(';')[0] || '',
            'x-csrf-token': document.cookie.split('csrf_token=')[1]?.split(';')[0] || '',
          }
        }),
        fetch('/api/admin/security/rate-limits', {
          headers: {
            'x-session-token': document.cookie.split('session_token=')[1]?.split(';')[0] || '',
            'x-csrf-token': document.cookie.split('csrf_token=')[1]?.split(';')[0] || '',
          }
        })
      ]);

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (rateLimitsResponse.ok) {
        const rateLimitsData = await rateLimitsResponse.json();
        setRateLimits(rateLimitsData.rateLimits || []);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadSecurityData();
    setRefreshing(false);
  };

  const clearRateLimits = async () => {
    try {
      const response = await fetch('/api/reset-rate-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        await refreshData();
        alert('レート制限をリセットしました');
      }
    } catch (error) {
      console.error('Failed to clear rate limits:', error);
      alert('レート制限のリセットに失敗しました');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const filteredEvents = events.filter(event => 
    filterSeverity === 'all' || event.severity === filterSeverity
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
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
              セキュリティ監視
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              システムセキュリティイベントと脅威の監視
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={clearRateLimits}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Lock className="h-4 w-4 mr-2" />
              レート制限リセット
            </button>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              更新
            </button>
          </div>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総イベント数</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalEvents || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">重要なイベント</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.criticalEvents || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Lock className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">ログイン失敗</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.failedLogins || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">今日のイベント</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.todayEvents || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limits Status */}
      {rateLimits.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              アクティブなレート制限
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      識別子
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      カテゴリ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      試行回数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最終試行
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rateLimits.map((limit, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {limit.identifier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {limit.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {limit.attempts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(limit.last_attempt).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Security Events */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              セキュリティイベント
            </h3>
            <div className="flex items-center space-x-2">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">すべて</option>
                <option value="critical">クリティカル</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8 space-y-3">
                {filteredEvents.map((event, index) => (
                  <li key={event.id}>
                    <div className="relative">
                      <div className="flex items-start space-x-3">
                        <div className={`relative px-1 ${
                          event.severity === 'critical' ? 'text-red-500' :
                          event.severity === 'high' ? 'text-orange-500' :
                          event.severity === 'medium' ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {getSeverityIcon(event.severity)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                                {event.event_type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {event.severity.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{event.ip_address}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>{new Date(event.created_at).toLocaleString('ja-JP')}</span>
                              </div>
                            </div>
                            {event.user_agent && (
                              <div className="flex items-center mt-1 text-xs text-gray-400">
                                <Monitor className="h-3 w-3 mr-1" />
                                <span className="truncate">{event.user_agent}</span>
                              </div>
                            )}
                            {event.details && Object.keys(event.details).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(event.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {filterSeverity === 'all' ? 'セキュリティイベントがありません' : `${filterSeverity}レベルのイベントがありません`}
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}