'use client';

import type { Review } from '@/types';
import { colors } from '@/lib/styles';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? colors.warning : 'rgba(37,99,235,0.15)', fontSize: '18px' }}>
        ★
      </span>
    ));
  };

  return (
    <div
      style={{
        padding: '20px',
        background: review.is_flagged ? 'rgba(245,158,11,0.06)' : 'rgba(37,99,235,0.04)',
        border: `1px solid ${review.is_flagged ? 'rgba(245,158,11,0.2)' : 'rgba(37,99,235,0.12)'}`,
        borderRadius: '14px',
        opacity: review.is_flagged ? 0.7 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>
              {review.reviewer?.display_name || 'Anonymous'}
            </span>
            {review.reviewer_trust_score_at_time != null && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: colors.primary,
                  background: 'rgba(37,99,235,0.08)',
                  border: '1px solid rgba(37,99,235,0.15)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                }}
              >
                Trust: {review.reviewer_trust_score_at_time}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <div>{renderStars(review.rating)}</div>
            {review.job_category && (
              <span style={{ fontSize: '12px', color: colors.textTertiary, textTransform: 'capitalize' }}>
                · {review.job_category}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '14px', fontWeight: 600, color: colors.primary }}>
            {review.stake_amount.toLocaleString()} WLD
          </div>
          <div style={{ fontSize: '11px', color: colors.textMuted }}>staked</div>
        </div>
      </div>

      {/* Content */}
      {review.content && (
        <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '14px', lineHeight: '1.6', color: colors.textSecondary, marginBottom: '12px' }}>
          {review.content}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: colors.textMuted }}>
        <span>{formatDate(review.created_at)}</span>
        {review.is_flagged && (
          <span style={{ color: colors.warning }}>
            {review.flag_reason || 'Flagged for review'}
          </span>
        )}
      </div>
    </div>
  );
}
