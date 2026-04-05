'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorldIDButton from '@/components/WorldIDButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { ButtonRotate } from '@/components/ui/button-rotate';
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
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user && !pendingRedirect) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router, pendingRedirect]);

  useEffect(() => {
    if (pendingRedirect) {
      router.push(pendingRedirect);
    }
  }, [pendingRedirect, router]);

  const handleVerificationSuccess = (result: { user: any; isNewUser: boolean; token: string }) => {
    setError(null);
    const destination = result.isNewUser ? '/onboarding' : '/dashboard';
    setPendingRedirect(destination);
    login(result.token, result.user);
  };

  const handleVerificationError = (message: string) => {
    setError(message);
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
        <div
          className="fade-up fade-up-1"
          style={{
            marginBottom: '64px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 380px)',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          <div>
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
              foundation of your trust profile - one person, one identity.
            </p>

            {error && (
              <div
                style={{
                  marginTop: '24px',
                  maxWidth: '560px',
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

          <div className="fade-up fade-up-2" style={{ display: 'flex', justifyContent: 'center' }}>
            <WorldIDButton
              onSuccess={handleVerificationSuccess}
              onError={handleVerificationError}
              className="bg-transparent hover:bg-transparent p-0 shadow-none"
            >
              <ButtonRotate
                label="VERIFY WORLD ID"
                interactive={false}
                className="scale-[1.08] md:scale-[1.16]"
                buttonClassName="h-[280px] w-[280px] md:h-[320px] md:w-[320px]"
                centerClassName="h-[112px] w-[112px] md:h-[124px] md:w-[124px]"
              />
            </WorldIDButton>
          </div>
        </div>

        <GlassCard className="fade-up fade-up-3">
          <span style={sectionLabel}>Why World ID</span>

          {[
            {
              num: '01',
              title: 'Human Verification',
              body: 'Cryptographic proof that you are a real person - not a bot, not a duplicate account.',
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
