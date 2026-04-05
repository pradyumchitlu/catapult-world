'use client';

import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import {
  headingSm,
  textSecondary,
  textMuted,
  gradientText,
  colors,
} from '@/lib/styles';
import type { WorkerProfile, User } from '@/types';

interface WorkerWithUser extends WorkerProfile {
  user: User;
  reviewCount: number;
  avgRating: number;
  totalStaked: number;
  contextualFitScore?: number;
}

interface WorkerCardProps {
  worker: WorkerWithUser;
  showContextualScore?: boolean;
}

export default function WorkerCard({ worker, showContextualScore }: WorkerCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.primary;
    if (score >= 40) return colors.warning;
    return '#F43F5E';
  };

  return (
    <Link href={`/profile/${worker.user_id}`} style={{ textDecoration: 'none' }}>
      <GlassCard
        style={{
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        className="hover:scale-[1.01]"
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ ...headingSm, fontSize: '16px', margin: '0 0 4px 0' }}>
              {worker.user.display_name}
            </h3>
            <p style={{ ...textMuted, textTransform: 'capitalize' }}>
              {worker.user.profession_category}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: '28px',
                fontWeight: 700,
                color: getScoreColor(worker.overall_trust_score),
              }}
            >
              {worker.overall_trust_score}
            </div>
            <div style={textMuted}>Veridex Score</div>
          </div>
        </div>

        {/* Contextual Score */}
        {showContextualScore && worker.contextualFitScore !== undefined && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              background: 'rgba(37,99,235,0.06)',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ ...textSecondary, fontSize: '13px' }}>Fit Score</span>
            <span
              style={{
                fontWeight: 600,
                color: getScoreColor(worker.contextualFitScore),
                fontSize: '14px',
              }}
            >
              {worker.contextualFitScore}%
            </span>
          </div>
        )}

        {/* Skills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {worker.computed_skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '12px',
                color: colors.primary,
                background: 'rgba(37,99,235,0.08)',
                border: '1px solid rgba(37,99,235,0.15)',
                borderRadius: '6px',
                padding: '3px 10px',
              }}
            >
              {skill}
            </span>
          ))}
          {worker.computed_skills.length > 4 && (
            <span style={{ ...textMuted, fontSize: '12px', padding: '3px 0' }}>
              +{worker.computed_skills.length - 4} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(37,99,235,0.12)',
            paddingTop: '12px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '13px',
          }}
        >
          <span style={{ color: colors.textSecondary }}>
            {worker.reviewCount} reviews
          </span>
          <span style={{ color: colors.textSecondary }}>
            {worker.avgRating.toFixed(1)} ★
          </span>
          <span style={{ color: colors.primary, fontWeight: 500 }}>
            {worker.totalStaked.toLocaleString()} ETH
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
