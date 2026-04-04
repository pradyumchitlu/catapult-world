import type { CSSProperties } from 'react';

// ── Design-11 Shared Style Tokens ��──────────────────────────────────────────

export const glassSection: CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.85)',
  boxShadow:
    '0 4px 24px rgba(37,99,235,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
  borderRadius: '20px',
  padding: '48px',
};

export const glassCardCompact: CSSProperties = {
  ...glassSection,
  padding: '32px',
};

export const gradientText: CSSProperties = {
  background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: '#1D4ED8',
  marginBottom: '24px',
  display: 'block',
};

export const separator: CSSProperties = {
  border: 'none',
  borderTop: '1px solid rgba(37,99,235,0.12)',
  margin: '28px 0',
};

export const bodyText: CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '16px',
  lineHeight: '1.75',
  color: '#1E293B',
};

export const col: CSSProperties = {
  maxWidth: '680px',
  margin: '0 auto',
  padding: '64px 24px',
};

// ── Typography ────��─────────────────────────────���───────────────────────────

export const headingLg: CSSProperties = {
  fontFamily: 'var(--font-fraunces), Georgia, serif',
  fontSize: '64px',
  fontWeight: 700,
  lineHeight: '1.05',
  letterSpacing: '-0.02em',
  margin: 0,
  ...gradientText,
};

export const headingMd: CSSProperties = {
  fontFamily: 'var(--font-fraunces), Georgia, serif',
  fontSize: '28px',
  fontWeight: 700,
  lineHeight: '1.2',
  letterSpacing: '-0.01em',
  margin: 0,
  ...gradientText,
};

export const headingSm: CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '16px',
  fontWeight: 600,
  color: '#1E293B',
  margin: 0,
};

export const textMuted: CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '12px',
  color: '#94A3B8',
  margin: 0,
};

export const textSecondary: CSSProperties = {
  ...bodyText,
  color: '#475569',
  margin: 0,
};

// ── Stat Number ──────���──────────────────���────────────────────��──────────────

export const statNumber: CSSProperties = {
  fontFamily: 'var(--font-fraunces), Georgia, serif',
  fontSize: '32px',
  fontWeight: 700,
  lineHeight: '1',
  letterSpacing: '-0.02em',
  margin: 0,
  ...gradientText,
};

// ─�� Colors ────────────────────��─────────────────────────────────────────────

export const colors = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  accent: '#1D4ED8',
  success: '#10B981',
  cyan: '#0EA5E9',
  rose: '#F43F5E',
  warning: '#F59E0B',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
} as const;
