'use client';

import { gradientText, colors } from '@/lib/styles';

interface TrustScoreCardProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.primary;
  if (score >= 40) return colors.warning;
  return colors.rose;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Building';
}

const SIZE = {
  sm: { ring: 80,  fontSize: '24px', pad: '16px' },
  md: { ring: 112, fontSize: '32px', pad: '20px' },
  lg: { ring: 144, fontSize: '42px', pad: '28px' },
};

export default function TrustScoreCard({ score, size = 'lg' }: TrustScoreCardProps) {
  const { ring, fontSize, pad } = SIZE[size];
  const r = ring * 0.45;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreColor = getScoreColor(score);

  return (
    <div
      className="rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(37,99,235,0.06)]"
      style={{ padding: pad }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Ring */}
        <div style={{ position: 'relative', width: ring, height: ring, marginBottom: '16px' }}>
          <svg
            width={ring}
            height={ring}
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Track */}
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={r}
              stroke="rgba(37,99,235,0.1)"
              strokeWidth={size === 'sm' ? 6 : 8}
              fill="none"
            />
            {/* Progress */}
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={r}
              stroke={scoreColor}
              strokeWidth={size === 'sm' ? 6 : 8}
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.6s ease-in-out',
              }}
            />
          </svg>
          {/* Score number */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize,
                fontWeight: 700,
                color: scoreColor,
                lineHeight: 1,
              }}
            >
              {score}
            </span>
          </div>
        </div>

        {/* Labels */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              color: '#1E293B',
              marginBottom: '4px',
            }}
          >
            Trust Score
          </div>
          <div
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              color: scoreColor,
            }}
          >
            {getScoreLabel(score)}
          </div>
        </div>
      </div>
    </div>
  );
}
