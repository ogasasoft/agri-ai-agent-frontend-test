'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Users, Settings, Database, Shield, BarChart3,
  LogOut, Menu, X, Home, Plug
} from 'lucide-react';

interface AdminUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  is_super_admin: boolean;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/me');
      if (response.ok) {
        const data = await response.json();
        setAdminUser(data.user);
      } else {
        // Not an admin, redirect to login
        router.push('/login?redirect=/admin');
      }
    } catch (error) {
      router.push('/login?redirect=/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!adminUser) {
    return null; // Will redirect
  }

  const navigation = [
    { name: '管理ダッシュボード', href: '/admin', icon: Home },
    { name: 'ユーザーID発行', href: '/admin/users', icon: Users, superAdminOnly: true },
    { name: '顧客データ管理', href: '/admin/customers', icon: Database },
    { name: 'システム設定', href: '/admin/settings', icon: Settings, superAdminOnly: true },
    { name: 'API 連携設定', href: '/admin/integrations', icon: Plug, superAdminOnly: true },
    { name: 'セキュリティ監視', href: '/admin/security', icon: Shield, superAdminOnly: true },
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.superAdminOnly || adminUser.is_super_admin
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
            <div className="absolute top-0 right-0 p-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <SidebarContent 
              navigation={filteredNavigation} 
              pathname={pathname} 
              adminUser={adminUser}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm">
          <SidebarContent 
            navigation={filteredNavigation} 
            pathname={pathname} 
            adminUser={adminUser}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          管理者パネル
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ 
  navigation, 
  pathname, 
  adminUser, 
  onLogout 
}: { 
  navigation: any[]; 
  pathname: string; 
  adminUser: AdminUser;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500">管理者パネル</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:text-primary-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-6 w-6 shrink-0" />
                      {item.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </nav>

      {/* User info and logout */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-x-3 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
            <span className="text-sm font-medium text-primary-700">
              {adminUser.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {adminUser.username}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {adminUser.is_super_admin ? 'スーパー管理者' : '管理者'}
            </p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-6 w-6 shrink-0" />
          ログアウト
        </button>
      </div>
    </>
  );
}