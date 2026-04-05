'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StakePortfolio from '@/components/StakePortfolio';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import {
  col,
  headingLg,
  headingMd,
  headingSm,
  sectionLabel,
  separator,
  textSecondary,
  textMuted,
  gradientText,
  colors,
} from '@/lib/styles';
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const totalStaked = stakes.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        {/* ── Header ── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '48px' }}>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            Staker Portfolio
          </h1>
          <p style={textSecondary}>
            Track your stakes, returns, and the workers you believe in.
          </p>
        </div>

        {/* ── Summary Cards ── */}
        <div
          className="fade-up fade-up-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          <GlassCard style={{ padding: '28px' }}>
            <span style={sectionLabel}>WLD Balance</span>
            <div
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: '32px',
                fontWeight: 700,
                ...gradientText,
              }}
            >
              {wldBalance.toLocaleString()} WLD
            </div>
          </GlassCard>

          <GlassCard style={{ padding: '28px' }}>
            <span style={sectionLabel}>Total Staked</span>
            <div
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: '32px',
                fontWeight: 700,
                ...gradientText,
              }}
            >
              {totalStaked.toLocaleString()} WLD
            </div>
          </GlassCard>

          <GlassCard style={{ padding: '28px' }}>
            <span style={sectionLabel}>Total Returns</span>
            <div
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: '32px',
                fontWeight: 700,
                color: totalReturns >= 0 ? colors.success : '#F43F5E',
              }}
            >
              {totalReturns >= 0 ? '+' : ''}{totalReturns.toLocaleString()} WLD
            </div>
          </GlassCard>
        </div>

        {/* ── Active Stakes ── */}
        <GlassCard className="fade-up fade-up-3" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={sectionLabel}>Active Stakes</span>
            <Link href="/browse" className="btn-primary" style={{ fontSize: '13px', padding: '8px 20px' }}>
              Find Workers to Stake
            </Link>
          </div>
          <StakePortfolio stakes={stakes} />
        </GlassCard>

        {/* ── How Staking Works ── */}
        <GlassCard className="fade-up fade-up-4">
          <span style={sectionLabel}>How Staking Works</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '32px',
            }}
          >
            {[
              {
                num: '01',
                title: 'Stake',
                body: 'Stake WLD on workers you believe will perform well. Your conviction becomes an economic signal of trust.',
              },
              {
                num: '02',
                title: 'Earn',
                body: 'Earn returns when the workers you staked on see their trust score improve over time.',
              },
              {
                num: '03',
                title: 'Risk',
                body: 'If a worker\'s reputation declines, your stake is at risk. Skin in the game keeps everyone honest.',
              },
              {
                num: '04',
                title: 'Withdraw',
                body: 'Withdraw your stake anytime after the 7-day lock period. Returns are calculated at withdrawal.',
              },
            ].map((step) => (
              <div key={step.num}>
                <span
                  style={{
                    ...gradientText,
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    display: 'block',
                    marginBottom: '10px',
                  }}
                >
                  {step.num}
                </span>
                <p style={{ ...headingSm, margin: '0 0 8px 0' }}>{step.title}</p>
                <p style={{ ...textSecondary, fontSize: '14px', lineHeight: '1.65' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
