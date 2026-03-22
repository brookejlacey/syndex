import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYNDEX — Multi-Agent Economic Network',
  description: 'Real-time dashboard for the Syndex self-sustaining agent economy',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
