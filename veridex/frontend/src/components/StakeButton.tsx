'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface StakeButtonProps {
  workerId: string;
  workerName: string;
  onStake?: (amount: number) => void;
}

export default function StakeButton({ workerId, workerName, onStake }: StakeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(100);
  const [isStaking, setIsStaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStake = async () => {
    if (amount <= 0) return;

    setIsStaking(true);
    setError(null);

    try {
      // TODO: Call stake API
      // await createStake(workerId, amount, token);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Placeholder
      onStake?.(amount);
      setIsOpen(false);
      setAmount(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stake');
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn-primary">
        Stake WLD
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Stake on {workerName}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-worldcoin-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-worldcoin-gray-400 text-sm mb-6">
              Stake WLD to show you believe in this worker. Your stake affects their trust score.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Amount (WLD)</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                className="input w-full"
              />
              <div className="flex justify-between mt-2">
                {[50, 100, 250, 500].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className="px-3 py-1 text-sm bg-worldcoin-gray-700 rounded hover:bg-worldcoin-gray-600"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-veridex-error/20 border border-veridex-error rounded-lg text-veridex-error text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="btn-secondary flex-1"
                disabled={isStaking}
              >
                Cancel
              </button>
              <button
                onClick={handleStake}
                disabled={isStaking || amount <= 0}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isStaking ? <LoadingSpinner /> : `Stake ${amount} WLD`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
