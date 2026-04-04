'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GitHubConnectButton from '@/components/GitHubConnectButton';
import LinkedInConnectButton from '@/components/LinkedInConnectButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile, triggerIngestion } from '@/lib/api';
import {
  col,
  headingMd,
  headingSm,
  sectionLabel,
  separator,
  textSecondary,
  gradientText,
  colors,
} from '@/lib/styles';

const ONBOARDING_DRAFT_KEY = 'veridex_onboarding_draft';

interface OnboardingDraft {
  displayName: string;
  selectedRoles: string[];
  professionCategory: string | null;
  step: number;
  githubConnected: boolean;
  linkedinConnected: boolean;
}

const PROFESSION_CATEGORIES = [
  { id: 'software', label: 'Software Engineering', icon: '💻' },
  { id: 'writing', label: 'Writing & Content', icon: '✍️' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'trades', label: 'Trades & Services', icon: '🔧' },
  { id: 'other', label: 'Other', icon: '📋' },
];

const ROLES = [
  { id: 'worker', label: 'Worker', description: 'Build reputation and get hired' },
  { id: 'staker', label: 'Staker', description: 'Stake WLD on workers you believe in' },
  { id: 'client', label: 'Client', description: 'Find and evaluate workers' },
];

const STEPS = ['Profile', 'Profession', 'Connect'];

function getDraftStep(
  displayName: string,
  selectedRoles: string[],
  professionCategory: string | null,
  fallbackStep = 1
): number {
  if (!displayName.trim() || selectedRoles.length === 0) {
    return 1;
  }

  if (!professionCategory) {
    return 2;
  }

  return Math.max(3, fallbackStep);
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}><LoadingSpinner /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading, updateUser } = useAuth();
  const githubStatus = searchParams.get('github');
  const linkedinStatus = searchParams.get('linkedin');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['worker']);
  const [professionCategory, setProfessionCategory] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [githubMessage, setGithubMessage] = useState<string | null>(null);
  const [linkedinMessage, setLinkedinMessage] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || hasHydratedDraft) {
      return;
    }

    let draft: Partial<OnboardingDraft> | null = null;
    try {
      const rawDraft = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (rawDraft) {
        draft = JSON.parse(rawDraft) as Partial<OnboardingDraft>;
      }
    } catch (error) {
      console.warn('Failed to restore onboarding draft:', error);
    }

    const nextDisplayName = typeof draft?.displayName === 'string'
      ? draft.displayName
      : (user.display_name || '');
    const nextSelectedRoles = Array.isArray(draft?.selectedRoles) && draft.selectedRoles.length > 0
      ? draft.selectedRoles
      : (user.roles?.length ? user.roles : ['worker']);
    const nextProfessionCategory = typeof draft?.professionCategory === 'string'
      ? draft.professionCategory
      : (user.profession_category || null);
    const nextGithubConnected = Boolean(draft?.githubConnected) || githubStatus === 'connected';
    const nextLinkedinConnected = Boolean(draft?.linkedinConnected) || linkedinStatus === 'connected';
    const fallbackStep = typeof draft?.step === 'number' ? draft.step : 1;

    setDisplayName(nextDisplayName);
    setSelectedRoles(nextSelectedRoles);
    setProfessionCategory(nextProfessionCategory);
    setGithubConnected(nextGithubConnected);
    setLinkedinConnected(nextLinkedinConnected);
    setStep(getDraftStep(nextDisplayName, nextSelectedRoles, nextProfessionCategory, fallbackStep));
    setHasHydratedDraft(true);
  }, [user, githubStatus, linkedinStatus, hasHydratedDraft]);

  useEffect(() => {
    if (githubStatus === 'connected') {
      setGithubConnected(true);
      setGithubMessage('GitHub connected. We will sync your repositories and calculate your trust score after setup.');
    } else if (githubStatus === 'error') {
      setGithubMessage('GitHub connection did not complete. You can try again anytime.');
    }
  }, [githubStatus]);

  useEffect(() => {
    if (linkedinStatus === 'connected') {
      setLinkedinConnected(true);
      setLinkedinMessage('LinkedIn connected. We verified your account ownership and basic profile. Rich work history still needs manual evidence later.');
    } else if (linkedinStatus === 'error') {
      setLinkedinMessage('LinkedIn connection did not complete. You can try again anytime.');
    }
  }, [linkedinStatus]);

  useEffect(() => {
    if (!user || !hasHydratedDraft) {
      return;
    }

    const draft: OnboardingDraft = {
      displayName,
      selectedRoles,
      professionCategory,
      step,
      githubConnected,
      linkedinConnected,
    };

    sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  }, [
    displayName,
    selectedRoles,
    professionCategory,
    step,
    githubConnected,
    linkedinConnected,
    user,
    hasHydratedDraft,
  ]);

  useEffect(() => {
    if (!professionCategory && step > 2) {
      setStep(2);
      return;
    }

    if ((!displayName.trim() || selectedRoles.length === 0) && step > 1) {
      setStep(1);
    }
  }, [displayName, selectedRoles, professionCategory, step]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleComplete = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await updateProfile(
        {
          display_name: displayName,
          roles: selectedRoles,
          profession_category: professionCategory || 'other',
        },
        token
      );
      updateUser(result.user);
      sessionStorage.removeItem(ONBOARDING_DRAFT_KEY);
      // OAuth callbacks already try to sync; this keeps onboarding self-healing.
      if (githubConnected || linkedinConnected) {
        triggerIngestion(result.user.id, token).catch(() => {});
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(-45deg, #ffffff, #eff6ff, #f5f3ff, #faf5ff)', backgroundSize: '400% 400%', animation: 'aurora-shift 10s ease infinite' }}>
      <div style={{ ...col, maxWidth: '560px', paddingTop: '80px', paddingBottom: '80px' }}>

        {/* Header */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '40px' }}>
          <span style={sectionLabel}>Onboarding</span>
          <h1
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: '42px',
              fontWeight: 700,
              lineHeight: '1.15',
              letterSpacing: '-0.02em',
              margin: '0 0 12px 0',
              ...gradientText,
            }}
          >
            Welcome to Veridex.
          </h1>
          <p style={{ ...textSecondary, maxWidth: '440px' }}>
            Let&apos;s set up your trust profile in a few quick steps.
          </p>
        </div>

        {/* Step indicator */}
        <div className="fade-up fade-up-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          {STEPS.map((label, i) => {
            const s = i + 1;
            const isDone = s < step;
            const isActive = s === step;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      background: isDone
                        ? colors.success
                        : isActive
                        ? colors.primary
                        : 'rgba(37,99,235,0.08)',
                      color: isDone || isActive ? '#fff' : colors.textMuted,
                      transition: 'all 0.3s ease',
                      boxShadow: isActive ? '0 0 0 4px rgba(37,99,235,0.12)' : 'none',
                    }}
                  >
                    {isDone ? '✓' : s}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? colors.primary : colors.textTertiary,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: '32px',
                      height: '1px',
                      background: s < step ? colors.success : 'rgba(37,99,235,0.15)',
                      transition: 'background 0.3s ease',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <GlassCard className="fade-up fade-up-3" style={{ padding: '40px' }}>

          {/* ── Step 1: Name & Roles ── */}
          {step === 1 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>
                Who are you?
              </h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                Pick a display name and the roles you&apos;re interested in.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    ...headingSm,
                    fontSize: '13px',
                    color: colors.textTertiary,
                    display: 'block',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Chen"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input"
                  style={{ fontSize: '15px' }}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label
                  style={{
                    ...headingSm,
                    fontSize: '13px',
                    color: colors.textTertiary,
                    display: 'block',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  I am a...
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ROLES.map((role) => {
                    const selected = selectedRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '12px',
                          border: `1.5px solid ${selected ? colors.primary : 'rgba(37,99,235,0.15)'}`,
                          background: selected ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.5)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: selected ? colors.primary : colors.textPrimary,
                            marginBottom: '2px',
                          }}
                        >
                          {role.label}
                        </div>
                        <div style={{ ...textSecondary, fontSize: '13px' }}>
                          {role.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!displayName.trim() || selectedRoles.length === 0}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Profession ── */}
          {step === 2 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>
                Your profession
              </h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                What kind of work do you do? This helps tailor your trust profile.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '28px',
                }}
              >
                {PROFESSION_CATEGORIES.map((cat) => {
                  const selected = professionCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setProfessionCategory(cat.id)}
                      style={{
                        padding: '20px 12px',
                        borderRadius: '12px',
                        border: `1.5px solid ${selected ? colors.primary : 'rgba(37,99,235,0.15)'}`,
                        background: selected ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.5)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{cat.icon}</div>
                      <div
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: selected ? colors.primary : colors.textPrimary,
                        }}
                      >
                        {cat.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!professionCategory}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Connect Platforms ── */}
          {step === 3 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>
                Connect platforms
              </h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                Link your accounts for stronger trust signals. Totally optional — you can build reputation through reviews alone.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <GitHubConnectButton
                  onConnect={() => setGithubConnected(true)}
                  isConnected={githubConnected}
                />

                {githubMessage && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: `1px solid ${githubStatus === 'error' ? 'rgba(244,63,94,0.24)' : 'rgba(37,99,235,0.16)'}`,
                      background: githubStatus === 'error'
                        ? 'rgba(244,63,94,0.06)'
                        : 'rgba(37,99,235,0.05)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '13px',
                      color: githubStatus === 'error' ? colors.rose : colors.primary,
                    }}
                  >
                    {githubMessage}
                  </div>
                )}

                <LinkedInConnectButton
                  onConnect={() => setLinkedinConnected(true)}
                  isConnected={linkedinConnected}
                />

                {linkedinMessage && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: `1px solid ${linkedinStatus === 'error' ? 'rgba(244,63,94,0.24)' : 'rgba(10,102,194,0.22)'}`,
                      background: linkedinStatus === 'error'
                        ? 'rgba(244,63,94,0.06)'
                        : 'rgba(10,102,194,0.05)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '13px',
                      color: linkedinStatus === 'error' ? colors.rose : '#0A66C2',
                    }}
                  >
                    {linkedinMessage}
                  </div>
                )}
              </div>

              <div style={separator} />

              <p style={{ ...textSecondary, fontSize: '13px', marginBottom: '24px' }}>
                No developer accounts? No problem — reviews from clients build your reputation just as effectively.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(2)} className="btn-secondary" style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading || !displayName.trim() || selectedRoles.length === 0 || !professionCategory}
                  className="btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isLoading ? <LoadingSpinner /> : 'Finish Setup →'}
                </button>
              </div>
            </div>
          )}
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
