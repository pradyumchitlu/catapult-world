'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TrustScoreCard from '@/components/TrustScoreCard';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import ReviewsList from '@/components/ReviewsList';
import JobDescriptionInput from '@/components/JobDescriptionInput';
import ContextualScoreCard from '@/components/ContextualScoreCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { getReputation, getContextualScore, triggerIngestion } from '@/lib/api';
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
import type { WorkerProfile, Review, ContextualScoreBreakdown, ScoreComponents } from '@/types';

const EMPTY_SCORE_COMPONENTS: ScoreComponents = {
  developer_competence: 0,
  collaboration: 0,
  consistency: 0,
  specialization_depth: 0,
  activity_recency: 0,
  peer_trust: 0,
};

function normalizeScoreComponents(
  components: Partial<ScoreComponents> | null | undefined
): ScoreComponents {
  return {
    ...EMPTY_SCORE_COMPONENTS,
    ...(components || {}),
  };
}

function shouldRecoverProfile(profile: WorkerProfile | null): boolean {
  if (!profile) {
    return false;
  }

  const githubData = (profile.github_data || {}) as Record<string, any>;
  const hasGithubEvidence = Boolean(
    profile.github_username || githubData.username || githubData.profile?.id
  );

  if (!hasGithubEvidence) {
    return false;
  }

  const missingComponentData = Object.keys(profile.score_components || {}).length === 0;
  const noDerivedSignals =
    (profile.computed_skills?.length || 0) === 0 &&
    (profile.specializations?.length || 0) === 0 &&
    profile.years_experience == null;

  return (
    profile.ingestion_status === 'pending' ||
    profile.ingestion_status === 'failed' ||
    (profile.overall_trust_score === 0 && missingComponentData && noDerivedSignals)
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const recoveryTriggeredRef = useRef(false);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalStaked, setTotalStaked] = useState(0);
  const [stakerCount, setStakerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
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
    recoveryTriggeredRef.current = false;
    setSyncMessage(null);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const data = await getReputation(user.id);
        if (cancelled) return;

        setProfile(data.profile);
        setReviews(data.reviews || []);
        setTotalStaked(data.totalStaked || 0);
        setStakerCount(data.stakerCount || 0);

        if (
          token &&
          data.profile &&
          !recoveryTriggeredRef.current &&
          shouldRecoverProfile(data.profile)
        ) {
          recoveryTriggeredRef.current = true;
          setSyncMessage('Refreshing your GitHub data and recomputing your trust score…');

          try {
            await triggerIngestion(user.id, token);
            if (!cancelled) {
              pollTimer = setTimeout(fetchData, 1200);
              return;
            }
          } catch (error) {
            const message = error instanceof Error
              ? error.message
              : 'Failed to refresh GitHub analysis';
            setSyncMessage(message);
          }
        }

        // Keep polling while ingestion is in progress
        if (data.profile?.ingestion_status === 'processing' || data.profile?.ingestion_status === 'pending') {
          pollTimer = setTimeout(fetchData, 3000);
        } else if (data.profile?.ingestion_status === 'completed' && data.profile?.overall_trust_score > 0) {
          setSyncMessage(null);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [user, token]);

  const handleEvaluateFit = async (jobDescription: string) => {
    if (!user) return;
    setIsEvaluating(true);
    try {
      const result = await getContextualScore(user.id, jobDescription, token || undefined);
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
  const linkedinData = profile.linkedin_data as Record<string, any> || {};
  const githubContributions = githubData.contributions as Record<string, any> || {};
  const githubCollaboration = githubData.collaboration as Record<string, any> || {};
  const scoreComponents = normalizeScoreComponents(profile.score_components);
  const topLanguages = Array.isArray(githubData.languages) ? githubData.languages.slice(0, 6) : [];
  const hasLinkedInVerification = Boolean(
    linkedinData.sub ||
    linkedinData.email ||
    linkedinData.oauth_connected_at ||
    linkedinData.verification?.provider === 'linkedin'
  );
  const scoreInsights = [
    {
      label: 'Dev Skills',
      score: scoreComponents.developer_competence,
      detail: `Languages: ${topLanguages.slice(0, 3).join(', ') || 'none yet'} · ${githubData.significant_repo_count ?? githubData.repos?.length ?? 0} notable repos · ${githubData.total_stars ?? 0} stars`,
    },
    {
      label: 'Collaboration',
      score: scoreComponents.collaboration,
      detail: `${githubCollaboration.repos_contributed_to ?? 0} external repos · ${githubCollaboration.prs_merged_to_external_repos ?? 0} merged PRs · ${githubCollaboration.issues_opened_on_external_repos ?? 0} issues`,
    },
    {
      label: 'Consistency',
      score: scoreComponents.consistency,
      detail: `${githubContributions.total_commits_last_year ?? 0} commits last year · ${githubContributions.active_months ?? 0} active months · ${githubContributions.longest_streak_days ?? 0}-day streak`,
    },
    {
      label: 'Specialization',
      score: scoreComponents.specialization_depth,
      detail: profile.specializations?.length
        ? profile.specializations.slice(0, 3).join(', ')
        : 'Derived from your strongest GitHub languages and projects.',
    },
    {
      label: 'Activity',
      score: scoreComponents.activity_recency,
      detail: `${githubContributions.commits_last_30_days ?? 0} commits / 30d · ${githubContributions.commits_last_90_days ?? 0} commits / 90d · recency ${githubContributions.recent_activity_score ?? 0}`,
    },
    {
      label: 'Peer Trust',
      score: scoreComponents.peer_trust,
      detail: `${reviews.length} active reviews · ${totalStaked.toLocaleString()} WLD staked`,
    },
  ];
  const githubEvidence = [
    { label: 'Repos', value: githubData.public_repos ?? githubData.profile?.public_repos ?? '—' },
    { label: 'Stars', value: githubData.total_stars ?? '—' },
    { label: 'Followers', value: githubData.followers ?? githubData.profile?.followers ?? '—' },
    { label: 'Commits / Year', value: githubContributions.total_commits_last_year ?? '—' },
    { label: 'Active Months', value: githubContributions.active_months ?? '—' },
    { label: 'External Repos', value: githubCollaboration.repos_contributed_to ?? '—' },
  ];
  const isSyncing = profile.ingestion_status === 'processing' || profile.ingestion_status === 'pending';
  const profileName =
    user?.display_name ||
    (typeof githubData.name === 'string' && githubData.name.trim()) ||
    (typeof linkedinData.name === 'string' && linkedinData.name.trim()) ||
    (profile.github_username ? `@${profile.github_username}` : 'Your Profile');

  return (
    <div style={{ background: 'linear-gradient(-45deg, #ffffff, #eff6ff, #f5f3ff, #faf5ff)', backgroundSize: '400% 400%', animation: 'aurora-shift 10s ease infinite', minHeight: '100vh' }}>
      <div style={{ ...col, maxWidth: '1100px' }}>

        {/* ── Header ── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '48px' }}>
          <span style={sectionLabel}>Dashboard</span>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            {profileName}
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
            {hasLinkedInVerification && (
              <span
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#0A66C2',
                  background: 'rgba(10,102,194,0.08)',
                  border: '1px solid rgba(10,102,194,0.18)',
                  borderRadius: '999px',
                  padding: '4px 10px',
                }}
              >
                LinkedIn verified
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
        {(isSyncing || syncMessage) && (
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
            {isSyncing ? <LoadingSpinner /> : <span style={{ fontSize: '18px' }}>↻</span>}
            {syncMessage || 'Syncing your GitHub data and computing trust score…'}
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
            <ScoreBreakdown components={scoreComponents} />

            <GlassCard style={{ padding: '28px' }}>
              <span style={sectionLabel}>How It Was Calculated</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {scoreInsights.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: '14px',
                      border: '1px solid rgba(37,99,235,0.12)',
                      background: 'rgba(255,255,255,0.55)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ ...headingSm, fontSize: '14px' }}>{item.label}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: item.score >= 60 ? colors.primary : item.score >= 40 ? colors.warning : colors.textTertiary,
                        }}
                      >
                        {item.score}
                      </span>
                    </div>
                    <p style={{ ...textSecondary, fontSize: '13px', marginTop: '8px' }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>

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

            {hasLinkedInVerification && (
              <GlassCard style={{ padding: '28px' }}>
                <span style={sectionLabel}>LinkedIn Verification</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ ...headingSm, fontSize: '16px' }}>
                    {linkedinData.name || 'LinkedIn account connected'}
                  </div>
                  {linkedinData.email && (
                    <div style={{ ...textSecondary, fontSize: '14px' }}>
                      {linkedinData.email}
                    </div>
                  )}
                  <p style={{ ...textSecondary, fontSize: '13px', margin: 0 }}>
                    Ownership was verified through LinkedIn OpenID Connect. LinkedIn only gives us
                    basic identity data here, so richer career history and skills still need manual
                    evidence later.
                  </p>
                </div>
              </GlassCard>
            )}

            {/* GitHub stats if available */}
            {profile.github_username && (
              <GlassCard style={{ padding: '28px' }}>
                <span style={sectionLabel}>GitHub Evidence Used</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {githubEvidence.map(({ label, value }) => (
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

                {topLanguages.length > 0 && (
                  <>
                    <div style={separator} />
                    <span style={sectionLabel}>Top Languages</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {topLanguages.map((language) => (
                        <span
                          key={language}
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
                          {language}
                        </span>
                      ))}
                    </div>
                  </>
                )}
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
