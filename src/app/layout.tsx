import './globals.css';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

// LayoutWrapperを動的インポートでSSRから除外
const LayoutWrapper = dynamic(() => import('@/components/LayoutWrapper').then(mod => ({ default: mod.LayoutWrapper })), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
});

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
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}