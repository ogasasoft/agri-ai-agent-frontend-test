'use client';

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Key, Globe, Zap, AlertCircle, CheckCircle,
  Edit, Save, X
} from 'lucide-react';

interface APIIntegration {
  id: number;
  name: string;
  display_name: string;
  base_url?: string;
  api_key?: string;
  api_secret?: string;
  webhook_url?: string;
  is_active: boolean;
  configuration: Record<string, unknown>;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

interface IntegrationConfig {
  sync_interval: number;
  auto_import: boolean;
  webhook_enabled?: boolean;
  sync_categories?: string[];
  field_mapping?: { [key: string]: string };
}

const INTEGRATION_TEMPLATES = {
  colormi: {
    displayName: 'カラーミーショップ',
    description: 'カラーミーショップからの商品・注文データの自動同期',
    icon: '🛍️',
    color: 'blue',
    fields: [
      { key: 'api_key', label: 'APIキー', type: 'password', required: true },
      { key: 'shop_id', label: 'ショップID', type: 'text', required: true },
      { key: 'base_url', label: 'APIベースURL', type: 'url', required: true }
    ]
  },
  tabechoku: {
    displayName: '食べチョク',
    description: '食べチョクからの注文データの自動取得',
    icon: '🥬',
    color: 'green',
    fields: [
      { key: 'api_key', label: 'APIキー', type: 'password', required: true },
      { key: 'seller_id', label: '販売者ID', type: 'text', required: true },
      { key: 'webhook_secret', label: 'Webhook秘密鍵', type: 'password', required: false }
    ]
  }
};

export default function APIIntegrationsManagement() {
  const [integrations, setIntegrations] = useState<APIIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIntegration, setEditingIntegration] = useState<APIIntegration | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch('/api/admin/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIntegration = async (integration: APIIntegration) => {
    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(integration)
      });

      if (response.ok) {
        const data = await response.json();
        setIntegrations(integrations.map(i => i.id === integration.id ? data.integration : i));
        setEditingIntegration(null);
        alert('設定を保存しました。');
      } else {
        alert('保存に失敗しました。');
      }
    } catch (error) {
      alert('保存中にエラーが発生しました。');
    }
  };

  const handleToggleIntegration = async (integrationId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/integrations/${integrationId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok) {
        setIntegrations(integrations.map(i => 
          i.id === integrationId ? { ...i, is_active: isActive } : i
        ));
      } else {
        alert('状態の変更に失敗しました。');
      }
    } catch (error) {
      alert('状態変更中にエラーが発生しました。');
    }
  };

  const handleTestConnection = async (integration: APIIntegration) => {
    setTestingConnection(integration.name);
    try {
      const response = await fetch(`/api/admin/integrations/${integration.id}/test`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`接続テスト成功: ${data.message}`);
      } else {
        alert(`接続テスト失敗: ${data.message}`);
      }
    } catch (error) {
      alert('接続テスト中にエラーが発生しました。');
    } finally {
      setTestingConnection(null);
    }
  };

  const handleSyncData = async (integrationId: number) => {
    if (!confirm('データ同期を開始しますか？')) return;

    try {
      const response = await fetch(`/api/admin/integrations/${integrationId}/sync`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`同期開始: ${data.message}`);
        // Reload integrations to get updated sync status
        loadIntegrations();
      } else {
        alert('同期の開始に失敗しました。');
      }
    } catch (error) {
      alert('同期開始中にエラーが発生しました。');
    }
  };

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
      <div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
          API連携管理
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          外部サービスとのAPI連携を設定・管理します
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {integrations.map((integration) => {
          const template = INTEGRATION_TEMPLATES[integration.name as keyof typeof INTEGRATION_TEMPLATES];
          const config = (integration.configuration || {}) as unknown as IntegrationConfig;
          
          return (
            <div key={integration.id} className="bg-white shadow rounded-lg overflow-hidden">
              {/* Header */}
              <div className={`px-6 py-4 bg-${template?.color || 'gray'}-50 border-b border-gray-200`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{template?.icon || '🔌'}</span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {integration.display_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {template?.description || '外部API連携'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                      integration.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integration.is_active ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {integration.is_active ? '有効' : '無効'}
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={integration.is_active}
                        onChange={(e) => handleToggleIntegration(integration.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                {editingIntegration?.id === integration.id ? (
                  <EditIntegrationForm
                    integration={editingIntegration}
                    template={template}
                    onSave={handleUpdateIntegration}
                    onCancel={() => setEditingIntegration(null)}
                    onChange={setEditingIntegration}
                  />
                ) : (
                  <ViewIntegrationDetails
                    integration={integration}
                    config={config}
                    onEdit={() => setEditingIntegration(integration)}
                    onTestConnection={() => handleTestConnection(integration)}
                    onSyncData={() => handleSyncData(integration.id)}
                    testingConnection={testingConnection === integration.name}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Edit Integration Form Component
function EditIntegrationForm({ 
  integration, 
  template, 
  onSave,
  onCancel,
  onChange
}: {
  integration: APIIntegration;
  template: any;
  onSave: (integration: APIIntegration) => void;
  onCancel: () => void;
  onChange: (integration: APIIntegration) => void;
}) {
  return (
    <div className="space-y-4">
      {/* API Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">API設定</h4>
        <div className="space-y-3">
          {template?.fields?.map((field: any) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type={field.type}
                value={String(integration[field.key as keyof APIIntegration] ?? '')}
                onChange={(e) => onChange({
                  ...integration,
                  [field.key]: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={`${field.label}を入力`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">同期設定</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              同期間隔（秒）
            </label>
            <input
              type="number"
              value={Number(integration.configuration?.sync_interval) || 3600}
              onChange={(e) => onChange({
                ...integration,
                configuration: {
                  ...integration.configuration,
                  sync_interval: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="60"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`auto-import-${integration.id}`}
              checked={Boolean(integration.configuration?.auto_import)}
              onChange={(e) => onChange({
                ...integration,
                configuration: {
                  ...integration.configuration,
                  auto_import: e.target.checked
                }
              })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor={`auto-import-${integration.id}`} className="ml-2 block text-sm text-gray-700">
              自動インポートを有効にする
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
          キャンセル
        </button>
        <button
          onClick={() => onSave(integration)}
          className="inline-flex items-center gap-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          <Save className="h-4 w-4" />
          保存
        </button>
      </div>
    </div>
  );
}

// View Integration Details Component
function ViewIntegrationDetails({ 
  integration, 
  config, 
  onEdit, 
  onTestConnection, 
  onSyncData, 
  testingConnection 
}: {
  integration: APIIntegration;
  config: IntegrationConfig;
  onEdit: () => void;
  onTestConnection: () => void;
  onSyncData: () => void;
  testingConnection: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Status Information */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">最終同期:</span>
          <div className="font-medium">
            {integration.last_sync_at 
              ? new Date(integration.last_sync_at).toLocaleString('ja-JP')
              : '未実行'
            }
          </div>
        </div>
        <div>
          <span className="text-gray-500">同期間隔:</span>
          <div className="font-medium">
            {Math.floor((config.sync_interval || 3600) / 60)}分
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="flex items-center gap-4 text-sm">
        <div className={`flex items-center gap-2 ${
          integration.api_key ? 'text-green-600' : 'text-red-600'
        }`}>
          <Key className="h-4 w-4" />
          <span>API認証: {integration.api_key ? '設定済み' : '未設定'}</span>
        </div>
        <div className={`flex items-center gap-2 ${
          config.auto_import ? 'text-green-600' : 'text-gray-600'
        }`}>
          <Zap className="h-4 w-4" />
          <span>自動同期: {config.auto_import ? '有効' : '無効'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <Edit className="h-4 w-4" />
          設定編集
        </button>
        
        <button
          onClick={onTestConnection}
          disabled={testingConnection}
          className="inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          {testingConnection ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          {testingConnection ? 'テスト中...' : '接続テスト'}
        </button>
        
        <button
          onClick={onSyncData}
          disabled={!integration.is_active}
          className="inline-flex items-center gap-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          今すぐ同期
        </button>
      </div>
    </div>
  );
}