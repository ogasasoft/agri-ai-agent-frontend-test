'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Package,
  BarChart3,
  Plus,
  FileText,
  Tags,
  LogOut,
  User,
  Shield,
  MessageSquare,
  X
} from 'lucide-react';

const navigation = [
  { name: '新規登録', href: '/orders/register/choose', icon: Plus },
  { name: '発送待ちの注文一覧', href: '/orders/shipping/pending', icon: Package },
  { name: '発送済の注文一覧', href: '/orders/shipping/completed', icon: Package },
  { name: 'ダッシュボード', href: '/dashboard', icon: BarChart3 },
  { name: 'カテゴリ管理', href: '/categories', icon: Tags },
];

interface SidebarProps {
  isChatOpen?: boolean;
  setIsChatOpen?: (open: boolean) => void;
}

export function Sidebar({ isChatOpen = true, setIsChatOpen }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchUserInfo();
    }
  }, [mounted]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      try {
        // Get CSRF token from cookie for logout request
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf_token='))
          ?.split('=')[1];

        await fetch('/api/auth/logout', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'x-csrf-token': csrfToken })
          },
          credentials: 'include'
        });
        router.push('/login');
      } catch (error) {
        console.error('Logout error:', error);
        router.push('/login');
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Agri AI</h1>
            <p className="text-xs text-gray-500">EC統合管理</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-3 bg-gray-300 rounded w-20"></div>
              </div>
            ) : (
              <div suppressHydrationWarning>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.username || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">ログイン中</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        {/* AI Chat Toggle */}
        {setIsChatOpen && (
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors mt-2"
            title={isChatOpen ? 'AIアシスタントを閉じる' : 'AIアシスタントを開く'}
          >
            {isChatOpen ? (
              <>
                <X className="w-5 h-5" />
                AIアシスタントを閉じる
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5" />
                AIアシスタントを開く
              </>
            )}
          </button>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="px-4 py-4 border-t border-gray-200 space-y-2">
        <Link
          href="/change-password"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Shield className="w-4 h-4" />
          パスワード変更
        </Link>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
        
        <div className="text-xs text-gray-500 text-center pt-2">
          🔐 セキュア認証システム
        </div>
      </div>
    </div>
  );
}