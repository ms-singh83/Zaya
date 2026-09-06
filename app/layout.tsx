import type { Metadata } from 'next';
import { ThemeScript } from '@/components/shell/theme-script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zaya',
  description: 'See where every rupee is stuck, and stop chasing it manually.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
