'use client';

import { useState, useEffect } from 'react';
import { 
  Save, RefreshCw, MessageSquare, Zap, BarChart3, 
  Settings, Plus, Edit, Trash2, Eye 
} from 'lucide-react';

interface SystemPrompt {
  id: number;
  category: string;
  key: string;
  value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface PromptCategory {
  name: string;
  displayName: string;
  description: string;
  icon: any;
  color: string;
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    name: 'system_prompt',
    displayName: 'システムプロンプト',
    description: 'AI チャットシステムの基本動作を定義',
    icon: MessageSquare,
    color: 'blue'
  },
  {
    name: 'analysis_prompt',
    displayName: '分析プロンプト',
    description: 'データ分析時のAIの動作を定義',
    icon: BarChart3,
    color: 'green'
  },
  {
    name: 'automation_prompt',
    displayName: '自動化プロンプト',
    description: '自動処理におけるAIの動作を定義',
    icon: Zap,
    color: 'yellow'
  }
];

export default function SystemPromptsManagement() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('system_prompt');
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const response = await fetch('/api/admin/prompts');
      if (response.ok) {
        const data = await response.json();
        setPrompts(data.prompts);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async (prompt: SystemPrompt) => {
    setSaving(prompt.key);
    try {
      const response = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: prompt.id,
          category: prompt.category,
          key: prompt.key,
          value: prompt.value,
          description: prompt.description
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPrompts(prompts.map(p => p.id === prompt.id ? data.prompt : p));
        alert('プロンプトを保存しました。');
      } else {
        alert('保存に失敗しました。');
      }
    } catch (error) {
      alert('保存中にエラーが発生しました。');
    } finally {
      setSaving(null);
    }
  };

  const handleAddPrompt = async (newPrompt: Omit<SystemPrompt, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPrompt)
      });

      if (response.ok) {
        const data = await response.json();
        setPrompts([...prompts, data.prompt]);
        setShowAddModal(false);
        alert('プロンプトを追加しました。');
      } else {
        alert('追加に失敗しました。');
      }
    } catch (error) {
      alert('追加中にエラーが発生しました。');
    }
  };

  const handleDeletePrompt = async (promptId: number) => {
    if (!confirm('このプロンプトを削除しますか？')) return;

    try {
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPrompts(prompts.filter(p => p.id !== promptId));
        alert('プロンプトを削除しました。');
      } else {
        alert('削除に失敗しました。');
      }
    } catch (error) {
      alert('削除中にエラーが発生しました。');
    }
  };

  const filteredPrompts = prompts.filter(p => p.category === selectedCategory);
  const currentCategory = PROMPT_CATEGORIES.find(c => c.name === selectedCategory);

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
            システムプロンプト管理
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            AI システムの動作を制御するプロンプトを管理します
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <Plus className="h-4 w-4" />
            新規プロンプト追加
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {PROMPT_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.name;
            
            return (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`mr-2 h-5 w-5 ${
                  isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {category.displayName}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Current Category Info */}
      {currentCategory && (
        <div className={`bg-${currentCategory.color}-50 border border-${currentCategory.color}-200 rounded-lg p-4`}>
          <div className="flex items-start">
            <currentCategory.icon className={`h-6 w-6 text-${currentCategory.color}-600 mt-1 mr-3`} />
            <div>
              <h3 className={`text-lg font-medium text-${currentCategory.color}-900`}>
                {currentCategory.displayName}
              </h3>
              <p className={`mt-1 text-sm text-${currentCategory.color}-700`}>
                {currentCategory.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prompts List */}
      <div className="space-y-6">
        {filteredPrompts.map((prompt) => (
          <div key={prompt.id} className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {prompt.key}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {prompt.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingPrompt(prompt)}
                    className="inline-flex items-center gap-x-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                    編集
                  </button>
                  <button
                    onClick={() => handleDeletePrompt(prompt.id)}
                    className="inline-flex items-center gap-x-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    削除
                  </button>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <textarea
                value={prompt.value}
                onChange={(e) => {
                  const updatedPrompts = prompts.map(p => 
                    p.id === prompt.id ? { ...p, value: e.target.value } : p
                  );
                  setPrompts(updatedPrompts);
                }}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="システムプロンプトを入力してください..."
              />
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  最終更新: {new Date(prompt.updated_at).toLocaleString('ja-JP')}
                </div>
                <button
                  onClick={() => handleSavePrompt(prompt)}
                  disabled={saving === prompt.key}
                  className="inline-flex items-center gap-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
                >
                  {saving === prompt.key ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving === prompt.key ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPrompts.length === 0 && (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">プロンプトなし</h3>
            <p className="mt-1 text-sm text-gray-500">
              このカテゴリにはまだプロンプトが登録されていません。
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-x-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
              >
                <Plus className="h-4 w-4" />
                最初のプロンプトを追加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}