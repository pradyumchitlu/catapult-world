'use client';

import Link from 'next/link';
import type { Stake, User, WorkerProfile } from '@/types';

interface StakeWithWorker extends Stake {
  worker: User & { worker_profile: WorkerProfile };
  scoreTrend: 'up' | 'down' | 'stable';
  yieldEarned: number;
}

interface StakePortfolioProps {
  stakes: StakeWithWorker[];
}

export default function StakePortfolio({ stakes }: StakePortfolioProps) {
  if (stakes.length === 0) {
    return (
      <div className="text-center py-8 text-worldcoin-gray-400">
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
        return <span className="text-worldcoin-gray-400">→</span>;
    }
  };

  return (
    <div className="space-y-4">
      {stakes.map((stake) => (
        <div
          key={stake.id}
          className="p-4 bg-worldcoin-gray-700/50 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link href={`/profile/${stake.worker_id}`} className="hover:underline">
              <div className="font-medium">{stake.worker.display_name}</div>
              <div className="text-sm text-worldcoin-gray-400">
                Score: {stake.worker.worker_profile.overall_trust_score}
                {' '}{getTrendIcon(stake.scoreTrend)}
              </div>
            </Link>
          </div>

          <div className="text-right">
            <div className="font-semibold text-veridex-primary">
              {stake.amount.toLocaleString()} WLD
            </div>
            <div className={`text-sm ${stake.yieldEarned >= 0 ? 'text-veridex-success' : 'text-veridex-error'}`}>
              {stake.yieldEarned >= 0 ? '+' : ''}{stake.yieldEarned} WLD yield
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
