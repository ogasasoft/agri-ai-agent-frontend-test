'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Save, RefreshCw, Database, 
  Key, Mail, Shield, Globe, Bell,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  category: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
}

interface SettingsCategory {
  name: string;
  icon: any;
  description: string;
  settings: SystemSetting[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('system');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: {
          'x-session-token': document.cookie.split('session_token=')[1]?.split(';')[0] || '',
          'x-csrf-token': document.cookie.split('csrf_token=')[1]?.split(';')[0] || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || []);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': document.cookie.split('session_token=')[1]?.split(';')[0] || '',
          'x-csrf-token': document.cookie.split('csrf_token=')[1]?.split(';')[0] || '',
        },
        body: JSON.stringify({ settings })
      });

      if (response.ok) {
        setHasChanges(false);
        alert('設定を保存しました');
      } else {
        const error = await response.json();
        alert(`エラー: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
    setHasChanges(true);
  };

  const renderSettingInput = (setting: SystemSetting) => {
    switch (setting.data_type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={setting.value === 'true'}
              onChange={(e) => updateSetting(setting.key, e.target.checked.toString())}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">有効</span>
          </div>
        );
      case 'number':
        return (
          <input
            type="number"
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        );
      case 'json':
        return (
          <textarea
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
          />
        );
      default:
        return (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        );
    }
  };

  const categories: SettingsCategory[] = [
    {
      name: 'system',
      icon: Settings,
      description: 'システム全般設定',
      settings: settings.filter(s => s.category === 'system')
    },
    {
      name: 'security',
      icon: Shield,
      description: 'セキュリティ設定',
      settings: settings.filter(s => s.category === 'security')
    },
    {
      name: 'database',
      icon: Database,
      description: 'データベース設定',
      settings: settings.filter(s => s.category === 'database')
    },
    {
      name: 'api',
      icon: Globe,
      description: 'API設定',
      settings: settings.filter(s => s.category === 'api')
    },
    {
      name: 'notifications',
      icon: Bell,
      description: '通知設定',
      settings: settings.filter(s => s.category === 'notifications')
    }
  ];

  const currentCategory = categories.find(c => c.name === activeCategory);

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
              システム設定
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              システム全体の設定を管理
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadSettings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </button>
            <button
              onClick={saveSettings}
              disabled={!hasChanges || saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '設定を保存'}
            </button>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                未保存の変更があります。忘れずに保存してください。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-6">
        {/* Category Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(category.name)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-left ${
                    activeCategory === category.name
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium">{category.description}</div>
                    <div className="text-xs opacity-75">
                      {category.settings.length} 項目
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {currentCategory && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {currentCategory.description}
                </h3>

                {currentCategory.settings.length > 0 ? (
                  <div className="space-y-6">
                    {currentCategory.settings.map((setting) => (
                      <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-4">
                            <label className="block text-sm font-medium text-gray-900 mb-1">
                              {setting.key}
                            </label>
                            <p className="text-sm text-gray-500 mb-3">
                              {setting.description}
                            </p>
                            {renderSettingInput(setting)}
                          </div>
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {setting.data_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Settings className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">設定項目がありません</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      このカテゴリには設定項目がありません。
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Default Settings Panel (if no settings exist) */}
      {settings.length === 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              デフォルト設定
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">システム名</h4>
                  <p className="text-sm text-gray-500">アプリケーションの表示名</p>
                </div>
                <input
                  type="text"
                  defaultValue="農業AI エージェント"
                  className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">メンテナンスモード</h4>
                  <p className="text-sm text-gray-500">システムメンテナンス中の表示</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">有効</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">デバッグモード</h4>
                  <p className="text-sm text-gray-500">開発用デバッグ情報の表示</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">有効</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">セッションタイムアウト</h4>
                  <p className="text-sm text-gray-500">ユーザーセッションの有効期限（分）</p>
                </div>
                <input
                  type="number"
                  defaultValue={1440}
                  min={1}
                  className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}