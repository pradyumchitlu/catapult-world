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
  identity_assurance: 0,
  evidence_depth: 0,
  consistency: 0,
  recency: 0,
  employer_outcomes: 0,
  staking: 0,
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
  const linkedinData = (profile.linkedin_data || {}) as Record<string, any>;
  const otherPlatforms = (profile.other_platforms || {}) as Record<string, any>;
  const scoreComponents = (profile.score_components || {}) as Record<string, any>;
  const hasGithubEvidence = Boolean(
    profile.github_username || githubData.username || githubData.profile?.id
  );
  const hasManualEvidence = Object.keys(linkedinData).length > 0 || Object.keys(otherPlatforms).length > 0;
  const hasStoredEvidence = hasGithubEvidence || hasManualEvidence;
  const hasLegacyComponents = Boolean(
    scoreComponents.developer_competence !== undefined ||
    scoreComponents.collaboration !== undefined ||
    scoreComponents.specialization_depth !== undefined ||
    scoreComponents.activity_recency !== undefined ||
    scoreComponents.peer_trust !== undefined
  );
  const missingRubricComponents = (
    scoreComponents.identity_assurance === undefined ||
    scoreComponents.evidence_depth === undefined ||
    scoreComponents.consistency === undefined ||
    scoreComponents.recency === undefined ||
    scoreComponents.employer_outcomes === undefined ||
    scoreComponents.staking === undefined
  );

  if (!hasStoredEvidence) {
    return false;
  }

  const missingComponentData = Object.keys(scoreComponents).length === 0;
  const noDerivedSignals =
    (profile.computed_skills?.length || 0) === 0 &&
    (profile.specializations?.length || 0) === 0 &&
    profile.years_experience == null;

  return (
    profile.ingestion_status === 'pending' ||
    profile.ingestion_status === 'failed' ||
    hasLegacyComponents ||
    missingRubricComponents ||
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
  const [isRerunningPipeline, setIsRerunningPipeline] = useState(false);
  const [contextualScore, setContextualScore] = useState<{
    fit_score: number;
    breakdown: ContextualScoreBreakdown;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const applyReputationSnapshot = (data: {
    profile: WorkerProfile | null;
    reviews: Review[];
    totalStaked: number;
    stakerCount: number;
  }) => {
    setProfile(data.profile);
    setReviews(data.reviews || []);
    setTotalStaked(data.totalStaked || 0);
    setStakerCount(data.stakerCount || 0);
  };

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

        applyReputationSnapshot(data);

        if (
          token &&
          data.profile &&
          !recoveryTriggeredRef.current &&
          shouldRecoverProfile(data.profile)
        ) {
          recoveryTriggeredRef.current = true;
          setSyncMessage('Refreshing your verification pipeline and recomputing your score…');

          try {
            await triggerIngestion(user.id, token);
            if (!cancelled) {
              pollTimer = setTimeout(fetchData, 1200);
              return;
            }
          } catch (error) {
            const message = error instanceof Error
              ? error.message
              : 'Failed to refresh verification pipeline';
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

  const handleRerunPipeline = async () => {
    if (!user || !token || isRerunningPipeline) {
      return;
    }

    setIsRerunningPipeline(true);
    setSyncMessage('Re-running your full verification pipeline from GitHub and saved evidence…');
    setProfile((current) => current ? { ...current, ingestion_status: 'processing' } : current);

    try {
      const result = await triggerIngestion(user.id, token);
      const refreshed = await getReputation(user.id);
      applyReputationSnapshot(refreshed);
      setSyncMessage(result.warning || null);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to rerun verification pipeline';
      setSyncMessage(message);
    } finally {
      setIsRerunningPipeline(false);
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
  const otherPlatforms = profile.other_platforms as Record<string, any> || {};
  const githubContributions = githubData.contributions as Record<string, any> || {};
  const githubCollaboration = githubData.collaboration as Record<string, any> || {};
  const scoreComponents = normalizeScoreComponents(profile.score_components);
  const groupedScores = scoreComponents.grouped_scores || {
    evidence: Math.round(
      (
        (scoreComponents.identity_assurance * 0.10) +
        (scoreComponents.evidence_depth * 0.10) +
        (scoreComponents.consistency * 0.10) +
        (scoreComponents.recency * 0.05)
      ) / 0.35
    ),
    employer: scoreComponents.employer_outcomes,
    staking: scoreComponents.staking,
    veridex: profile.overall_trust_score,
  };
  const topLanguages = Array.isArray(githubData.languages) ? githubData.languages.slice(0, 6) : [];
  const linkedinExperiences = Array.isArray(linkedinData.experiences) ? linkedinData.experiences : [];
  const portfolioEntries = Array.isArray(otherPlatforms.portfolio) ? otherPlatforms.portfolio : [];
  const manualProjects = Array.isArray(otherPlatforms.projects) ? otherPlatforms.projects : [];
  const workSamples = Array.isArray(otherPlatforms.work_samples) ? otherPlatforms.work_samples : [];
  const uploadedFiles = Array.isArray(otherPlatforms.uploaded_files) ? otherPlatforms.uploaded_files : [];
  const manualEvidenceEntries = [...portfolioEntries, ...manualProjects, ...workSamples];
  const manualProofBackedCount = manualEvidenceEntries.filter((entry) =>
    Boolean(
      entry?.url ||
      (Array.isArray(entry?.proof_urls) && entry.proof_urls.length > 0) ||
      (typeof entry?.description === 'string' && entry.description.trim().length > 20)
    )
  ).length;
  const manualSkills = Array.isArray(linkedinData.top_skills) && linkedinData.top_skills.length > 0
    ? linkedinData.top_skills
    : (Array.isArray(linkedinData.skills) ? linkedinData.skills : []);
  const manualEvidenceUrls = manualEvidenceEntries
    .flatMap((entry) => [entry?.url, ...(Array.isArray(entry?.proof_urls) ? entry.proof_urls : [])])
    .filter((value, index, array): value is string => typeof value === 'string' && value.trim().length > 0 && array.indexOf(value) === index)
    .slice(0, 4);
  const hasManualEvidence =
    linkedinExperiences.length > 0 ||
    manualEvidenceEntries.length > 0 ||
    uploadedFiles.length > 0;
  const clientReviewCount = reviews.filter((review) =>
    Array.isArray(review.reviewer?.roles) && review.reviewer.roles.includes('client')
  ).length;
  const scoreInsights = [
    {
      label: 'Identity',
      score: scoreComponents.identity_assurance,
      detail: `World ID verified · ${profile.github_username ? 'GitHub connected' : 'GitHub not connected'} · ${hasManualEvidence ? 'manual evidence present' : 'no manual evidence yet'}`,
    },
    {
      label: 'Evidence',
      score: scoreComponents.evidence_depth,
      detail: `${githubData.significant_repo_count ?? githubData.repos?.length ?? 0} notable repos · ${manualProofBackedCount} proof-backed manual entries · ${profile.years_experience ?? 0}y experience`,
    },
    {
      label: 'Consistency',
      score: scoreComponents.consistency,
      detail: `${githubContributions.total_commits_last_year ?? 0} commits last year · ${githubContributions.active_months ?? 0} active months · ${linkedinExperiences.length + manualEvidenceEntries.length} saved evidence records`,
    },
    {
      label: 'Recency',
      score: scoreComponents.recency,
      detail: `${githubContributions.commits_last_30_days ?? 0} commits / 30d · ${githubContributions.commits_last_90_days ?? 0} commits / 90d · ${reviews.length} active reviews`,
    },
    {
      label: 'Employer Reviews',
      score: scoreComponents.employer_outcomes,
      detail: `${clientReviewCount} client review${clientReviewCount !== 1 ? 's' : ''} currently affect employer outcomes; rating 4-5 is positive, 3 is neutral, 1-2 is negative.`,
    },
    {
      label: 'Staking',
      score: scoreComponents.staking,
      detail: `${totalStaked.toLocaleString()} WLD across ${stakerCount} active stake${stakerCount !== 1 ? 's' : ''}, weighted by each staker's current trust score`,
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
    (profile.github_username ? `@${profile.github_username}` : 'Your Profile');

  return (
    <div style={{ minHeight: '100vh' }}>
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
            {profile.years_experience != null && (
              <span style={{ ...textSecondary, fontSize: '14px' }}>
                {profile.years_experience}y experience
              </span>
            )}
            {token && (
              <button
                onClick={handleRerunPipeline}
                disabled={isRerunningPipeline || isSyncing}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isRerunningPipeline || isSyncing ? <LoadingSpinner /> : <span>↻</span>}
                Re-run Pipeline
              </button>
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
            {syncMessage || 'Running your verification pipeline and computing score…'}
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
              <span style={sectionLabel}>Stored Scores</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Evidence', value: groupedScores.evidence },
                  { label: 'Employer', value: groupedScores.employer },
                  { label: 'Staking', value: groupedScores.staking },
                  { label: 'Veridex', value: groupedScores.veridex },
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

            {hasManualEvidence && (
              <GlassCard style={{ padding: '28px' }}>
                <span style={sectionLabel}>Manual Evidence Used</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Work History', value: linkedinExperiences.length },
                    { label: 'Projects', value: manualProjects.length },
                    { label: 'Portfolio', value: portfolioEntries.length },
                    { label: 'Work Samples', value: workSamples.length },
                    { label: 'Proof-Backed', value: manualProofBackedCount },
                    { label: 'Uploads', value: uploadedFiles.length },
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

                {manualSkills.length > 0 && (
                  <>
                    <div style={separator} />
                    <span style={sectionLabel}>LinkedIn Skills</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {manualSkills.slice(0, 10).map((skill) => (
                        <span
                          key={skill}
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
                          {skill}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {linkedinExperiences.length > 0 && (
                  <>
                    <div style={separator} />
                    <span style={sectionLabel}>Parsed Work History</span>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {linkedinExperiences.slice(0, 3).map((experience, index) => (
                        <div
                          key={`${experience.title || 'experience'}-${index}`}
                          style={{
                            borderRadius: '12px',
                            border: '1px solid rgba(37,99,235,0.12)',
                            background: 'rgba(255,255,255,0.55)',
                            padding: '14px 16px',
                          }}
                        >
                          <div style={{ ...headingSm, fontSize: '14px' }}>
                            {experience.title || 'Role'}{experience.company ? ` · ${experience.company}` : ''}
                          </div>
                          <div style={{ ...textSecondary, fontSize: '13px', marginTop: '4px' }}>
                            {[experience.start_date, experience.end_date].filter(Boolean).join(' - ') || 'Dates not provided'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {manualEvidenceUrls.length > 0 && (
                  <>
                    <div style={separator} />
                    <span style={sectionLabel}>Proof Links Used</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {manualEvidenceUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            fontSize: '13px',
                            color: colors.primary,
                            textDecoration: 'none',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </>
                )}
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
