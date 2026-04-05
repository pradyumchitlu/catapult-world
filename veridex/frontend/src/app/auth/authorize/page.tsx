'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import WorldIDButton from '@/components/WorldIDButton';
import { useAuth } from '@/contexts/AuthContext';
import { completeOAuthAuthorize, validateOAuthAuthorize } from '@/lib/api';
import { col, colors, gradientText, headingLg, headingMd, sectionLabel, textMuted, textSecondary } from '@/lib/styles';
import type { OAuthAuthorizeValidationResponse } from '@/types';

const AUTH_SOURCE = 'veridex-auth';

function buildRedirectUrl(redirectUri: string, code: string, state: string) {
  const nextUrl = new URL(redirectUri);
  nextUrl.searchParams.set('code', code);
  nextUrl.searchParams.set('state', state);
  return nextUrl.toString();
}

function OAuthAuthorizePageContent() {
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading, login } = useAuth();
  const [validation, setValidation] = useState<OAuthAuthorizeValidationResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  const requestParams = useMemo(() => ({
    client_id: searchParams.get('client_id') || '',
    redirect_uri: searchParams.get('redirect_uri') || '',
    scope: searchParams.get('scope') || 'openid profile',
    state: searchParams.get('state') || '',
    response_type: 'code' as const,
    code_challenge: searchParams.get('code_challenge') || '',
    code_challenge_method: 'S256' as const,
    response_mode: (searchParams.get('response_mode') as 'query' | 'web_message' | null) || 'web_message',
  }), [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const runValidation = async () => {
      setIsValidating(true);
      setValidationError(null);

      try {
        const nextValidation = await validateOAuthAuthorize(requestParams);
        if (!cancelled) {
          setValidation(nextValidation);
        }
      } catch (error) {
        if (!cancelled) {
          setValidationError(error instanceof Error ? error.message : 'Failed to validate request');
        }
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    };

    runValidation();

    return () => {
      cancelled = true;
    };
  }, [requestParams]);

  const finishAuthorization = async () => {
    if (!token || !validation) {
      return;
    }

    setIsAuthorizing(true);
    setAuthError(null);

    try {
      const result = await completeOAuthAuthorize(requestParams, token);
      const redirectUrl = buildRedirectUrl(result.redirect_uri, result.code, result.state);

      if (result.response_mode === 'web_message' && typeof window !== 'undefined' && window.opener) {
        const targetOrigin = new URL(result.redirect_uri).origin;
        window.opener.postMessage({
          source: AUTH_SOURCE,
          type: 'authorization_response',
          code: result.code,
          state: result.state,
        }, targetOrigin);
        window.close();
        return;
      }

      window.location.href = redirectUrl;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authorization failed');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleVerificationSuccess = (result: { user: any; token: string }) => {
    login(result.token, result.user);
    setLoginMessage('Signed in to Veridex. You can now approve this app.');
    setAuthError(null);
  };

  if (authLoading || isValidating) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ ...col, maxWidth: '960px' }}>
        <div className="fade-up fade-up-1" style={{ marginBottom: '28px' }}>
          <span style={sectionLabel}>Embedded Login</span>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 14px 0' }}>
            Approve access to <em style={{ fontStyle: 'italic' }}>{validation?.app.name || 'this app'}</em>
          </h1>
          <p style={{ ...textSecondary, maxWidth: '620px' }}>
            This flow uses your existing Veridex account. It does not change how the normal Veridex app signs you in or stores your session.
          </p>
        </div>

        {validationError ? (
          <GlassCard className="fade-up fade-up-2">
            <span style={sectionLabel}>Request Error</span>
            <p style={{ ...headingMd, marginBottom: '12px' }}>This authorization request is invalid.</p>
            <p style={textSecondary}>{validationError}</p>
          </GlassCard>
        ) : (
          <div
            className="fade-up fade-up-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 0.8fr)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            <GlassCard>
              <span style={sectionLabel}>App Request</span>
              <div style={{ display: 'grid', gap: '18px' }}>
                <div>
                  <p style={{ ...textMuted, marginBottom: '6px' }}>Application</p>
                  <p style={{ ...headingMd, marginBottom: 0 }}>{validation?.app.name}</p>
                </div>
                <div>
                  <p style={{ ...textMuted, marginBottom: '6px' }}>Redirect URI</p>
                  <p style={{ ...textSecondary, wordBreak: 'break-all' }}>{validation?.redirect_uri}</p>
                </div>
                <div>
                  <p style={{ ...textMuted, marginBottom: '6px' }}>Requested scopes</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {(validation?.scope || '').split(' ').filter(Boolean).map((scope) => (
                      <span
                        key={scope}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '999px',
                          background: 'rgba(37,99,235,0.09)',
                          color: colors.primaryDark,
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(37,99,235,0.12)',
                  }}
                >
                  <p style={{ ...textMuted, marginBottom: '8px' }}>What the partner app receives</p>
                  <p style={{ ...textSecondary, marginBottom: 0 }}>
                    Veridex user identity only in v1: <span style={gradientText}>sub</span>, <span style={gradientText}>veridex_user_id</span>, and basic profile fields when `profile` scope is requested.
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <span style={sectionLabel}>Your Status</span>
              {user && token ? (
                <>
                  <p style={{ ...headingMd, marginBottom: '10px' }}>
                    Signed in as {user.display_name || 'Veridex user'}
                  </p>
                  <p style={{ ...textSecondary, marginBottom: '20px' }}>
                    Approving this request will mint a one-time authorization code for the partner app. Your normal Veridex app session stays unchanged.
                  </p>
                  <button
                    onClick={finishAuthorization}
                    disabled={isAuthorizing}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {isAuthorizing ? 'Authorizing...' : 'Approve And Continue'}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ ...headingMd, marginBottom: '10px' }}>Sign in to continue</p>
                  <p style={{ ...textSecondary, marginBottom: '20px' }}>
                    Use the same Veridex login you already use today. After sign-in, this page will let you approve the app request.
                  </p>
                  <WorldIDButton
                    onSuccess={handleVerificationSuccess}
                    onError={(message) => setAuthError(message)}
                  />
                </>
              )}

              {loginMessage && (
                <p style={{ ...textSecondary, color: colors.success, marginTop: '16px' }}>{loginMessage}</p>
              )}

              {authError && (
                <p style={{ ...textSecondary, color: colors.rose, marginTop: '16px' }}>{authError}</p>
              )}

              <button
                type="button"
                onClick={() => window.close()}
                style={{
                  marginTop: '16px',
                  border: 'none',
                  background: 'transparent',
                  color: colors.textMuted,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense
      fallback={(
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      )}
    >
      <OAuthAuthorizePageContent />
    </Suspense>
  );
}
