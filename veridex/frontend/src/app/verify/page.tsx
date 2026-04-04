'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WorldIDButton from '@/components/WorldIDButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import {
  col,
  headingLg,
  headingSm,
  sectionLabel,
  separator,
  textSecondary,
  gradientText,
} from '@/lib/styles';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleVerificationSuccess = (result: { user: any; isNewUser: boolean; token: string }) => {
    setError(null);
    login(result.token, result.user);

    if (result.isNewUser) {
      router.push('/onboarding');
    } else {
      router.push('/dashboard');
    }
  };

  const handleVerificationError = (error: string) => {
    setError(error);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '64px' }}>
          <h1 style={{ ...headingLg, margin: '0 0 28px 0' }}>
            Verify your <em style={{ fontStyle: 'italic' }}>identity.</em>
          </h1>

          <p
            style={{
              ...textSecondary,
              maxWidth: '560px',
              margin: '0',
            }}
          >
            Prove you&apos;re a unique human with World ID. This is the
            foundation of your trust profile — one person, one identity.
          </p>

          <div className="fade-up fade-up-2" style={{ marginTop: '36px' }}>
            <WorldIDButton
              onSuccess={handleVerificationSuccess}
              onError={handleVerificationError}
            />

            {error && (
              <div
                style={{
                  marginTop: '24px',
                  padding: '12px 20px',
                  backgroundColor: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  borderRadius: '12px',
                  color: '#F43F5E',
                  fontSize: '14px',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Why World ID ───────────────────────────────────────── */}
        <GlassCard className="fade-up fade-up-3">
          <span style={sectionLabel}>Why World ID</span>

          {[
            {
              num: '01',
              title: 'Human Verification',
              body: 'Cryptographic proof that you\'re a real person — not a bot, not a duplicate account.',
            },
            {
              num: '02',
              title: 'One Person, One Identity',
              body: 'Sybil-resistant by design. Each human gets exactly one Veridex profile, preventing reputation gaming.',
            },
            {
              num: '03',
              title: 'Privacy Preserving',
              body: 'Zero-knowledge proofs verify your humanity without exposing personal data. Your identity stays yours.',
            },
          ].map((item, i, arr) => (
            <div key={item.num}>
              <div style={{ padding: i === 0 ? '0 0 28px 0' : '28px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '36px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      ...gradientText,
                      fontFamily: 'var(--font-fraunces), Georgia, serif',
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      lineHeight: '1.75',
                      minWidth: '24px',
                    }}
                  >
                    {item.num}
                  </span>
                  <div>
                    <p style={{ ...headingSm, margin: '0 0 10px 0' }}>
                      {item.title}
                    </p>
                    <p style={textSecondary}>{item.body}</p>
                  </div>
                </div>
              </div>
              {i < arr.length - 1 && <div style={separator} />}
            </div>
          ))}
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
