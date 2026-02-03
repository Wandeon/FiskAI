import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FiskAI',
  description: 'Croatian e-invoicing made simple',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
