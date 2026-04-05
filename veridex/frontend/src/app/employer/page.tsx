'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContractCard from '@/components/ContractCard';
import CreateContractModal from '@/components/CreateContractModal';
import ContractReviewForm from '@/components/ContractReviewForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEmployerContracts,
  activateContract,
  completeContract,
  closeContract,
  createContractReview,
} from '@/lib/api';
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
import type { Contract, ContractStatus } from '@/types';

const STATUS_TABS: { id: ContractStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'closed', label: 'Closed' },
];

export default function EmployerPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, updateUser } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [reviewingContract, setReviewingContract] = useState<Contract | null>(null);

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
    try {
      const result = await activateContract(id, token) as any;
      if (result.new_balance != null && user) {
        updateUser({ ...user, wld_balance: result.new_balance });
      }
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
    try {
      await completeContract(id, token);
      await fetchContracts();
    } catch (error) {
      console.error('Complete failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
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
            Manage contracts, complete payments, and review workers.
          </p>
        </div>

        {/* ── Summary Cards ── */}
        <div
          className="fade-up fade-up-2"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}
        >
          <GlassCard style={{ padding: '28px' }}>
            <span style={sectionLabel}>WLD Balance</span>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '32px', fontWeight: 700, ...gradientText }}>
              {(user?.wld_balance || 0).toLocaleString()} WLD
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
              {totalSpent.toLocaleString()} WLD
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
