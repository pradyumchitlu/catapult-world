'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { createStake, getPlatformAddress } from '@/lib/api';
import { sendETHToAddress } from '@/lib/wallet';

interface StakeButtonProps {
  workerId: string;
  workerName: string;
  onStake?: (amount: number) => void;
}

export default function StakeButton({ workerId, workerName, onStake }: StakeButtonProps) {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(0.01);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingStatus, setStakingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStake = async () => {
    if (amount <= 0 || !token) return;

    if (!user?.wallet_address) {
      setError('Please connect your wallet in settings before staking.');
      return;
    }

    setIsStaking(true);
    setError(null);

    try {
      setStakingStatus('Getting platform address...');
      const { address: platformAddress } = await getPlatformAddress();

      setStakingStatus('Confirm the transaction in MetaMask...');
      const { txHash } = await sendETHToAddress(platformAddress, amount.toString());

      setStakingStatus('Verifying on-chain...');
      await createStake(workerId, amount, txHash, token);

      onStake?.(amount);
      setIsOpen(false);
      setAmount(0.01);
      setStakingStatus('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stake');
      setStakingStatus('');
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn-primary">
        Stake ETH
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Stake on {workerName}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-veridex-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-veridex-gray-400 text-sm mb-6">
              Stake ETH to show you believe in this worker. Your stake affects their trust score.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Amount (ETH)</label>
              <input
                type="number"
                min={0.001}
                step={0.001}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="input w-full"
              />
              <div className="flex justify-between mt-2">
                {[0.005, 0.01, 0.05, 0.1].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className="px-3 py-1 text-sm bg-veridex-gray-700 rounded hover:bg-veridex-gray-600"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {stakingStatus && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-300 text-sm">
                {stakingStatus}
              </div>
            )}

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
                {isStaking ? <LoadingSpinner /> : `Stake ${amount} ETH`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
