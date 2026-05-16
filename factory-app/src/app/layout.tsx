import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '工場管理システム',
  description: '図番別原価・材料在庫・工程管理',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
