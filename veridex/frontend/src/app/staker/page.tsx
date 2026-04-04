'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StakePortfolio from '@/components/StakePortfolio';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Stake, User, WorkerProfile } from '@/types';

interface StakeWithWorker extends Stake {
  worker: User & { worker_profile: WorkerProfile };
  scoreTrend: 'up' | 'down' | 'stable';
  yieldEarned: number;
}

export default function StakerPage() {
  const [stakes, setStakes] = useState<StakeWithWorker[]>([]);
  const [wldBalance, setWldBalance] = useState(0);
  const [totalReturns, setTotalReturns] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch staker portfolio data
    const fetchPortfolio = async () => {
      try {
        // Placeholder data
        setWldBalance(750);
        setTotalReturns(125);
        setStakes([
          {
            id: '1',
            staker_id: 'current-user',
            worker_id: '1',
            amount: 250,
            status: 'active',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            worker: {
              id: '1',
              world_id_hash: 'hash1',
              display_name: 'Alice Developer',
              roles: ['worker'],
              profession_category: 'software',
              wld_balance: 1000,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              worker_profile: {
                id: '1',
                user_id: '1',
                github_username: 'alice',
                github_data: {},
                linkedin_data: {},
                other_platforms: {},
                computed_skills: ['TypeScript', 'React'],
                specializations: ['Full-stack'],
                years_experience: 5,
                overall_trust_score: 85,
                score_components: {
                  developer_competence: 90,
                  collaboration: 82,
                  consistency: 85,
                  specialization_depth: 88,
                  activity_recency: 92,
                  peer_trust: 78,
                },
                ingestion_status: 'completed',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
            scoreTrend: 'up',
            yieldEarned: 45,
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const totalStaked = stakes.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Staker Portfolio</h1>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="text-sm text-worldcoin-gray-400 mb-1">WLD Balance</div>
          <div className="text-3xl font-bold text-veridex-primary">
            {wldBalance.toLocaleString()} WLD
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-worldcoin-gray-400 mb-1">Total Staked</div>
          <div className="text-3xl font-bold">
            {totalStaked.toLocaleString()} WLD
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-worldcoin-gray-400 mb-1">Total Returns</div>
          <div className={`text-3xl font-bold ${totalReturns >= 0 ? 'text-veridex-success' : 'text-veridex-error'}`}>
            {totalReturns >= 0 ? '+' : ''}{totalReturns.toLocaleString()} WLD
          </div>
        </div>
      </div>

      {/* Active Stakes */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Active Stakes</h2>
          <Link href="/browse" className="btn-primary text-sm">
            Find Workers to Stake
          </Link>
        </div>
        <StakePortfolio stakes={stakes} />
      </div>

      {/* Info Section */}
      <div className="card bg-veridex-primary/10 border-veridex-primary/30">
        <h3 className="font-semibold mb-2">How Staking Works</h3>
        <ul className="text-sm text-worldcoin-gray-300 space-y-2">
          <li>• Stake WLD on workers you believe will perform well</li>
          <li>• Earn returns when their trust score improves</li>
          <li>• Lose stake if their reputation declines</li>
          <li>• Withdraw anytime (subject to 7-day lock period)</li>
        </ul>
      </div>
    </div>
  );
}
