'use client';

import GlassCard from '@/components/GlassCard';
import { headingSm, textSecondary, textMuted, gradientText, colors } from '@/lib/styles';
import type { Agent } from '@/types';

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const createdDate = new Date(agent.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const copyAgentId = () => {
    navigator.clipboard.writeText(agent.id);
  };

  return (
    <div
      style={{
        borderRadius: '14px',
        border: '1px solid rgba(37,99,235,0.12)',
        background: 'rgba(255,255,255,0.55)',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ ...headingSm, fontSize: '16px', margin: '0 0 8px 0' }}>{agent.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ ...textMuted, fontSize: '12px' }}>Credential ID</span>
            <code
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '12px',
                color: colors.primary,
                background: 'rgba(37,99,235,0.06)',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {agent.id.slice(0, 16)}...
            </code>
            <button
              onClick={copyAgentId}
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '11px',
                color: colors.primary,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Copy
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: '28px',
              fontWeight: 700,
              ...gradientText,
              lineHeight: 1,
            }}
          >
            {agent.derived_score}
          </div>
          <div style={{ ...textMuted, fontSize: '11px', marginTop: '4px' }}>Derived Score</div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(37,99,235,0.1)',
          marginTop: '14px',
          paddingTop: '12px',
        }}
      >
        <span style={{ ...textSecondary, fontSize: '13px' }}>
          70% of your Veridex score
        </span>
        <span style={{ ...textMuted, fontSize: '13px' }}>
          Created {createdDate}
        </span>
      </div>
    </div>
  );
}
