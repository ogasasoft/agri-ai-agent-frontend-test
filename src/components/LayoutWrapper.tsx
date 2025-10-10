'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ChatPanel } from '@/components/ChatPanel';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(true);

  // ログインページと変更パスワードページでは通常のレイアウトを表示しない
  const isAuthPage = pathname === '/login' || pathname === '/change-password';

  // 管理者ページでは独自レイアウトを使用するため、通常レイアウトを表示しない
  const isAdminPage = pathname.startsWith('/admin');

  if (isAuthPage || isAdminPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  // お客様用のレイアウト（サイドバー + チャット機能）
  return (
    <div className="flex h-screen">
      {/* Customer Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <Sidebar isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* AI Chat Panel */}
        {isChatOpen && (
          <div className="w-80 bg-white shadow-sm border-l border-gray-200">
            <ChatPanel />
          </div>
        )}
      </div>
    </div>
  );
}