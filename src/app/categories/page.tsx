'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Carrot, 
  Apple, 
  Coffee,
  ShoppingBag,
  Heart,
  Star,
  Leaf,
  Zap,
  AlertCircle,
  Check,
  X
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  order_count: number;
  created_at: string;
  updated_at: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const availableIcons = [
  { name: 'Package', icon: Package, label: 'パッケージ' },
  { name: 'Carrot', icon: Carrot, label: '野菜' },
  { name: 'Apple', icon: Apple, label: '果物' },
  { name: 'Coffee', icon: Coffee, label: '飲み物' },
  { name: 'ShoppingBag', icon: ShoppingBag, label: 'ショッピング' },
  { name: 'Heart', icon: Heart, label: 'ハート' },
  { name: 'Star', icon: Star, label: 'スター' },
  { name: 'Leaf', icon: Leaf, label: '葉っぱ' },
  { name: 'Zap', icon: Zap, label: '稲妻' }
];

const availableColors = [
  { value: 'gray', label: 'グレー', class: 'text-gray-600' },
  { value: 'red', label: 'レッド', class: 'text-red-600' },
  { value: 'green', label: 'グリーン', class: 'text-green-600' },
  { value: 'blue', label: 'ブルー', class: 'text-blue-600' },
  { value: 'yellow', label: 'イエロー', class: 'text-yellow-600' },
  { value: 'purple', label: 'パープル', class: 'text-purple-600' },
  { value: 'pink', label: 'ピンク', class: 'text-pink-600' },
  { value: 'indigo', label: 'インディゴ', class: 'text-indigo-600' }
];

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: 'gray',
    icon: 'Package'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      } else {
        setError('カテゴリの取得に失敗しました');
      }
    } catch (error) {
      setError('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const url = editingCategory ? '/api/categories' : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingCategory ? { ...formData, id: editingCategory.id } : formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setShowForm(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '', color: 'gray', icon: 'Package' });
        fetchCategories(); // Refresh list
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('サーバーエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon
    });
    setShowForm(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`「${category.name}」カテゴリを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories?id=${category.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        fetchCategories();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('サーバーエラーが発生しました');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: 'gray', icon: 'Package' });
    setError(null);
  };

  const getIconComponent = (iconName: string) => {
    const iconData = availableIcons.find(i => i.name === iconName);
    return iconData ? iconData.icon : Package;
  };

  const getColorClass = (colorName: string) => {
    const colorData = availableColors.find(c => c.value === colorName);
    return colorData ? colorData.class : 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">カテゴリを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">カテゴリ管理</h1>
              <p className="text-gray-600 mt-2">商品カテゴリの作成・編集・削除</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新しいカテゴリ
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Category Form */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingCategory ? 'カテゴリ編集' : '新しいカテゴリを作成'}
            </h2>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カテゴリ名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例: 手作りパン"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="例: 自家製の手作りパン・焼き菓子"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">アイコン</label>
                  <div className="grid grid-cols-5 gap-2">
                    {availableIcons.map((iconOption) => {
                      const IconComponent = iconOption.icon;
                      return (
                        <button
                          key={iconOption.name}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon: iconOption.name }))}
                          className={`p-2 border rounded-md flex items-center justify-center transition-colors ${
                            formData.icon === iconOption.name
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">カラー</label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableColors.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: colorOption.value }))}
                        className={`p-2 border rounded-md text-sm transition-colors ${
                          formData.color === colorOption.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={colorOption.class}>●</span> {colorOption.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">プレビュー</h4>
                <div className="flex items-center gap-3">
                  {(() => {
                    const IconComponent = getIconComponent(formData.icon);
                    return <IconComponent className={`w-6 h-6 ${getColorClass(formData.color)}`} />;
                  })()}
                  <div>
                    <span className="font-medium text-gray-900">{formData.name || 'カテゴリ名'}</span>
                    {formData.description && (
                      <p className="text-sm text-gray-600">{formData.description}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '保存中...' : (editingCategory ? '更新' : '作成')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">登録済みカテゴリ ({categories.length}件)</h2>
          </div>
          
          {categories.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">カテゴリがありません</h3>
              <p className="text-gray-600">最初のカテゴリを作成してください。</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {categories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <div key={category.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <IconComponent className={`w-6 h-6 ${getColorClass(category.color)}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          {category.description && (
                            <p className="text-gray-600 text-sm">{category.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              注文数: {category.order_count}件
                            </span>
                            <span className="text-xs text-gray-500">
                              作成: {new Date(category.created_at).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          disabled={category.order_count > 0}
                          className={`p-2 rounded-md transition-colors ${
                            category.order_count > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={category.order_count > 0 ? '注文データが関連付けられているため削除できません' : '削除'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}