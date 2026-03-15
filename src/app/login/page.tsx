'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, FileText } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const redirectPath = searchParams.get('redirect') || '/orders';
  const autoLogin = searchParams.get('auto') === 'true';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (autoLogin) {
        // Try auto-login with remember token
        attemptAutoLogin();
      }
      // Note: No need to check auth status on login page
      // Users are expected to be logged out when accessing login
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, autoLogin]);

  // checkAuthStatus removed - not needed on login page

  const checkUserRoleAndRedirect = async () => {
    try {
      // First check user info to get admin flag
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success && userData.isAdmin) {
          // User is admin, redirect to admin page
          router.push('/admin');
        } else {
          // Regular user, redirect to default path
          router.push(redirectPath);
        }
      } else {
        // Auth check failed, redirect to default path
        router.push(redirectPath);
      }
    } catch (error) {
      // If check fails, redirect to default path
      router.push(redirectPath);
    }
  };

  const attemptAutoLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/auto-login', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('自動ログインしました。');
        // Check user role and redirect appropriately
        await checkUserRoleAndRedirect();
      } else {
        // Auto-login failed, show normal login form
        setError('自動ログインできませんでした。再度ログインしてください。');
      }
    } catch (error) {
      setError('自動ログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    // Trim whitespace from username and password fields
    if (field === 'username' || field === 'password') {
      value = typeof value === 'string' ? value.trim() : value;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Ensure username and password are trimmed before sending
    const trimmedData = {
      ...formData,
      username: formData.username.trim(),
      password: formData.password.trim()
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(trimmedData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('ログインしました。');
        
        // Check if password change is required
        if (data.requiresPasswordChange) {
          router.push('/change-password?forced=true');
        } else {
          // Check if user is admin and redirect accordingly
          await checkUserRoleAndRedirect();
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('サーバーエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Agri AI</h1>
          <p className="text-gray-600 mt-2">EC統合管理システム</p>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">
            アカウントにログイン
          </h2>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                ユーザー名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  disabled={loading}
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                  placeholder="ユーザー名を入力してください"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                  placeholder="パスワードを入力してください"
                />
                <button
                  type="button"
                  disabled={loading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                disabled={!mounted}
                checked={formData.rememberMe}
                onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                ログイン状態を保持する（30日間）
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-900">ログインエラー</h3>
                  <p className="text-red-800 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-green-800 text-sm">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ログイン中...
                </div>
              ) : (
                'ログイン'
              )}
            </button>
          </div>
        </form>

        {/* Login Help */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">📞 ログインについて</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>ユーザーIDとパスワードがご不明な場合は、</p>
            <p>システム管理者にお問い合わせください。</p>
            <p className="text-xs text-blue-600 mt-2">
              🔒 このシステムはお客様専用のアカウントでご利用いただけます。
            </p>
          </div>
        </div>

        {/* Security Features */}
        <div className="mt-6 text-center">
          <div className="text-xs text-gray-500 space-y-1">
            <p>🛡️ このシステムは以下のセキュリティ機能で保護されています:</p>
            <p>• パスワードハッシュ化 • セッション管理 • アカウントロック • 監査ログ</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}