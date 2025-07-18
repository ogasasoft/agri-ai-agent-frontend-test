import './globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { ChatPanel } from '@/components/ChatPanel';

export const metadata: Metadata = {
  title: 'Agri AI Agent - 農業EC統合管理システム',
  description: '複数ECサイトの注文データを統合管理し、AI分析とコンサルティングを提供',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-white shadow-sm border-r border-gray-200">
            <Sidebar />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 flex">
            <main className="flex-1 overflow-auto">
              {children}
            </main>
            
            {/* AI Chat Panel */}
            <div className="w-80 bg-white shadow-sm border-l border-gray-200">
              <ChatPanel />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}