import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Veridex - Decentralized Trust Platform',
  description: 'Build portable reputation with World ID verification. Stake WLD on integrity. Spawn accountable AI agents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body
        style={{
          background: 'linear-gradient(-45deg, #ffffff, #eff6ff, #f5f3ff, #faf5ff)',
          backgroundSize: '400% 400%',
          animation: 'aurora-shift 10s ease infinite',
          minHeight: '100vh',
          color: '#1E293B',
          paddingTop: '72px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
