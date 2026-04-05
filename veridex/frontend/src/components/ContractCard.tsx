'use client';

import GlassCard from '@/components/GlassCard';
import { headingSm, textSecondary, textMuted, gradientText, colors } from '@/lib/styles';
import type { Contract } from '@/types';

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  draft: { color: colors.textTertiary, bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', label: 'Draft' },
  active: { color: colors.primary, bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', label: 'Active' },
  submitted: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', label: 'Submitted' },
  completed: { color: colors.warning, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'Completed' },
  closed: { color: colors.success, bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'Closed' },
};

interface ContractCardProps {
  contract: Contract;
  onActivate?: (id: string) => void;
  onSubmit?: (id: string) => void;
  onComplete?: (id: string) => void;
  onReview?: (id: string) => void;
  onClose?: (id: string) => void;
  isLoading?: boolean;
}

export default function ContractCard({
  contract,
  onActivate,
  onSubmit,
  onComplete,
  onReview,
  onClose,
  isLoading,
}: ContractCardProps) {
  const status = STATUS_STYLES[contract.status] || STATUS_STYLES.draft;
  const workerName = (contract.worker as any)?.display_name || 'Unknown Worker';
  const workerScore = (contract.worker as any)?.worker_profiles?.overall_trust_score;
  const createdDate = new Date(contract.created_at).toLocaleDateString();

  return (
    <GlassCard style={{ padding: '28px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ ...headingSm, fontSize: '16px', margin: '0 0 6px 0' }}>{contract.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...textSecondary, fontSize: '14px' }}>{workerName}</span>
            {workerScore != null && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.primary }}>
                Score: {workerScore}
              </span>
            )}
          </div>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            color: status.color,
            background: status.bg,
            border: `1px solid ${status.border}`,
            borderRadius: '999px',
            padding: '4px 12px',
          }}
        >
          {status.label}
        </span>
      </div>

      {contract.description && (
        <p style={{ ...textSecondary, fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
          {contract.description}
        </p>
      )}

      {/* Details row */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          borderTop: '1px solid rgba(37,99,235,0.12)',
          paddingTop: '14px',
          marginBottom: '14px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '13px',
        }}
      >
        <div>
          <span style={{ color: colors.textMuted }}>Salary </span>
          <span style={{ fontWeight: 600, color: colors.primary }}>
            {contract.payment_amount.toLocaleString()} WLD
          </span>
        </div>
        {contract.buy_in_amount != null && (
          <div>
            <span style={{ color: colors.textMuted }}>Buy-in </span>
            <span style={{ fontWeight: 500, color: colors.textPrimary }}>
              {contract.buy_in_amount.toLocaleString()} WLD
            </span>
          </div>
        )}
        {contract.duration_days && (
          <div>
            <span style={{ color: colors.textMuted }}>Duration </span>
            <span style={{ fontWeight: 500, color: colors.textPrimary }}>{contract.duration_days} days</span>
          </div>
        )}
        <div>
          <span style={{ color: colors.textMuted }}>Created </span>
          <span style={{ color: colors.textSecondary }}>{createdDate}</span>
        </div>
      </div>

      {/* Payment breakdown for completed/closed */}
      {(contract.status === 'completed' || contract.status === 'closed') && contract.worker_payout != null && (
        <div
          style={{
            background: 'rgba(37,99,235,0.04)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            gap: '20px',
            fontSize: '13px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          <span>
            <span style={{ color: colors.textMuted }}>Worker </span>
            <span style={{ fontWeight: 500, color: colors.success }}>{contract.worker_payout} WLD</span>
          </span>
          <span>
            <span style={{ color: colors.textMuted }}>Stakers </span>
            <span style={{ fontWeight: 500, color: colors.cyan }}>{contract.staker_payout_total} WLD</span>
          </span>
          <span>
            <span style={{ color: colors.textMuted }}>Fee </span>
            <span style={{ color: colors.textTertiary }}>{contract.platform_fee} WLD</span>
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {contract.status === 'draft' && onActivate && (
          <button
            onClick={() => onActivate(contract.id)}
            disabled={isLoading}
            className="btn-primary"
            style={{ fontSize: '13px', padding: '8px 20px' }}
          >
            Activate & Escrow
          </button>
        )}
        {contract.status === 'active' && onSubmit && (
          <button
            onClick={() => onSubmit(contract.id)}
            disabled={isLoading}
            className="btn-primary"
            style={{ fontSize: '13px', padding: '8px 20px' }}
          >
            Submit Work
          </button>
        )}
        {contract.status === 'active' && !onSubmit && (
          <span style={{ fontSize: '13px', color: colors.textMuted, padding: '8px 0' }}>
            Waiting for worker to submit
          </span>
        )}
        {contract.status === 'submitted' && onComplete && (
          <button
            onClick={() => onComplete(contract.id)}
            disabled={isLoading}
            className="btn-primary"
            style={{ fontSize: '13px', padding: '8px 20px' }}
          >
            Approve & Pay
          </button>
        )}
        {contract.status === 'submitted' && !onComplete && (
          <span style={{ fontSize: '13px', color: '#8B5CF6', padding: '8px 0' }}>
            Submitted — awaiting employer approval
          </span>
        )}
        {contract.status === 'completed' && !contract.has_review && onReview && (
          <button
            onClick={() => onReview(contract.id)}
            disabled={isLoading}
            className="btn-primary"
            style={{ fontSize: '13px', padding: '8px 20px' }}
          >
            Leave Review
          </button>
        )}
        {contract.status === 'completed' && !contract.has_review && onClose && (
          <button
            onClick={() => onClose(contract.id)}
            disabled={isLoading}
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '8px 20px' }}
          >
            Close Without Review
          </button>
        )}
        {contract.has_review && (
          <span style={{ ...textMuted, fontSize: '13px', padding: '8px 0' }}>Review submitted</span>
        )}
      </div>
    </GlassCard>
  );
}
