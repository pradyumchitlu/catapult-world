'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import RotatingText from '@/components/RotatingText';
import GlassCard from '@/components/GlassCard';
import {
  gradientText,
  sectionLabel,
  separator,
  col,
  headingLg,
  headingMd,
  headingSm,
  textMuted,
  textSecondary,
} from '@/lib/styles';

export default function LandingPage() {
  const [splashOpacity, setSplashOpacity] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const fade = 1 - Math.min(window.scrollY / (window.innerHeight * 0.5), 1);
      setSplashOpacity(fade);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── 0. Splash (fixed behind everything) ───────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 0,
          opacity: splashOpacity,
          transition: 'opacity 0.05s linear',
          pointerEvents: 'none',
        }}
      >
        <h1
          className="fade-up"
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(72px, 12vw, 140px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            ...gradientText,
            paddingBottom: '8px',
            paddingRight: '1.5vw',
          }}
        >
          Veridex
        </h1>
      </div>

      {/* Spacer so content starts below the splash */}
      <div style={{ height: '100vh' }} />

      <div style={{ ...col, maxWidth: '1000px', paddingTop: '0' }}>
        {/* ── 1. Hero ─────────────────────────────────────────────── */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            paddingTop: '80px',
            paddingBottom: '100px',
          }}
        >
          <h1 style={{ ...headingLg, margin: '0 0 28px 0' }}>
            Trust,{' '}
            <em style={{ fontStyle: 'italic' }}>
              <RotatingText
                words={['staked.', 'verified.', 'portable.', 'earned.']}
                interval={2500}
              />
            </em>
          </h1>

          <p
            style={{
              ...textSecondary,
              maxWidth: '560px',
              margin: '0 0 36px 0',
            }}
          >
            A World ID-powered reputation layer where every review, every score,
            and every credentialed agent has a real human behind it.
          </p>

          <Link href="/verify" className="btn-primary">
            Get Started
          </Link>
        </div>

        {/* ── 2. How It Works — full-width, 2×2 inner grid ───────────── */}
        <GlassCard className="fade-up fade-up-2" style={{ marginBottom: '20px' }}>
          <span style={sectionLabel}>How It Works</span>
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
                title: 'Verify',
                body: "Prove you're human with World ID proof-of-personhood. Connect GitHub, add professional credentials, or build reputation purely through peer reviews.",
              },
              {
                num: '02',
                title: 'Score',
                body: "An auditable algorithm computes your Veridex score from verified signals — developer activity, peer reviews, and staking data. Six components, weighted by what's available.",
              },
              {
                num: '03',
                title: 'Stake',
                body: "People who believe in you stake ETH on your reputation. Staking creates skin-in-the-game — higher stakes mean more impact on your Veridex score. Three integrity mechanisms prevent gaming.",
              },
              {
                num: '04',
                title: 'Evaluate',
                body: "Clients evaluate workers through an AI chatbot grounded in real data. Paste a job description and get a contextual fit score with evidence — not guesswork.",
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

        {/* ── 3–5. Bento grid ──────────────────────────────────────────── */}
        <div className="bento-grid">

          {/* Capabilities — left, row 1 */}
          <GlassCard
            className="fade-up fade-up-2"
            style={{ gridColumn: '1', gridRow: '1' }}
          >
            <span style={sectionLabel}>Capabilities</span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px 32px',
              }}
            >
              {[
                {
                  title: 'Portable Identity',
                  body: 'Your Veridex score travels with you across every platform and collaboration.',
                },
                {
                  title: 'Staked Reviews',
                  body: 'Reviewers back their feedback with ETH — higher stakes mean more accountability.',
                },
                {
                  title: 'Social Staking',
                  body: "Anyone can stake ETH on workers they believe in. Your network's conviction becomes signal.",
                },
                {
                  title: 'AI Evaluation',
                  body: 'Clients chat with an AI grounded in real data — repos, reviews, scores. No guesswork.',
                },
                {
                  title: 'Agent Delegation',
                  body: 'Issue traceable agent credentials with delegated trust, bounded access, and clear human liability.',
                },
                {
                  title: 'Open Protocol',
                  body: 'External APIs let any platform verify Veridex scores, agent credentials, and the human behind an automated action.',
                },
              ].map((feature) => (
                <div key={feature.title}>
                  <p style={{ ...headingSm, fontSize: '14px', margin: '0 0 6px 0' }}>
                    {feature.title}
                  </p>
                  <p style={{ ...textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Trust Integrity — right, spans rows 1+2 */}
          <GlassCard
            className="fade-up fade-up-2"
            style={{ gridColumn: '2', gridRow: '1 / 3' }}
          >
            <span style={sectionLabel}>Trust Integrity</span>

            <div style={{ position: 'relative', marginBottom: '28px' }}>
              <span
                style={{
                  ...gradientText,
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '96px',
                  fontWeight: 700,
                  lineHeight: '0.7',
                  display: 'block',
                  marginBottom: '-12px',
                  opacity: 0.3,
                }}
              >
                &ldquo;
              </span>
              <blockquote
                style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '22px',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  lineHeight: '1.4',
                  letterSpacing: '-0.01em',
                  color: '#1E293B',
                  margin: 0,
                }}
              >
                Trust that can&apos;t be gamed is trust worth building on.
              </blockquote>
            </div>

            <div style={{ ...separator, margin: '24px 0' }} />

            <p style={{ ...textSecondary, fontSize: '14px', lineHeight: '1.7', margin: '0 0 16px 0' }}>
              Three integrity mechanisms prevent manipulation. Reviews are weighted
              by reviewer credibility and stake amount — a low-trust reviewer with a
              tiny stake barely moves the needle. Mutual reviews are automatically
              detected and flagged.
            </p>
            <p style={{ ...textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Stake concentration has diminishing returns — the first 0.1 ETH from
              one staker counts fully, but each additional 0.1 ETH is worth
              progressively less. No single actor can inflate a score.
            </p>
          </GlassCard>

          {/* Get Started — left, row 2 */}
          <GlassCard
            className="fade-up fade-up-3"
            style={{ gridColumn: '1', gridRow: '2' }}
          >
            <span style={sectionLabel}>Get Started</span>

            <h2 style={{ ...headingMd, margin: '0 0 16px 0' }}>
              Bring the wallet you already use.
            </h2>

            <p style={{ ...textSecondary, maxWidth: '420px', margin: '0 0 28px 0' }}>
              Connect MetaMask or the World App wallet, verify with World ID,
              and start building portable trust that stays with you across
              platforms, teams, and agents.
            </p>

            <Link
              href="/verify"
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '15px',
                fontWeight: 500,
                color: '#2563EB',
                textDecoration: 'none',
                borderBottom: '1.5px solid rgba(37,99,235,0.4)',
                paddingBottom: '2px',
                transition: 'border-color 0.15s ease',
              }}
            >
              Verify Your Identity →
            </Link>
          </GlassCard>

        </div>

        {/* ── 6. Footer ─────────────────────────────────────────────── */}
        <GlassCard style={{ marginBottom: '64px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px',
            }}
          >
            <div>
              <span style={sectionLabel}>Developer API</span>
              <h2 style={{ ...headingMd, margin: '0 0 16px 0', maxWidth: '420px' }}>
                Public trust surfaces for profiles, reviews, and delegated agents.
              </h2>
              <p style={{ ...textSecondary, maxWidth: '480px', margin: '0 0 28px 0' }}>
                Query Veridex users, inspect reputation context, read active
                reviews, and verify which human stands behind a delegated agent.
                The documented routes are public read-only GET endpoints built
                for straightforward integrations.
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '18px',
                }}
              >
                <Link href="/api-docs" className="btn-primary">
                  Open API Docs
                </Link>
                <Link
                  href="/api-docs"
                  style={{
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#2563EB',
                    textDecoration: 'none',
                    borderBottom: '1.5px solid rgba(37,99,235,0.4)',
                    paddingBottom: '2px',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  Explore Endpoints →
                </Link>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '18px',
                alignContent: 'start',
              }}
            >
              {[
                {
                  title: 'Trust Profiles',
                  body: 'Resolve public trust surfaces with Veridex scores, summaries, staking totals, and profile metadata.',
                },
                {
                  title: 'Reputation Context',
                  body: 'Pull broader worker profile payloads, review context, and aggregated stake totals for public lookups.',
                },
                {
                  title: 'Review Feeds',
                  body: 'Read active worker reviews in a clean JSON shape with reviewer display metadata attached.',
                },
                {
                  title: 'Agent Verification',
                  body: 'Follow a delegated agent credential back to its parent human and current derived score snapshot.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    padding: '18px 18px 20px',
                    borderRadius: '18px',
                    background: 'rgba(255,255,255,0.34)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <p style={{ ...headingSm, fontSize: '14px', margin: '0 0 8px 0' }}>
                    {item.title}
                  </p>
                  <p style={{ ...textSecondary, fontSize: '13px', lineHeight: '1.65', margin: 0 }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...separator,
              margin: '28px 0 0 0',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              paddingTop: '18px',
            }}
          >
            <span
              style={{
                ...gradientText,
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontStyle: 'italic',
                fontSize: '17px',
                fontWeight: 700,
              }}
            >
              Veridex
            </span>
            <span style={textMuted}>Powered by World ID</span>
          </div>
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
