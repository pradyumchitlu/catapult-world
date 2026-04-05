'use client';

import { createContext, useContext, useMemo } from 'react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { getMiniAppId } from '@/lib/minikit';

interface MiniAppContextValue {
  isInWorldApp: boolean;
  isMiniKitReady: boolean;
  miniAppId: string | null;
}

const MiniAppContext = createContext<MiniAppContextValue>({
  isInWorldApp: false,
  isMiniKitReady: false,
  miniAppId: null,
});

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const { isInstalled } = useMiniKit();
  const miniAppId = getMiniAppId() || null;

  const value = useMemo(
    () => ({
      isInWorldApp: Boolean(isInstalled),
      isMiniKitReady: Boolean(isInstalled && miniAppId),
      miniAppId,
    }),
    [isInstalled, miniAppId]
  );

  return <MiniAppContext.Provider value={value}>{children}</MiniAppContext.Provider>;
}

export function useMiniApp() {
  return useContext(MiniAppContext);
}
