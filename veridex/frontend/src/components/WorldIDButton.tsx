'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface WorldIDButtonProps {
  onSuccess: (proof: any) => void;
  onError: (error: string) => void;
}

export default function WorldIDButton({ onSuccess, onError }: WorldIDButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    setIsLoading(true);

    try {
      // TODO: Implement World ID verification using MiniKit
      // const { MiniKit, VerificationLevel } = await import('@worldcoin/minikit-js');
      //
      // if (!MiniKit.isInstalled()) {
      //   throw new Error('Please open this app in World App');
      // }
      //
      // const result = await MiniKit.commandsAsync.verify({
      //   action: 'verify-human',
      //   verification_level: VerificationLevel.Orb,
      // });
      //
      // if (result.finalPayload) {
      //   onSuccess(result.finalPayload);
      // } else {
      //   throw new Error('Verification cancelled');
      // }

      // Placeholder: simulate verification
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onSuccess({
        merkle_root: 'mock_merkle_root',
        nullifier_hash: 'mock_nullifier_hash',
        proof: 'mock_proof',
        verification_level: 'orb',
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleVerify}
      disabled={isLoading}
      className="w-full py-4 px-6 bg-black border-2 border-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-worldcoin-gray-900 transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <LoadingSpinner />
          <span>Verifying...</span>
        </>
      ) : (
        <>
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
          <span>Verify with World ID</span>
        </>
      )}
    </button>
  );
}
