'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { IDKitRequestWidget, orbLegacy } from '@worldcoin/idkit';
import type { IDKitResult } from '@worldcoin/idkit';
import { verifyWorldId } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useMiniApp } from '@/contexts/MiniAppContext';
import { loginWithMiniKitWorldWallet } from '@/lib/minikit';

interface WorldIDButtonProps {
  onSuccess: (result: { user: any; isNewUser: boolean; token: string }) => void;
  onError: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const IS_DEV_MOCK = process.env.NEXT_PUBLIC_DEV_MOCK_WORLDID === 'true';

function WorldIdIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

export default function WorldIDButton({ onSuccess, onError, className, children }: WorldIDButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { isInWorldApp, isMiniKitReady, isDetectingMiniApp } = useMiniApp();

  // Dev mode: mock verification without World ID
  if (IS_DEV_MOCK) {
    const handleMockVerify = async () => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));

        const mockProof = {
          merkle_root: 'mock_merkle_root_' + Date.now(),
          nullifier_hash: 'mock_nullifier_' + Math.random().toString(36).slice(2),
          proof: 'mock_proof',
          verification_level: 'orb',
        };

        const result = await verifyWorldId(mockProof);
        onSuccess(result);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Verification failed');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <button
        onClick={handleMockVerify}
        disabled={isLoading}
        className={cn(
          'btn-primary py-4 px-6 rounded-xl text-lg flex items-center justify-center gap-3 disabled:opacity-50',
          className
        )}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>Verifying...</span>
          </>
        ) : (
          children || (
            <>
              <WorldIdIcon />
              <span>Verify with World ID (Dev)</span>
            </>
          )
        )}
      </button>
    );
  }

  if (isInWorldApp && isDetectingMiniApp) {
    return (
      <button
        disabled
        className={cn(
          'btn-primary py-4 px-6 rounded-xl text-lg flex items-center justify-center gap-3 disabled:opacity-50',
          className
        )}
      >
        <LoadingSpinner />
        <span>Preparing World App...</span>
      </button>
    );
  }

  if (isInWorldApp && isMiniKitReady) {
    const handleWorldAppLogin = async () => {
      setIsLoading(true);
      try {
        const result = await loginWithMiniKitWorldWallet();
        onSuccess(result);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'World App sign-in failed');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <button
        onClick={handleWorldAppLogin}
        disabled={isLoading}
        className={cn(
          'btn-primary py-4 px-6 rounded-xl text-lg flex items-center justify-center gap-3 disabled:opacity-50',
          className
        )}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>Signing in...</span>
          </>
        ) : (
          children || (
            <>
              <WorldIdIcon />
              <span>Continue with World App</span>
            </>
          )
        )}
      </button>
    );
  }

  // Production mode: IDKit widget
  const [rpContext, setRpContext] = useState<any>(null);

  const handleOpen = async () => {
    try {
      // Fetch a fresh signed rp_context from backend each time widget opens
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/rp-context`);
      const ctx = await res.json();
      setRpContext(ctx);
      setIsOpen(true);
    } catch (error) {
      onError('Failed to initialize World ID verification');
    }
  };

  const handleIDKitVerify = async (result: IDKitResult) => {
    setIsLoading(true);
    try {
      // Send the full IDKit result — it already contains the correct nonce, action, and responses
      const apiResult = await verifyWorldId(result);
      onSuccess(apiResult);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`;

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={isLoading}
        className={cn(
          'btn-primary py-4 px-6 rounded-xl text-lg flex items-center justify-center gap-3 disabled:opacity-50',
          className
        )}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>Verifying...</span>
          </>
        ) : (
          children || (
            <>
              <WorldIdIcon />
              <span>Verify with World ID</span>
            </>
          )
        )}
      </button>
      {rpContext && (
        <IDKitRequestWidget
          open={isOpen}
          onOpenChange={setIsOpen}
          app_id={appId}
          action="verify-human"
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={orbLegacy()}
          onSuccess={handleIDKitVerify}
          onError={(errorCode) => onError(`World ID error: ${errorCode}`)}
        />
      )}
    </>
  );
}
