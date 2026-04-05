'use client';

import { headingSm, textSecondary, textMuted, gradientText, colors } from '@/lib/styles';
import type { Agent, AgentActionType } from '@/types';

interface AgentCardProps {
  agent: Agent;
  isBusy?: boolean;
  onAction?: (actionType: Exclude<AgentActionType, 'reset_demo'>) => void;
  onReset?: () => void;
}

const ACTION_BUTTONS: Array<{
  label: string;
  actionType: Exclude<AgentActionType, 'reset_demo'>;
  tone: string;
}> = [
  { label: 'No Issue', actionType: 'no_issue', tone: 'rgba(16,185,129,0.12)' },
  { label: 'Warning', actionType: 'warning', tone: 'rgba(245,158,11,0.12)' },
  { label: 'Failure', actionType: 'failure', tone: 'rgba(249,115,22,0.12)' },
  { label: 'Severe', actionType: 'severe_failure', tone: 'rgba(244,63,94,0.12)' },
];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function AgentCard({ agent, isBusy = false, onAction, onReset }: AgentCardProps) {
  const createdDate = new Date(agent.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const lastActionDate = agent.last_action_at
    ? new Date(agent.last_action_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const copyAgentId = () => {
    navigator.clipboard.writeText(agent.id);
  };

  const statusColor = agent.status === 'active' ? colors.primary : '#64748B';
  const identifierPreview = agent.identifier || 'No identifier saved';

  return (
    <div
      style={{
        borderRadius: '14px',
        border: '1px solid rgba(37,99,235,0.12)',
        background: 'rgba(255,255,255,0.55)',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ ...headingSm, fontSize: '16px', margin: '0 0 8px 0' }}>{agent.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
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
            <span
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '11px',
                color: statusColor,
                background: 'rgba(37,99,235,0.08)',
                border: '1px solid rgba(37,99,235,0.14)',
                borderRadius: '999px',
                padding: '4px 8px',
                textTransform: 'capitalize',
              }}
            >
              {agent.status}
            </span>
          </div>
          <div style={{ ...textSecondary, fontSize: '13px', marginBottom: '6px' }}>
            {agent.deployment_surface} · {agent.identifier_type}
          </div>
          <div style={{ ...textMuted, fontSize: '12px', maxWidth: '420px', overflowWrap: 'anywhere' }}>
            {identifierPreview}
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
            {agent.agent_score}
          </div>
          <div style={{ ...textMuted, fontSize: '11px', marginTop: '4px' }}>Agent Score</div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(37,99,235,0.1)',
          marginTop: '14px',
          paddingTop: '12px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ ...textMuted, fontSize: '11px', marginBottom: '4px' }}>Reputation at Risk</div>
            <div style={{ ...textSecondary, fontSize: '13px' }}>{formatPercent(agent.inheritance_fraction)}</div>
          </div>
          <div>
            <div style={{ ...textMuted, fontSize: '11px', marginBottom: '4px' }}>Current Penalty</div>
            <div style={{ ...textSecondary, fontSize: '13px' }}>{agent.current_penalty_points} pts</div>
          </div>
          <div>
            <div style={{ ...textMuted, fontSize: '11px', marginBottom: '4px' }}>Max Penalty</div>
            <div style={{ ...textSecondary, fontSize: '13px' }}>{agent.max_penalty_points} pts</div>
          </div>
          <div>
            <div style={{ ...textMuted, fontSize: '11px', marginBottom: '4px' }}>Backed Score</div>
            <div style={{ ...textSecondary, fontSize: '13px' }}>{agent.derived_score}</div>
          </div>
          <div>
            <div style={{ ...textMuted, fontSize: '11px', marginBottom: '4px' }}>Demo Actions</div>
            <div style={{ ...textSecondary, fontSize: '13px' }}>{agent.action_count}</div>
          </div>
          <div>
            <div style={{ ...textMuted, fontSize: '11px', marginBottom: '4px' }}>Last Activity</div>
            <div style={{ ...textSecondary, fontSize: '13px' }}>{lastActionDate || 'No actions yet'}</div>
          </div>
        </div>

        {(onAction || onReset) && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
            {ACTION_BUTTONS.map((button) => (
              <button
                key={button.actionType}
                onClick={() => onAction?.(button.actionType)}
                disabled={isBusy}
                style={{
                  borderRadius: '999px',
                  border: '1px solid rgba(37,99,235,0.12)',
                  background: button.tone,
                  color: colors.textSecondary,
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 12px',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                {button.label}
              </button>
            ))}
            <button
              onClick={onReset}
              disabled={isBusy}
              style={{
                borderRadius: '999px',
                border: '1px solid rgba(15,23,42,0.12)',
                background: 'rgba(15,23,42,0.04)',
                color: colors.textSecondary,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '12px',
                fontWeight: 600,
                padding: '8px 12px',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              Reset Demo
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ ...textSecondary, fontSize: '13px' }}>
            Created {createdDate}
          </span>
          <span style={{ ...textMuted, fontSize: '13px' }}>
            Only negative actions reduce your effective reputation.
          </span>
        </div>
      </div>
    </div>
  );
}
