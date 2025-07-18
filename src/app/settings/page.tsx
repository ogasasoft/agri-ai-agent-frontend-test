'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  notifications: {
    email: string;
    lineWebhook: string;
    enableShippingNotifications: boolean;
  };
  ecPlatforms: ECPlatform[];
}

interface ECPlatform {
  id: string;
  platform: string;
  apiKey: string;
  apiSecret?: string;
  endpointUrl?: string;
  syncSchedule: string;
  isActive: boolean;
}

const initialSettings: AppSettings = {
  theme: 'light',
  fontSize: 'medium',
  fontFamily: 'Helvetica Neue, Arial, sans-serif',
  notifications: {
    email: '',
    lineWebhook: '',
    enableShippingNotifications: false
  },
  ecPlatforms: []
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
    applyThemeSettings();
  }, []);

  useEffect(() => {
    applyThemeSettings();
  }, [settings.theme, settings.fontSize, settings.fontFamily]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings({ ...initialSettings, ...data });
    } catch (error) {
      console.error('設定の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('設定を保存しました');
      } else {
        throw new Error('設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const applyThemeSettings = () => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // Apply font settings
      root.style.setProperty('--font-family', settings.fontFamily);
      
      // Apply font size
      const fontSizes = {
        small: '14px',
        medium: '16px',
        large: '18px'
      };
      root.style.setProperty('--font-size', fontSizes[settings.fontSize]);
      
      // Apply theme
      if (settings.theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const addECPlatform = () => {
    const newPlatform: ECPlatform = {
      id: Date.now().toString(),
      platform: '',
      apiKey: '',
      apiSecret: '',
      endpointUrl: '',
      syncSchedule: '0 */6 * * *',
      isActive: true
    };
    
    setSettings(prev => ({
      ...prev,
      ecPlatforms: [...prev.ecPlatforms, newPlatform]
    }));
  };

  const updateECPlatform = (id: string, updates: Partial<ECPlatform>) => {
    setSettings(prev => ({
      ...prev,
      ecPlatforms: prev.ecPlatforms.map(platform =>
        platform.id === id ? { ...platform, ...updates } : platform
      )
    }));
  };

  const removeECPlatform = (id: string) => {
    setSettings(prev => ({
      ...prev,
      ecPlatforms: prev.ecPlatforms.filter(platform => platform.id !== id)
    }));
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">アプリケーション設定</h1>
          <p className="text-sm text-gray-600 mt-1">
            テーマ、通知、EC連携の設定を管理
          </p>
        </div>
        
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '設定保存'}
        </button>
      </div>

      {/* UI Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">UI設定</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              テーマ
            </label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                theme: e.target.value as AppSettings['theme']
              }))}
              className="input-field w-full"
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
              <option value="auto">自動</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              フォントサイズ
            </label>
            <select
              value={settings.fontSize}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                fontSize: e.target.value as AppSettings['fontSize']
              }))}
              className="input-field w-full"
            >
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              フォントファミリー
            </label>
            <select
              value={settings.fontFamily}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                fontFamily: e.target.value
              }))}
              className="input-field w-full"
            >
              <option value="Helvetica Neue, Arial, sans-serif">Helvetica Neue</option>
              <option value="'Hiragino Sans', 'ヒラギノ角ゴ ProN W3', sans-serif">ヒラギノ角ゴ</option>
              <option value="'Noto Sans JP', sans-serif">Noto Sans JP</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h2>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={settings.notifications.enableShippingNotifications}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    enableShippingNotifications: e.target.checked
                  }
                }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                発送件数通知を有効にする
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                通知メールアドレス
              </label>
              <input
                type="email"
                value={settings.notifications.email}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    email: e.target.value
                  }
                }))}
                className="input-field w-full"
                placeholder="notifications@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LINE Webhook URL
              </label>
              <input
                type="url"
                value={settings.notifications.lineWebhook}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    lineWebhook: e.target.value
                  }
                }))}
                className="input-field w-full"
                placeholder="https://notify-api.line.me/api/notify"
              />
            </div>
          </div>
        </div>
      </div>

      {/* EC Platform Settings */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">EC プラットフォーム連携</h2>
          <button
            onClick={addECPlatform}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            プラットフォーム追加
          </button>
        </div>

        <div className="space-y-4">
          {settings.ecPlatforms.map((platform) => (
            <div key={platform.id} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プラットフォーム
                  </label>
                  <select
                    value={platform.platform}
                    onChange={(e) => updateECPlatform(platform.id, { platform: e.target.value })}
                    className="input-field w-full text-sm"
                  >
                    <option value="">選択</option>
                    <option value="shopify">Shopify</option>
                    <option value="base">BASE</option>
                    <option value="stores">STORES</option>
                    <option value="rakuten">楽天市場</option>
                    <option value="amazon">Amazon</option>
                    <option value="yahoo">Yahoo!ショッピング</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API キー
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets[platform.id] ? 'text' : 'password'}
                      value={platform.apiKey}
                      onChange={(e) => updateECPlatform(platform.id, { apiKey: e.target.value })}
                      className="input-field w-full text-sm pr-8"
                      placeholder="API キーを入力"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility(platform.id)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets[platform.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API シークレット
                  </label>
                  <input
                    type={showSecrets[`${platform.id}-secret`] ? 'text' : 'password'}
                    value={platform.apiSecret || ''}
                    onChange={(e) => updateECPlatform(platform.id, { apiSecret: e.target.value })}
                    className="input-field w-full text-sm"
                    placeholder="シークレット"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    同期スケジュール
                  </label>
                  <input
                    type="text"
                    value={platform.syncSchedule}
                    onChange={(e) => updateECPlatform(platform.id, { syncSchedule: e.target.value })}
                    className="input-field w-full text-sm"
                    placeholder="0 */6 * * *"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={platform.isActive}
                      onChange={(e) => updateECPlatform(platform.id, { isActive: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">有効</span>
                  </label>
                </div>

                <div className="col-span-1 md:col-span-1 flex justify-end">
                  <button
                    onClick={() => removeECPlatform(platform.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {settings.ecPlatforms.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>EC プラットフォームが登録されていません</p>
              <p className="text-sm">「プラットフォーム追加」ボタンから追加してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}