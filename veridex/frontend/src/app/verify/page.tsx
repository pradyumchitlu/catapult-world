'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WorldIDButton from '@/components/WorldIDButton';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VerifyPage() {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerificationSuccess = async (proof: any) => {
    setIsVerifying(true);
    setError(null);

    try {
      // TODO: Send proof to backend for verification
      // const result = await verifyWorldId(proof);
      // Store user session
      // Redirect to onboarding
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerificationError = (error: string) => {
    setError(error);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Verify Your Identity</h1>
        <p className="text-worldcoin-gray-400 mb-8">
          Prove you&apos;re a unique human with World ID. This is the foundation of your trust profile.
        </p>

        {isVerifying ? (
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner />
            <p className="text-worldcoin-gray-400">Verifying...</p>
          </div>
        ) : (
          <WorldIDButton
            onSuccess={handleVerificationSuccess}
            onError={handleVerificationError}
          />
        )}

        {error && (
          <div className="mt-4 p-3 bg-veridex-error/20 border border-veridex-error rounded-lg text-veridex-error text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-worldcoin-gray-700">
          <h3 className="text-sm font-medium text-worldcoin-gray-400 mb-3">Why World ID?</h3>
          <ul className="text-sm text-worldcoin-gray-500 space-y-2">
            <li>✓ Proves you&apos;re human, not a bot</li>
            <li>✓ One account per person</li>
            <li>✓ Privacy-preserving verification</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
