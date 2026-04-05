'use client';

import { ReactNode } from 'react';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { MiniAppProvider } from '@/contexts/MiniAppContext';
import { getMiniAppId } from '@/lib/minikit';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider props={{ appId: getMiniAppId() || undefined }}>
      <MiniAppProvider>
        <AuthProvider>{children}</AuthProvider>
      </MiniAppProvider>
    </MiniKitProvider>
  );
}
