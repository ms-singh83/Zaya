import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zaya',
  description: 'See where every rupee is stuck, and stop chasing it manually.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
