'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Package, 
  BarChart3, 
  Plus, 
  Upload, 
  Settings,
  MessageSquare,
  FileText
} from 'lucide-react';

const navigation = [
  { name: '注文管理', href: '/orders', icon: Package },
  { name: 'ダッシュボード', href: '/dashboard', icon: BarChart3 },
  { name: '注文登録', href: '/orders/new', icon: Plus },
  { name: 'CSVアップロード', href: '/upload', icon: Upload },
  { name: 'システムプロンプト', href: '/prompts', icon: MessageSquare },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

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
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Powered by Cloudflare
        </div>
      </div>
    </div>
  );
}