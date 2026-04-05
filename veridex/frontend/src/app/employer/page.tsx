'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserOperationReceipt } from '@worldcoin/minikit-react';
import ContractCard from '@/components/ContractCard';
import CreateContractModal from '@/components/CreateContractModal';
import ContractReviewForm from '@/components/ContractReviewForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { useMiniApp } from '@/contexts/MiniAppContext';
import {
  getEmployerContracts,
  activateContract,
  completeContract,
  closeContract,
  createContractReview,
  getContractSettlement,
} from '@/lib/api';
import {
  createWorldChainPublicClient,
  getMiniKitTransactionErrorMessage,
  getWorldAppApiBaseUrl,
  linkWorldWalletWithMiniKit,
  sendMiniKitAssetTransfers,
} from '@/lib/minikit';
import {
  col,
  headingLg,
  headingSm,
  sectionLabel,
  textSecondary,
  textMuted,
  gradientText,
  colors,
} from '@/lib/styles';
import type { Contract, ContractStatus, PaymentAsset } from '@/types';

const worldChainClient = createWorldChainPublicClient();

const STATUS_TABS: { id: ContractStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'active', label: 'Active' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'completed', label: 'Completed' },
  { id: 'closed', label: 'Closed' },
];

export default function EmployerPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, updateUser } = useAuth();
  const { isInWorldApp, isMiniKitReady } = useMiniApp();
  const { poll: pollUserOperation, isLoading: isPollingUserOperation } = useUserOperationReceipt({
    client: worldChainClient,
    apiBaseUrl: getWorldAppApiBaseUrl(),
  });
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [reviewingContract, setReviewingContract] = useState<Contract | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [contractPaymentAssets, setContractPaymentAssets] = useState<Record<string, PaymentAsset>>({});

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
    }
  }, [user, authLoading, router]);

  // Fetch contracts
  useEffect(() => {
    if (!token) return;
    fetchContracts();
  }, [token]);

  const fetchContracts = async () => {
    if (!token) return;
    try {
      const data = await getEmployerContracts(token);
      setContracts(data.contracts || []);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    setActionError(null);
    setActionMessage(null);
    try {
      await activateContract(id, token);
      await fetchContracts();
    } catch (error) {
      console.error('Activate failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    setActionError(null);
    const paymentAsset = contractPaymentAssets[id] || 'ETH';
    try {
      setActionMessage('Preparing the payout plan...');
      const { settlement } = await getContractSettlement(id, token);

      if (!isInWorldApp || !isMiniKitReady) {
        throw new Error('Open Veridex inside World App to approve and pay this contract from your World wallet.');
      }

      let activeUser = user;
      if (!activeUser?.wallet_address || activeUser.wallet_verification_method !== 'world_app_wallet_auth') {
        setActionMessage('Linking your World wallet...');
        const walletResult = await linkWorldWalletWithMiniKit(token);
        activeUser = walletResult.user;
        updateUser(walletResult.user);
      }

      if (!activeUser?.wallet_address) {
        throw new Error('Link a World wallet before approving payouts.');
      }

      setActionMessage(`Requesting a ${settlement.total_amount.toLocaleString()} ${paymentAsset} payout in World App...`);
      const txResult = await sendMiniKitAssetTransfers(
        settlement.transfers.map((transfer) => ({
          to: transfer.wallet_address,
          amountEth: transfer.amount.toString(),
        })),
        paymentAsset
      );

      if (txResult.executedWith === 'fallback') {
        throw new Error('World App did not execute the payout request.');
      }

      if (txResult.data.from.toLowerCase() !== activeUser.wallet_address.toLowerCase()) {
        throw new Error('World App used a different wallet than the one linked to this Veridex account.');
      }

      setActionMessage(`Waiting for the ${paymentAsset} payout to confirm on World Chain...`);
      const { transactionHash } = await pollUserOperation(txResult.data.userOpHash);

      setActionMessage('Finalizing the payout in Veridex...');
      await completeContract(
        id,
        {
          user_op_hash: txResult.data.userOpHash,
          transaction_hash: transactionHash,
          from_wallet_address: txResult.data.from,
        },
        token
      );

      setActionMessage(`Contract payout confirmed and recorded in ${paymentAsset}.`);
      await fetchContracts();
    } catch (error) {
      console.error('Complete failed:', error);
      setActionError(getMiniKitTransactionErrorMessage(error, { feature: 'contract', asset: paymentAsset }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    setActionError(null);
    try {
      await closeContract(id, token);
      await fetchContracts();
    } catch (error) {
      console.error('Close failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewSubmit = async (data: { rating: number; content: string; job_category: string }) => {
    if (!token || !reviewingContract) return;
    setActionLoading(reviewingContract.id);
    setActionError(null);
    try {
      await createContractReview(reviewingContract.id, data.rating, data.content, data.job_category, token);
      setReviewingContract(null);
      await fetchContracts();
    } catch (error) {
      console.error('Review failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const filtered = statusFilter === 'all'
    ? contracts
    : contracts.filter((c) => c.status === statusFilter);

  const activeCount = contracts.filter((c) => c.status === 'active').length;
  const totalSpent = contracts
    .filter((c) => c.status === 'completed' || c.status === 'closed')
    .reduce((sum, c) => sum + c.payment_amount, 0);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        {/* ── Header ── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '48px' }}>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            Employer Dashboard
          </h1>
          <p style={textSecondary}>
            Manage contracts, approve payouts in World App, and review workers.
          </p>
        </div>

        {(actionMessage || actionError) && (
          <GlassCard style={{ padding: '18px 20px', marginBottom: '24px' }}>
            {actionMessage && (
              <div style={{ ...textSecondary, marginBottom: actionError ? '8px' : 0 }}>
                {actionMessage}
                {isPollingUserOperation ? ' This can take a few seconds while World Chain confirms the payout.' : ''}
              </div>
            )}
            {actionError && (
              <div style={{ color: colors.rose, fontSize: '14px', lineHeight: '1.6' }}>
                {actionError}
              </div>
            )}
          </GlassCard>
        )}

        {/* ── Summary Cards ── */}
        <div
          className="fade-up fade-up-2"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}
        >
          <GlassCard style={{ padding: '28px' }}>
            <span style={sectionLabel}>Contracts Created</span>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '32px', fontWeight: 700, ...gradientText }}>
              {contracts.length}
            </div>
          </GlassCard>

          <GlassCard style={{ padding: '28px' }}>
            <span style={sectionLabel}>Active Contracts</span>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '32px', fontWeight: 700, ...gradientText }}>
              {activeCount}
            </div>
          </GlassCard>

          <GlassCard style={{ padding: '28px' }}>
            <span style={sectionLabel}>Total Spent</span>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '32px', fontWeight: 700, ...gradientText }}>
              {totalSpent.toLocaleString()} ETH
            </div>
          </GlassCard>
        </div>

        {/* ── Status tabs ── */}
        <div
          className="fade-up fade-up-2"
          style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fff' : colors.textSecondary,
                  background: isActive ? colors.primary : 'rgba(255,255,255,0.5)',
                  border: isActive ? 'none' : '1px solid rgba(37,99,235,0.2)',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Contract List ── */}
        <div className="fade-up fade-up-3">
          {filtered.length === 0 ? (
            <GlassCard style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ ...textSecondary, marginBottom: '16px' }}>
                {contracts.length === 0
                  ? "No contracts yet. Browse workers to get started."
                  : "No contracts match this filter."}
              </p>
              {contracts.length === 0 && (
                <Link href="/browse" className="btn-primary" style={{ fontSize: '14px' }}>
                  Browse Workers
                </Link>
              )}
            </GlassCard>
          ) : (
            filtered.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onActivate={handleActivate}
                onComplete={handleComplete}
                paymentAsset={contractPaymentAssets[contract.id] || 'ETH'}
                onPaymentAssetChange={(asset) =>
                  setContractPaymentAssets((current) => ({
                    ...current,
                    [contract.id]: asset,
                  }))
                }
                onReview={(id) => setReviewingContract(contracts.find((c) => c.id === id) || null)}
                onClose={handleClose}
                isLoading={actionLoading === contract.id}
              />
            ))
          )}
        </div>

        <div style={{ height: '64px' }} />
      </div>

      {/* Review Modal */}
      {reviewingContract && (
        <ContractReviewForm
          contractTitle={reviewingContract.title}
          contractPayment={reviewingContract.payment_amount}
          workerName={(reviewingContract.worker as any)?.display_name || 'Worker'}
          onSubmit={handleReviewSubmit}
          onClose={() => setReviewingContract(null)}
          isLoading={actionLoading === reviewingContract.id}
        />
      )}
    </div>
  );
}
