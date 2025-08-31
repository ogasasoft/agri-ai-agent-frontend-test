'use client';

import { useState, useEffect } from 'react';
import { 
  UserPlus, Users, Search, Filter, Mail, 
  Calendar, CheckCircle, XCircle, AlertCircle, Eye, EyeOff 
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  username: string;
  password?: string;
  created_at: string;
  is_admin: boolean;
  is_super_admin: boolean;
  last_login: string | null;
  failed_login_attempts: number;
  account_locked_until: string | null;
}

interface NewUser {
  email: string;
  username: string;
  password: string;
  isAdmin: boolean;
}

interface CustomerPasswordSetup {
  customerEmail: string;
  verificationCode: string;
  password: string;
}

const getCookieValue = (name: string): string => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
};

const getAuthHeaders = () => ({
  'x-session-token': getCookieValue('session_token'),
  'x-csrf-token': getCookieValue('csrf_token'),
});

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    username: '',
    password: '',
    isAdmin: false
  });
  const [creating, setCreating] = useState(false);
  const [showCustomerSetup, setShowCustomerSetup] = useState(false);
  const [customerSetup, setCustomerSetup] = useState<CustomerPasswordSetup>({
    customerEmail: '',
    verificationCode: '',
    password: ''
  });
  const [settingUpPassword, setSettingUpPassword] = useState(false);
  const [showCreateCustomerId, setShowCreateCustomerId] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [creatingCustomerId, setCreatingCustomerId] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (showPasswords) {
      setLoading(true);
      loadUsers();
    }
  }, [showPasswords]);

  const loadUsers = async () => {
    try {
      const endpoint = showPasswords ? '/api/admin/users/passwords' : '/api/admin/users';
      const response = await fetch(endpoint, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error(`API Error: ${response.status} ${response.statusText} for ${endpoint}`);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordView = () => {
    setShowPasswords(!showPasswords);
    setLoading(true);
    loadUsers();
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setNewUser({ email: '', username: '', password: '', isAdmin: false });
        setShowNewUserForm(false);
        loadUsers();
      } else {
        console.error(`Create user API Error: ${response.status} ${response.statusText}`);
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        alert(`エラー: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('ユーザー作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const createCustomerId = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCustomerEmail) {
      alert('お客様のメールアドレスを入力してください');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomerEmail)) {
      alert('有効なメールアドレスを入力してください');
      return;
    }

    setCreatingCustomerId(true);

    try {
      const response = await fetch('/api/admin/users/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          customerEmail: newCustomerEmail
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`お客様IDが作成されました！\n\nメールアドレス: ${newCustomerEmail}\n初期パスワード: 1995\n\nお客様にお伝えください。`);
        setNewCustomerEmail('');
        setShowCreateCustomerId(false);
        loadUsers();
      } else {
        console.error(`Create customer API Error: ${response.status} ${response.statusText}`);
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        alert(`エラー: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to create customer ID:', error);
      alert('お客様ID作成に失敗しました');
    } finally {
      setCreatingCustomerId(false);
    }
  };

  const setupCustomerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verify customer ID and code
    if (customerSetup.verificationCode !== '1995') {
      alert('認証コードが正しくありません');
      return;
    }

    if (!customerSetup.password || customerSetup.password.length < 6) {
      alert('パスワードは6文字以上で入力してください');
      return;
    }

    setSettingUpPassword(true);

    try {
      const response = await fetch('/api/admin/users/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          customerEmail: customerSetup.customerEmail,
          password: customerSetup.password
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`パスワードが設定されました。\nメールアドレス: ${customerSetup.customerEmail}\nパスワード: ${customerSetup.password}`);
        setCustomerSetup({ customerEmail: '', verificationCode: '', password: '' });
        setShowCustomerSetup(false);
        loadUsers();
      } else {
        console.error(`Setup password API Error: ${response.status} ${response.statusText}`);
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        alert(`エラー: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to setup password:', error);
      alert('パスワード設定に失敗しました');
    } finally {
      setSettingUpPassword(false);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
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
              ユーザーID発行
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              システム利用者のアカウント管理
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={togglePasswordView}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                showPasswords 
                  ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500' 
                  : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500'
              }`}
            >
              {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPasswords ? 'パスワードを非表示' : 'パスワードを表示'}
            </button>
            <button
              onClick={() => setShowCreateCustomerId(true)}
              className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              お客様ID作成
            </button>
            <button
              onClick={() => setShowCustomerSetup(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              お客様用パスワード設定
            </button>
            <button
              onClick={() => setShowNewUserForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              管理者用ユーザー作成
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総ユーザー数</dt>
                  <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">アクティブユーザー</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {users.filter(u => !u.account_locked_until).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">ロックされたアカウント</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {users.filter(u => u.account_locked_until).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="ユーザー名またはメールアドレスで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{user.username}</p>
                        {user.is_super_admin && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            スーパー管理者
                          </span>
                        )}
                        {user.is_admin && !user.is_super_admin && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            管理者
                          </span>
                        )}
                        {user.account_locked_until && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ロック中
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <Mail className="h-4 w-4 text-gray-400 mr-1" />
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      {showPasswords && user.password && (
                        <div className="flex items-center mt-1">
                          <span className="text-xs font-medium text-red-600 mr-2">パスワード:</span>
                          <span className="text-sm text-red-700 font-mono bg-red-50 px-2 py-1 rounded">
                            {user.password}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>作成: {new Date(user.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                    {user.last_login && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span>最終ログイン: {new Date(user.last_login).toLocaleDateString('ja-JP')}</span>
                      </div>
                    )}
                    {user.failed_login_attempts > 0 && (
                      <div className="flex items-center text-sm text-red-500 mt-1">
                        <XCircle className="h-4 w-4 mr-1" />
                        <span>失敗回数: {user.failed_login_attempts}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">ユーザーが見つかりません</h3>
          </div>
        )}
      </div>

      {/* Create Customer ID Modal */}
      {showCreateCustomerId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">お客様ID作成</h3>
              <form onSubmit={createCustomerId} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">お客様のメールアドレス</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@example.com"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    作成後、初期パスワード「1995」が設定されます
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCustomerId(false);
                      setNewCustomerEmail('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={creatingCustomerId}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingCustomerId ? '作成中...' : 'お客様ID作成'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Customer Password Setup Modal */}
      {showCustomerSetup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">お客様用パスワード設定</h3>
              <form onSubmit={setupCustomerPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">お客様のメールアドレス</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@example.com"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={customerSetup.customerEmail}
                    onChange={(e) => setCustomerSetup({ ...customerSetup, customerEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">認証コード</label>
                  <input
                    type="text"
                    required
                    placeholder="1995"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={customerSetup.verificationCode}
                    onChange={(e) => setCustomerSetup({ ...customerSetup, verificationCode: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">認証コード「1995」を入力してください</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">新しいパスワード</label>
                  <input
                    type="password"
                    required
                    placeholder="6文字以上のパスワード"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={customerSetup.password}
                    onChange={(e) => setCustomerSetup({ ...customerSetup, password: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerSetup(false);
                      setCustomerSetup({ customerEmail: '', verificationCode: '', password: '' });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={settingUpPassword}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {settingUpPassword ? '設定中...' : 'パスワード設定'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showNewUserForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">管理者用ユーザー作成</h3>
              <form onSubmit={createUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ユーザー名</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">パスワード</label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={newUser.isAdmin}
                    onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                  />
                  <label className="ml-2 block text-sm text-gray-900">管理者権限を付与</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewUserForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {creating ? '作成中...' : '作成'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}