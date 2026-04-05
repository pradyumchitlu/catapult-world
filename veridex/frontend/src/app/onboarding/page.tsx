'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GitHubConnectButton from '@/components/GitHubConnectButton';
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

const PROFESSION_CATEGORIES = [
  { id: 'software', label: 'Software Engineering' },
  { id: 'writing', label: 'Writing & Content' },
  { id: 'design', label: 'Design' },
  { id: 'trades', label: 'Trades & Services' },
  { id: 'other', label: 'Other' },
];

const ROLES = [
  { id: 'worker', label: 'Worker', description: 'Build reputation and get hired' },
  { id: 'staker', label: 'Staker', description: 'Stake WLD on workers you believe in' },
  { id: 'client', label: 'Client', description: 'Find and evaluate workers' },
];

const STEPS = ['Profile', 'Profession', 'Connect'];

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
          <LoadingSpinner />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['worker']);
  const [professionCategory, setProfessionCategory] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const githubStatus = searchParams.get('github');
    if (githubStatus === 'connected') {
      setGithubConnected(true);
      setStep(3);
    }
  }, [searchParams]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((role) => role !== roleId) : [...prev, roleId]
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
      triggerIngestion(result.user.id, token).catch(() => {});
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(-45deg, #ffffff, #eff6ff, #f5f3ff, #faf5ff)',
        backgroundSize: '400% 400%',
        animation: 'aurora-shift 10s ease infinite',
      }}
    >
      <div style={{ ...col, maxWidth: '560px', paddingTop: '80px', paddingBottom: '80px' }}>
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

        <div
          className="fade-up fade-up-2"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}
        >
          {STEPS.map((label, index) => {
            const currentStep = index + 1;
            const isDone = currentStep < step;
            const isActive = currentStep === step;

            return (
              <div key={currentStep} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    {isDone ? 'OK' : currentStep}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? colors.primary : colors.textTertiary,
                    }}
                  >
                    {label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    style={{
                      width: '32px',
                      height: '1px',
                      background: currentStep < step ? colors.success : 'rgba(37,99,235,0.15)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <GlassCard className="fade-up fade-up-3" style={{ padding: '40px' }}>
          {step === 1 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>Who are you?</h2>
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
                  onChange={(event) => setDisplayName(event.target.value)}
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
                        <div style={{ ...textSecondary, fontSize: '13px' }}>{role.description}</div>
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
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>Your profession</h2>
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
                {PROFESSION_CATEGORIES.map((category) => {
                  const selected = professionCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setProfessionCategory(category.id)}
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
                      <div
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: selected ? colors.primary : colors.textPrimary,
                        }}
                      >
                        {category.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1 }}>
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!professionCategory}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>Connect platforms</h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                Link your accounts for stronger trust signals. This is optional, and reviews can still build your reputation.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <GitHubConnectButton
                  onConnect={() => setGithubConnected(true)}
                  isConnected={githubConnected}
                />

                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(37,99,235,0.1)',
                    background: 'rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  }}
                >
                  <div>
                    <div style={{ ...headingSm, fontSize: '14px' }}>LinkedIn</div>
                    <div style={{ ...textSecondary, fontSize: '12px' }}>Coming soon</div>
                  </div>
                </div>
              </div>

              <div style={separator} />

              <p style={{ ...textSecondary, fontSize: '13px', marginBottom: '24px' }}>
                No developer accounts? No problem, reviews from clients build your reputation just as effectively.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(2)} className="btn-secondary" style={{ flex: 1 }}>
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isLoading ? <LoadingSpinner /> : 'Finish Setup'}
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
