'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TrustScoreCard from '@/components/TrustScoreCard';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import ReviewsList from '@/components/ReviewsList';
import JobDescriptionInput from '@/components/JobDescriptionInput';
import ContextualScoreCard from '@/components/ContextualScoreCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { getReputation, getContextualScore } from '@/lib/api';
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
import type { WorkerProfile, Review, ContextualScoreBreakdown } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalStaked, setTotalStaked] = useState(0);
  const [stakerCount, setStakerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [contextualScore, setContextualScore] = useState<{
    fit_score: number;
    breakdown: ContextualScoreBreakdown;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchData = async () => {
      try {
        const data = await getReputation(user.id);
        setProfile(data.profile);
        setReviews(data.reviews || []);
        setTotalStaked(data.totalStaked || 0);
        setStakerCount(data.stakerCount || 0);

        // Keep polling while ingestion is in progress
        if (data.profile?.ingestion_status === 'processing' || data.profile?.ingestion_status === 'pending') {
          pollTimer = setTimeout(fetchData, 3000);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => { if (pollTimer) clearTimeout(pollTimer); };
  }, [user]);

  const handleEvaluateFit = async (jobDescription: string) => {
    if (!user) return;
    setIsEvaluating(true);
    try {
      const result = await getContextualScore(user.id, jobDescription, token || undefined) as any;
      setContextualScore({
        fit_score: result.fit_score,
        breakdown: result.score_breakdown,
      });
    } catch (error) {
      console.error('Failed to evaluate fit:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    router.push('/onboarding');
    return null;
  }

  const githubData = profile.github_data as Record<string, any> || {};

  return (
    <div style={{ background: 'linear-gradient(-45deg, #ffffff, #eff6ff, #f5f3ff, #faf5ff)', backgroundSize: '400% 400%', animation: 'aurora-shift 10s ease infinite', minHeight: '100vh' }}>
      <div style={{ ...col, maxWidth: '1100px' }}>

        {/* ── Header ── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '48px' }}>
          <span style={sectionLabel}>Dashboard</span>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            {user?.display_name || 'Your Profile'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {profile.github_username && (
              <a
                href={`https://github.com/${profile.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '14px',
                  color: colors.textSecondary,
                  textDecoration: 'none',
                }}
              >
                <span>⚙</span> @{profile.github_username}
              </a>
            )}
            {user?.profession_category && (
              <span style={{ ...textSecondary, fontSize: '14px', textTransform: 'capitalize' }}>
                {user.profession_category.replace('_', ' ')}
              </span>
            )}
            {profile.years_experience != null && (
              <span style={{ ...textSecondary, fontSize: '14px' }}>
                {profile.years_experience}y experience
              </span>
            )}
          </div>
        </div>

        {/* ── Ingestion banner ── */}
        {(profile.ingestion_status === 'processing' || profile.ingestion_status === 'pending') && (
          <div
            className="fade-up fade-up-2"
            style={{
              marginBottom: '24px',
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(37,99,235,0.06)',
              border: '1px solid rgba(37,99,235,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '14px',
              color: colors.primary,
            }}
          >
            <LoadingSpinner />
            Syncing your GitHub data and computing trust score…
          </div>
        )}

        {/* ── Row 1: Score + Breakdown ── */}
        <div
          className="fade-up fade-up-2"
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: '24px',
            marginBottom: '24px',
            alignItems: 'start',
          }}
        >
          {/* Left column: score + staked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <TrustScoreCard score={profile.overall_trust_score} />

            <GlassCard style={{ padding: '24px' }}>
              <span style={sectionLabel}>Staked on You</span>
              <div
                style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '28px',
                  fontWeight: 700,
                  ...gradientText,
                  marginBottom: '4px',
                }}
              >
                {totalStaked.toLocaleString()} WLD
              </div>
              <div style={textMuted}>{stakerCount} staker{stakerCount !== 1 ? 's' : ''}</div>
            </GlassCard>

            <GlassCard style={{ padding: '24px' }}>
              <span style={sectionLabel}>Balance</span>
              <div
                style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '28px',
                  fontWeight: 700,
                  ...gradientText,
                  marginBottom: '4px',
                }}
              >
                {(user?.wld_balance || 0).toLocaleString()} WLD
              </div>
              <div style={textMuted}>available</div>
            </GlassCard>
          </div>

          {/* Right column: radar + skills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ScoreBreakdown components={profile.score_components} />

            {/* Skills & Specializations */}
            {(profile.computed_skills?.length > 0 || profile.specializations?.length > 0) && (
              <GlassCard style={{ padding: '28px' }}>
                {profile.specializations?.length > 0 && (
                  <div style={{ marginBottom: profile.computed_skills?.length > 0 ? '20px' : 0 }}>
                    <span style={sectionLabel}>Specializations</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {profile.specializations.map((s) => (
                        <span
                          key={s}
                          style={{
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: colors.primary,
                            background: 'rgba(37,99,235,0.08)',
                            border: '1px solid rgba(37,99,235,0.2)',
                            borderRadius: '8px',
                            padding: '4px 12px',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.computed_skills?.length > 0 && (
                  <div>
                    {profile.specializations?.length > 0 && <div style={separator} />}
                    <span style={sectionLabel}>Skills</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {profile.computed_skills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            fontSize: '13px',
                            color: colors.textSecondary,
                            background: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(37,99,235,0.12)',
                            borderRadius: '8px',
                            padding: '4px 12px',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            )}

            {/* GitHub stats if available */}
            {githubData.public_repos != null && (
              <GlassCard style={{ padding: '28px' }}>
                <span style={sectionLabel}>GitHub Activity</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Repos', value: githubData.public_repos },
                    { label: 'Stars', value: githubData.total_stars ?? githubData.stargazers_count ?? '—' },
                    { label: 'Followers', value: githubData.followers ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-fraunces), Georgia, serif',
                          fontSize: '24px',
                          fontWeight: 700,
                          ...gradientText,
                          marginBottom: '4px',
                        }}
                      >
                        {value}
                      </div>
                      <div style={textMuted}>{label}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        {/* ── Evaluate My Fit ── */}
        <GlassCard className="fade-up fade-up-3" style={{ padding: '40px', marginBottom: '24px' }}>
          <span style={sectionLabel}>AI Fit Evaluation</span>
          <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>
            Evaluate My Fit
          </h2>
          <p style={{ ...textSecondary, marginBottom: '24px' }}>
            Paste a job description to see how your profile matches the requirements.
          </p>
          <JobDescriptionInput onSubmit={handleEvaluateFit} isLoading={isEvaluating} />
          {contextualScore && (
            <div style={{ marginTop: '24px' }}>
              <ContextualScoreCard
                fitScore={contextualScore.fit_score}
                breakdown={contextualScore.breakdown}
              />
            </div>
          )}
        </GlassCard>

        {/* ── Reviews ── */}
        <GlassCard className="fade-up fade-up-4" style={{ padding: '40px', marginBottom: '24px' }}>
          <span style={sectionLabel}>Reviews</span>
          <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '24px' }}>
            Recent Reviews
          </h2>
          <ReviewsList reviews={reviews} />
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
