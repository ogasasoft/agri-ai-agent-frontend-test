'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Copy, MessageSquare, Download } from 'lucide-react';

interface SystemPrompt {
  id: string;
  customerId: string;
  customerName: string;
  prompt: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState('');

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      // In a real implementation, this would fetch from KV via API
      const mockPrompts: SystemPrompt[] = [
        {
          id: 'default',
          customerId: 'default',
          customerName: 'デフォルト',
          prompt: 'あなたは農業EC事業の経験豊富なコンサルタントです。注文データ分析と売上改善のアドバイスを提供してください。\n\n以下の点に注意してください：\n- 季節性を考慮した提案\n- 顧客の購買パターン分析\n- 在庫管理の最適化\n- 新商品開発のヒント\n- マーケティング戦略の助言',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setPrompts(mockPrompts);
      setSelectedPrompt(mockPrompts[0]);
      setEditingPrompt(mockPrompts[0].prompt);
    } catch (error) {
      console.error('システムプロンプトの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async () => {
    if (!selectedPrompt) return;
    
    setSaving(true);
    try {
      // Save to KV store via API
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedPrompt.customerId,
          prompt: editingPrompt
        })
      });

      if (response.ok) {
        // Update local state
        setPrompts(prev => prev.map(p => 
          p.id === selectedPrompt.id 
            ? { ...p, prompt: editingPrompt, updatedAt: new Date().toISOString() }
            : p
        ));
        setSelectedPrompt(prev => prev ? { ...prev, prompt: editingPrompt } : null);
        alert('システムプロンプトを保存しました');
        
        // Backup to R2
        await backupToR2();
      } else {
        throw new Error('保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('システムプロンプトの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const backupToR2 = async () => {
    try {
      await fetch('/api/prompts/backup', {
        method: 'POST'
      });
    } catch (error) {
      console.error('R2バックアップに失敗しました:', error);
    }
  };

  const createNewPrompt = () => {
    const newPrompt: SystemPrompt = {
      id: Date.now().toString(),
      customerId: '',
      customerName: '',
      prompt: '',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setPrompts(prev => [...prev, newPrompt]);
    setSelectedPrompt(newPrompt);
    setEditingPrompt('');
  };

  const deletePrompt = async (id: string) => {
    if (!confirm('このプロンプトを削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPrompts(prev => prev.filter(p => p.id !== id));
        if (selectedPrompt?.id === id) {
          const remaining = prompts.filter(p => p.id !== id);
          setSelectedPrompt(remaining[0] || null);
          setEditingPrompt(remaining[0]?.prompt || '');
        }
      }
    } catch (error) {
      console.error('プロンプトの削除に失敗しました:', error);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(editingPrompt);
    alert('プロンプトをクリップボードにコピーしました');
  };

  const exportPrompts = () => {
    const data = {
      prompts: prompts,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `system_prompts_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updatePromptInfo = (field: keyof SystemPrompt, value: string) => {
    if (!selectedPrompt) return;
    
    const updated = { ...selectedPrompt, [field]: value };
    setSelectedPrompt(updated);
    setPrompts(prev => prev.map(p => p.id === selectedPrompt.id ? updated : p));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Prompt List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">システムプロンプト</h2>
            <div className="flex gap-2">
              <button
                onClick={exportPrompts}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                title="エクスポート"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={createNewPrompt}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="新規作成"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedPrompt?.id === prompt.id ? 'bg-primary-50 border-primary-200' : ''
              }`}
              onClick={() => {
                setSelectedPrompt(prompt);
                setEditingPrompt(prompt.prompt);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">
                    {prompt.customerName || 'Untitled'}
                  </span>
                  {prompt.isDefault && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      デフォルト
                    </span>
                  )}
                </div>
                {!prompt.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePrompt(prompt.id);
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {prompt.prompt.substring(0, 100)}...
              </p>
              <p className="text-xs text-gray-400 mt-2">
                更新: {new Date(prompt.updatedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Editor */}
      <div className="flex-1 flex flex-col">
        {selectedPrompt ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold text-gray-900">
                  プロンプト編集
                </h1>
                <div className="flex gap-2">
                  <button
                    onClick={copyPrompt}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    コピー
                  </button>
                  <button
                    onClick={savePrompt}
                    disabled={saving}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>

              {/* Prompt Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顧客名
                  </label>
                  <input
                    type="text"
                    value={selectedPrompt.customerName}
                    onChange={(e) => updatePromptInfo('customerName', e.target.value)}
                    className="input-field w-full"
                    placeholder="顧客名を入力"
                    disabled={selectedPrompt.isDefault}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顧客ID
                  </label>
                  <input
                    type="text"
                    value={selectedPrompt.customerId}
                    onChange={(e) => updatePromptInfo('customerId', e.target.value)}
                    className="input-field w-full"
                    placeholder="顧客IDを入力"
                    disabled={selectedPrompt.isDefault}
                  />
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 p-6">
              <div className="h-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  システムプロンプト
                </label>
                <textarea
                  value={editingPrompt}
                  onChange={(e) => setEditingPrompt(e.target.value)}
                  className="input-field w-full h-full resize-none"
                  placeholder="システムプロンプトを入力してください..."
                />
              </div>
            </div>

            {/* Info */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600 space-y-1">
                <p>• このプロンプトはAIチャットの冒頭に自動挿入されます</p>
                <p>• 顧客別に異なるプロンプトを設定できます</p>
                <p>• 変更は自動的にCloudflare KVに保存され、R2にバックアップされます</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>プロンプトを選択してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}