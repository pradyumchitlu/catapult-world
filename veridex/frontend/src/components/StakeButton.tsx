'use client';

import { useMemo, useState } from 'react';
import { useUserOperationReceipt } from '@worldcoin/minikit-react';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { createStake, getPlatformAddress } from '@/lib/api';
import { ensureCanSendETH, sendETHToAddress } from '@/lib/wallet';
import { colors } from '@/lib/styles';
import { useMiniApp } from '@/contexts/MiniAppContext';
import {
  createWorldChainPublicClient,
  getWorldAppApiBaseUrl,
  linkWorldWalletWithMiniKit,
  sendMiniKitStakeTransaction,
} from '@/lib/minikit';

interface StakeButtonProps {
  workerId: string;
  workerName: string;
  onStake?: (amount: number) => void;
}

export default function StakeButton({ workerId, workerName, onStake }: StakeButtonProps) {
  const { user, token, updateUser } = useAuth();
  const { isInWorldApp, isMiniKitReady } = useMiniApp();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(0.01);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingStatus, setStakingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const publicClient = useMemo(() => createWorldChainPublicClient(), []);
  const { poll: pollUserOperationReceipt, isLoading: isPollingReceipt } = useUserOperationReceipt({
    client: publicClient,
    apiBaseUrl: getWorldAppApiBaseUrl(),
    pollingInterval: 2500,
    timeout: 120000,
    confirmations: 1,
  });
  const preferMiniKit = isInWorldApp && isMiniKitReady;

  const handleStake = async () => {
    if (amount <= 0 || !token) return;

    if (amount < 0.001) {
      setError('Minimum stake is 0.001 ETH.');
      return;
    }

    if (!preferMiniKit && !user?.wallet_address) {
      setError('Please connect your wallet in settings before staking.');
      return;
    }

    setIsStaking(true);
    setError(null);

    try {
      setStakingStatus('Getting platform address...');
      const { address: platformAddress } = await getPlatformAddress();

      let txHash = '';

      if (preferMiniKit) {
        let activeUser = user;

        if (!activeUser?.wallet_address || activeUser.wallet_verification_method !== 'world_app_wallet_auth') {
          setStakingStatus('Linking your World wallet...');
          const walletResult = await linkWorldWalletWithMiniKit(token);
          updateUser(walletResult.user);
          activeUser = walletResult.user;
        }

        setStakingStatus('Opening World App transaction prompt...');
        const txResult = await sendMiniKitStakeTransaction(platformAddress, amount.toString());

        if (txResult.executedWith === 'fallback') {
          throw new Error('World App staking is only available inside World App.');
        }

        if (!txResult.data?.userOpHash) {
          throw new Error('World App did not return a transaction reference.');
        }

        setStakingStatus('Waiting for on-chain confirmation...');
        const receiptResult = await pollUserOperationReceipt(txResult.data.userOpHash);
        txHash = receiptResult.transactionHash;

        if (!txHash) {
          throw new Error('World App transaction did not resolve to an on-chain hash.');
        }

        if (
          activeUser?.wallet_address &&
          txResult.data.from &&
          activeUser.wallet_address.toLowerCase() !== txResult.data.from.toLowerCase()
        ) {
          throw new Error('The World wallet used for this transaction does not match your linked wallet.');
        }
      } else {
        setStakingStatus('Checking wallet balance and gas...');
        await ensureCanSendETH(platformAddress, amount.toString());

        setStakingStatus('Confirm the transaction in your wallet...');
        const txResult = await sendETHToAddress(platformAddress, amount.toString());
        txHash = txResult.txHash;
      }

      setStakingStatus('Recording stake in Veridex...');
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
        {preferMiniKit ? 'Stake with World App' : 'Stake ETH'}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(15, 23, 42, 0.38)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="w-full max-w-md"
            style={{
              background: 'rgba(255, 255, 255, 0.84)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              borderRadius: '28px',
              boxShadow:
                '0 30px 80px rgba(37, 99, 235, 0.18), inset 0 1px 0 rgba(255,255,255,0.92)',
              padding: '28px',
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span
                  className="mb-3 block text-[11px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: colors.primaryDark }}
                >
                  Back the Builder
                </span>
                <h3 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
                  Stake on {workerName}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close stake modal"
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                style={{
                  color: colors.primaryDark,
                  background: 'rgba(37, 99, 235, 0.1)',
                }}
              >
                ×
              </button>
            </div>

            <p className="mb-6 text-sm" style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
              {preferMiniKit
                ? 'Use your World wallet inside World App to back this worker with a tiny ETH stake on World Chain.'
                : 'Stake ETH to show you believe in this worker. Your stake affects their Veridex score.'}
            </p>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium" style={{ color: colors.textPrimary }}>
                Amount (ETH)
              </label>
              <input
                type="number"
                min={0.001}
                step={0.001}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full"
                style={{
                  border: '1px solid rgba(37, 99, 235, 0.18)',
                  background: 'rgba(255,255,255,0.92)',
                  color: colors.textPrimary,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.84)',
                }}
              />
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[0.005, 0.01, 0.05, 0.1].map((preset) => {
                  const isSelected = amount === preset;

                  return (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className="rounded-xl px-3 py-2 text-sm transition-all"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, #2563EB, #3B82F6)'
                          : 'rgba(37, 99, 235, 0.08)',
                        color: isSelected ? '#FFFFFF' : colors.primaryDark,
                        border: isSelected
                          ? '1px solid transparent'
                          : '1px solid rgba(37, 99, 235, 0.14)',
                        boxShadow: isSelected ? '0 10px 20px rgba(37,99,235,0.2)' : 'none',
                      }}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {stakingStatus && (
              <div
                className="mb-4 rounded-2xl p-3 text-sm"
                style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  border: '1px solid rgba(37, 99, 235, 0.18)',
                  color: colors.primaryDark,
                }}
              >
                {stakingStatus}
              </div>
            )}

            {error && (
              <div
                className="mb-4 rounded-2xl p-3 text-sm"
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.18)',
                  color: colors.rose,
                }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-2xl px-4 py-3 font-medium transition-colors"
                disabled={isStaking}
                style={{
                  background: 'rgba(37, 99, 235, 0.08)',
                  color: colors.primaryDark,
                  border: '1px solid rgba(37, 99, 235, 0.14)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStake}
                disabled={isStaking || isPollingReceipt || amount <= 0}
                className="flex-1 rounded-2xl px-4 py-3 font-medium disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
                  color: '#FFFFFF',
                  boxShadow: '0 16px 32px rgba(37,99,235,0.22)',
                }}
              >
                {isStaking || isPollingReceipt
                  ? <LoadingSpinner />
                  : preferMiniKit
                    ? `Stake ${amount} ETH with World App`
                    : `Stake ${amount} ETH`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
