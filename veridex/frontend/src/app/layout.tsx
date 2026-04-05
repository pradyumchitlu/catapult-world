import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Providers from '@/components/Providers';
import { cn } from "@/lib/utils";

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
  description: 'Build portable reputation with World ID verification. Stake WLD on integrity. Issue traceable agent credentials tied to real humans.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(fraunces.variable, inter.variable, "font-sans")}
      style={{ '--font-sans': 'var(--font-inter), system-ui, sans-serif' } as React.CSSProperties}
    >
      <body
        style={{
          backgroundColor: '#DBEAFE',
          minHeight: '100vh',
          color: '#1E293B',
          paddingTop: '72px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
