'use client';

import { useState, useEffect } from 'react';
import { headingSm, headingMd, textSecondary, textMuted, sectionLabel, gradientText, colors } from '@/lib/styles';
import { estimateBuyIn } from '@/lib/api';

interface BuyInEstimate {
  salary: number;
  stakerReward: number;
  platformFee: number;
  totalBuyIn: number;
  totalStakedOnWorker: number;
  stakerRewardRate: number;
}

interface CreateContractModalProps {
  workerName: string;
  workerId: string;
  balance: number;
  token: string;
  onSubmit: (data: { worker_id: string; title: string; description: string; payment_amount: number; duration_days: number }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function CreateContractModal({
  workerName,
  workerId,
  balance,
  token,
  onSubmit,
  onClose,
  isLoading,
}: CreateContractModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState(100);
  const [durationDays, setDurationDays] = useState(14);
  const [estimate, setEstimate] = useState<BuyInEstimate | null>(null);

  // Debounced buy-in estimate
  useEffect(() => {
    if (salary <= 0) {
      setEstimate(null);
      return;
    }

    const timer = setTimeout(() => {
      estimateBuyIn(workerId, salary, token)
        .then(setEstimate)
        .catch(() => setEstimate(null));
    }, 300);

    return () => clearTimeout(timer);
  }, [salary, workerId, token]);

  const totalCost = estimate?.totalBuyIn || salary;
  const canAfford = balance >= totalCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || salary <= 0 || !canAfford) return;
    onSubmit({
      worker_id: workerId,
      title: title.trim(),
      description: description.trim(),
      payment_amount: salary,
      duration_days: durationDays,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass"
        style={{ maxWidth: '520px', width: '100%', margin: '24px' }}
      >
        <div className="p-10">
          <span style={sectionLabel}>New Contract</span>
          <h2 style={{ ...headingMd, fontSize: '22px', margin: '0 0 4px 0' }}>
            Hire {workerName}
          </h2>
          <p style={{ ...textMuted, marginBottom: '24px' }}>
            Balance: {balance.toLocaleString()} WLD
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '6px' }}>Title</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Build a landing page"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '6px' }}>Description</label>
              <textarea
                className="input"
                placeholder="Describe the scope of work..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  Salary (WLD)
                </label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={salary}
                  onChange={(e) => setSalary(parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  Duration (days)
                </label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Buy-in breakdown */}
            {estimate && (
              <div
                style={{
                  background: 'rgba(37,99,235,0.04)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(37,99,235,0.12)',
                }}
              >
                <div style={{ ...headingSm, fontSize: '12px', marginBottom: '12px', color: colors.primary }}>
                  Buy-in Breakdown
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textSecondary }}>Worker salary</span>
                    <span style={{ fontWeight: 500 }}>{estimate.salary} WLD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textSecondary }}>
                      Staker reward ({(estimate.stakerRewardRate * 100).toFixed(1)}%)
                    </span>
                    <span style={{ fontWeight: 500, color: colors.cyan }}>{estimate.stakerReward} WLD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textSecondary }}>Platform fee (3%)</span>
                    <span style={{ color: colors.textTertiary }}>{estimate.platformFee} WLD</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(37,99,235,0.12)', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: colors.textPrimary }}>Total buy-in</span>
                    <span style={{ fontWeight: 700, ...gradientText }}>{estimate.totalBuyIn} WLD</span>
                  </div>
                </div>
                {estimate.totalStakedOnWorker > 0 && (
                  <p style={{ ...textMuted, fontSize: '11px', marginTop: '8px' }}>
                    {estimate.totalStakedOnWorker.toLocaleString()} WLD staked on this worker — stakers earn a share when you hire.
                  </p>
                )}
              </div>
            )}

            {!canAfford && salary > 0 && (
              <p style={{ color: colors.rose, fontSize: '13px' }}>
                Insufficient balance. You need {totalCost.toLocaleString()} WLD but have {balance.toLocaleString()}.
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={isLoading || !title.trim() || salary <= 0 || !canAfford}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {isLoading ? 'Creating...' : `Create Contract (${totalCost} WLD)`}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
