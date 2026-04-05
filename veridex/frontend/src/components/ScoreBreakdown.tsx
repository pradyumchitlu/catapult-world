'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import GlassCard from '@/components/GlassCard';
import { sectionLabel, headingSm, colors } from '@/lib/styles';
import type { ScoreComponents } from '@/types';

interface ScoreBreakdownProps {
  components: ScoreComponents;
}

const COMPONENT_KEYS = [
  'identity_assurance',
  'evidence_depth',
  'consistency',
  'recency',
  'employer_outcomes',
  'staking',
] as const;

type FlatScoreKey = typeof COMPONENT_KEYS[number];

const COMPONENT_LABELS: Record<FlatScoreKey, string> = {
  identity_assurance: 'Identity',
  evidence_depth: 'Evidence',
  consistency: 'Consistency',
  recency: 'Recency',
  employer_outcomes: 'Employer Reviews',
  staking: 'Staking',
};

function getBarColor(value: number): string {
  if (value >= 80) return colors.success;
  if (value >= 60) return colors.primary;
  if (value >= 40) return colors.warning;
  return colors.rose;
}

export default function ScoreBreakdown({ components }: ScoreBreakdownProps) {
  const entries = COMPONENT_KEYS.map((key) => [key, components[key] ?? 0] as const);
  const hasData = entries.some(([, v]) => v > 0);

  const chartData = entries.map(([key, value]) => ({
    component: COMPONENT_LABELS[key],
    value,
    fullMark: 100,
  }));

  return (
    <GlassCard style={{ padding: '28px' }}>
      <span style={sectionLabel}>Score Breakdown</span>

      {/* Radar Chart — only render when there is non-zero data.
          recharts generates d="Z" (invalid SVG path) when all values are 0,
          because the polygon degenerates to a single point. */}
      <div style={{ height: '240px', marginBottom: '24px' }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="rgba(37,99,235,0.12)" />
              <PolarAngleAxis
                dataKey="component"
                tick={{ fill: colors.textTertiary, fontSize: 11, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: colors.textMuted, fontSize: 9 }}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '28px', opacity: 0.4 }}>📊</span>
            </div>
            <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '13px', color: colors.textMuted, margin: 0 }}>
              Score components will appear after the verification pipeline runs
            </p>
          </div>
        )}
      </div>

      {/* Component bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '12px',
                  color: colors.textTertiary,
                }}
              >
                {COMPONENT_LABELS[key]}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: getBarColor(value),
                }}
              >
                {value}
              </span>
            </div>
            <div
              style={{
                height: '4px',
                borderRadius: '2px',
                background: 'rgba(37,99,235,0.1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${value}%`,
                  borderRadius: '2px',
                  background: getBarColor(value),
                  transition: 'width 0.6s ease-in-out',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
