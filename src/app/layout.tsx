import './globals.css';
import type { Metadata } from 'next';
import { LayoutWrapper } from '@/components/LayoutWrapper';

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