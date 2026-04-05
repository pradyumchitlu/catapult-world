'use client';

import Link from 'next/link';
import type { Stake, User, WorkerProfile } from '@/types';
import { colors } from '@/lib/styles';

interface StakeWithWorker extends Stake {
  worker: User & {
    worker_profile?: WorkerProfile;
    worker_profiles?: WorkerProfile | WorkerProfile[];
  };
  scoreTrend: 'up' | 'down' | 'stable';
  yieldEarned: number;
}

interface StakePortfolioProps {
  stakes: StakeWithWorker[];
}

export default function StakePortfolio({ stakes }: StakePortfolioProps) {
  if (stakes.length === 0) {
    return (
      <div className="py-8 text-center" style={{ color: colors.textTertiary }}>
        You haven&apos;t staked on any workers yet.
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span style={{ color: colors.success }}>↑</span>;
      case 'down':
        return <span style={{ color: colors.rose }}>↓</span>;
      default:
        return <span style={{ color: colors.textMuted }}>→</span>;
    }
  };

  const getWorkerScore = (stake: StakeWithWorker) => {
    const directProfile = stake.worker.worker_profile;
    if (directProfile?.overall_trust_score !== undefined) {
      return directProfile.overall_trust_score;
    }

    const joinedProfiles = stake.worker.worker_profiles;
    if (Array.isArray(joinedProfiles)) {
      return joinedProfiles[0]?.overall_trust_score ?? null;
    }

    return joinedProfiles?.overall_trust_score ?? null;
  };

  return (
    <div className="space-y-4">
      {stakes.map((stake) => {
        const workerScore = getWorkerScore(stake);

        return (
          <div
            key={stake.id}
            className="flex items-center justify-between gap-4"
            style={{
              padding: '18px 20px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.74)',
              border: '1px solid rgba(255,255,255,0.88)',
              boxShadow:
                '0 12px 28px rgba(37,99,235,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <div className="flex items-center gap-4">
              <Link
                href={`/profile/${stake.worker_id}`}
                className="transition-opacity hover:opacity-80"
              >
                <div className="font-medium" style={{ color: colors.textPrimary }}>
                  {stake.worker.display_name}
                </div>
                <div className="text-sm" style={{ color: colors.textSecondary }}>
                  Score: {workerScore ?? 'N/A'}{' '}{getTrendIcon(stake.scoreTrend)}
                </div>
              </Link>
            </div>

            <div className="text-right">
              <div
                className="font-semibold"
                style={{ color: colors.primaryDark, fontSize: '17px' }}
              >
                {stake.amount_eth.toLocaleString()} ETH
              </div>
              <div
                className="text-sm"
                style={{ color: stake.yieldEarned >= 0 ? colors.success : colors.rose }}
              >
                {stake.yieldEarned >= 0 ? '+' : ''}{stake.yieldEarned} ETH yield
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
