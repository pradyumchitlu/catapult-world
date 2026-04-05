'use client';

import Link from 'next/link';
import type { Stake, User, WorkerProfile } from '@/types';

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
      <div className="text-center py-8 text-veridex-gray-400">
        You haven&apos;t staked on any workers yet.
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-veridex-success">↑</span>;
      case 'down':
        return <span className="text-veridex-error">↓</span>;
      default:
        return <span className="text-veridex-gray-400">→</span>;
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
            className="p-4 bg-veridex-gray-700/50 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Link href={`/profile/${stake.worker_id}`} className="hover:underline">
                <div className="font-medium">{stake.worker.display_name}</div>
                <div className="text-sm text-veridex-gray-400">
                  Score: {workerScore ?? 'N/A'}
                  {' '}{getTrendIcon(stake.scoreTrend)}
                </div>
              </Link>
            </div>

            <div className="text-right">
              <div className="font-semibold text-veridex-primary">
                {stake.amount_eth.toLocaleString()} ETH
              </div>
              <div className={`text-sm ${stake.yieldEarned >= 0 ? 'text-veridex-success' : 'text-veridex-error'}`}>
                {stake.yieldEarned >= 0 ? '+' : ''}{stake.yieldEarned} ETH yield
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
