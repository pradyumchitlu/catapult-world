'use client';

import { createContext, useContext, useMemo } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { getMiniAppId } from '@/lib/minikit';

interface MiniAppContextValue {
  isInWorldApp: boolean;
  isMiniKitReady: boolean;
  isDetectingMiniApp: boolean;
  miniAppId: string | null;
}

const MiniAppContext = createContext<MiniAppContextValue>({
  isInWorldApp: false,
  isMiniKitReady: false,
  isDetectingMiniApp: false,
  miniAppId: null,
});

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const { isInstalled } = useMiniKit();
  const miniAppId = getMiniAppId() || null;
  const isWorldAppEnvironment = MiniKit.isInWorldApp();

  const value = useMemo(
    () => ({
      isInWorldApp: isWorldAppEnvironment,
      isMiniKitReady: Boolean(isWorldAppEnvironment && isInstalled && miniAppId),
      isDetectingMiniApp: Boolean(isWorldAppEnvironment && isInstalled === undefined),
      miniAppId,
    }),
    [isInstalled, isWorldAppEnvironment, miniAppId]
  );

  return <MiniAppContext.Provider value={value}>{children}</MiniAppContext.Provider>;
}

export function useMiniApp() {
  return useContext(MiniAppContext);
}
