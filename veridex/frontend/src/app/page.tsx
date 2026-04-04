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
      <div style={{ ...col, maxWidth: '860px', paddingTop: '0' }}>
        {/* ── 0. Splash ────────────────────────────────────────────── */}
        <div
          style={{
            height: '100vh',
            marginTop: '-72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 0,
            opacity: splashOpacity,
            transition: 'opacity 0.05s linear',
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
            }}
          >
            Veridex
          </h1>
        </div>

        {/* ── 1. Hero ─────────────────────────────────────────────── */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingTop: '64px',
            paddingBottom: '64px',
            background: 'linear-gradient(-45deg, #ffffff, #eff6ff, #f5f3ff, #faf5ff)',
            backgroundSize: '400% 400%',
            animation: 'aurora-shift 10s ease infinite',
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
            and every agent has real skin in the game.
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/verify" className="btn-primary">
              Get Started
            </Link>
            <Link href="/browse" className="btn-secondary">
              Browse Workers
            </Link>
          </div>
        </div>

        {/* ── 2. Protocol Flow ──────────────────────────────────────── */}
        <GlassCard className="fade-up fade-up-2" style={{ marginBottom: '64px' }}>
          <span style={sectionLabel}>How It Works</span>

          {[
            {
              num: '01',
              title: 'Verify',
              body: 'Prove you\'re human with World ID proof-of-personhood. Connect GitHub, add professional credentials, or build reputation purely through peer reviews.',
            },
            {
              num: '02',
              title: 'Score',
              body: 'An auditable algorithm computes your trust score from verified signals — developer activity, peer reviews, and staking data. Six components, weighted by what\'s available.',
            },
            {
              num: '03',
              title: 'Stake',
              body: 'People who believe in you stake WLD on your reputation. Staking creates skin-in-the-game — higher stakes mean more impact on your trust score. Three integrity mechanisms prevent gaming.',
            },
            {
              num: '04',
              title: 'Evaluate',
              body: 'Clients evaluate workers through an AI chatbot grounded in real data. Paste a job description and get a contextual fit score with evidence — not guesswork.',
            },
          ].map((step, i, arr) => (
            <div key={step.num}>
              <div style={{ padding: i === 0 ? '0 0 32px 0' : '32px 0' }}>
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
                    {step.num}
                  </span>
                  <div>
                    <p style={{ ...headingSm, margin: '0 0 10px 0' }}>
                      {step.title}
                    </p>
                    <p style={textSecondary}>{step.body}</p>
                  </div>
                </div>
              </div>
              {i < arr.length - 1 && <div style={separator} />}
            </div>
          ))}
        </GlassCard>

        {/* ── 3. Capabilities ──────────────────────────────────────── */}
        <GlassCard className="fade-up fade-up-2" style={{ marginBottom: '64px' }}>
          <span style={sectionLabel}>Capabilities</span>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              {
                title: 'Portable Identity',
                body: 'Your trust score travels with you. No more starting from zero on every new platform, marketplace, or collaboration.',
              },
              {
                title: 'Staked Reviews',
                body: 'Reviewers back their feedback with WLD. Higher stakes mean more impact on your score — and more accountability.',
              },
              {
                title: 'Social Staking',
                body: 'Anyone can stake WLD on workers they believe in. Your network\'s conviction becomes economic signal.',
              },
              {
                title: 'AI Evaluation',
                body: 'Clients chat with an AI grounded in real data — repos, reviews, scores. No hallucinated credentials.',
              },
              {
                title: 'Agent Delegation',
                body: 'Spawn AI agents that inherit 70% of your trust score. Full accountability — anyone can trace agent to human.',
              },
              {
                title: 'Open Protocol',
                body: 'External APIs let any platform query trust scores and agent identities. Build on top of the trust layer.',
              },
            ].map((feature, i, arr) => (
              <div key={feature.title}>
                <div
                  style={{
                    display: 'flex',
                    gap: '32px',
                    padding: i === 0 ? '0 0 28px 0' : '28px 0',
                    alignItems: 'flex-start',
                  }}
                >
                  <p
                    style={{
                      ...headingSm,
                      fontSize: '15px',
                      minWidth: '180px',
                      flexShrink: 0,
                    }}
                  >
                    {feature.title}
                  </p>
                  <p
                    style={{
                      ...textSecondary,
                      fontSize: '15px',
                      lineHeight: '1.6',
                    }}
                  >
                    {feature.body}
                  </p>
                </div>
                {i < arr.length - 1 && <div style={separator} />}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── 4. Integrity Pull-quote ────────────────────────────────── */}
        <GlassCard className="fade-up fade-up-3" style={{ marginBottom: '64px' }}>
          <span style={sectionLabel}>Trust Integrity</span>

          <div style={{ position: 'relative', marginBottom: '32px' }}>
            <span
              style={{
                ...gradientText,
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: '120px',
                fontWeight: 700,
                lineHeight: '0.7',
                display: 'block',
                marginBottom: '-16px',
                opacity: 0.35,
              }}
            >
              &ldquo;
            </span>
            <blockquote
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: '28px',
                fontWeight: 400,
                fontStyle: 'italic',
                lineHeight: '1.35',
                letterSpacing: '-0.01em',
                color: '#1E293B',
                margin: 0,
              }}
            >
              Trust that can&apos;t be gamed is trust worth building on.
            </blockquote>
          </div>

          <p style={{ ...textSecondary, margin: '0 0 20px 0' }}>
            Three integrity mechanisms prevent manipulation. Reviews are weighted
            by reviewer credibility and stake amount — a low-trust reviewer with a
            tiny stake barely moves the needle. Mutual reviews are automatically
            detected and flagged.
          </p>
          <p style={textSecondary}>
            Stake concentration has diminishing returns — the first 100 WLD from
            one staker counts fully, but each additional 100 WLD is worth
            progressively less. No single actor can inflate a score.
          </p>
        </GlassCard>

        {/* ── 5. CTA ────────────────────────────────────────────────── */}
        <GlassCard className="fade-up fade-up-3" style={{ marginBottom: '64px' }}>
          <span style={sectionLabel}>Get Started</span>

          <h2 style={{ ...headingMd, margin: '0 0 20px 0' }}>
            Build your portable trust profile today.
          </h2>

          <p
            style={{
              ...textSecondary,
              maxWidth: '480px',
              margin: '0 0 32px 0',
            }}
          >
            Verify with World ID, connect your credentials, and start building
            reputation that belongs to you. Every verified user starts with 1,000
            WLD.
          </p>

          <Link
            href="/verify"
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '16px',
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

        {/* ── 6. Footer ─────────────────────────────────────────────── */}
        <GlassCard>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
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

            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0',
                flexWrap: 'wrap',
              }}
            >
              {['Protocol', 'Browse', 'Dashboard', 'API', 'Agents'].map(
                (item, i) => (
                  <span
                    key={item}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    {i > 0 && (
                      <span
                        style={{
                          color: 'rgba(37,99,235,0.2)',
                          margin: '0 10px',
                        }}
                      >
                        ·
                      </span>
                    )}
                    <a
                      href="#"
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '13px',
                        color: '#64748B',
                        textDecoration: 'none',
                      }}
                    >
                      {item}
                    </a>
                  </span>
                )
              )}
            </nav>

            <span style={textMuted}>Powered by World ID</span>
          </div>
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
