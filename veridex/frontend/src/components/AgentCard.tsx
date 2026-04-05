'use client';

import type { Agent, User, WorkerProfile } from '@/types';

interface AgentWithParent extends Agent {
  parent: User & { worker_profile: WorkerProfile };
}

interface AgentCardProps {
  agent: AgentWithParent;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Active' },
  suspended: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Suspended' },
  revoked: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Revoked' },
};

export default function AgentCard({ agent }: AgentCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const copyAgentId = () => {
    navigator.clipboard.writeText(agent.id);
  };

  const statusStyle = STATUS_STYLES[agent.status] || STATUS_STYLES.active;
  const inheritPct = Math.round((agent.inheritance_fraction ?? 0.7) * 100);

  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.85)',
      boxShadow: '0 4px 24px rgba(37,99,235,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
      borderRadius: '16px',
      padding: '24px',
    }}>
      {/* Header row */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: '20px', color: '#1E293B' }}>
              {agent.name}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>

          {/* Agent ID */}
          <div className="mt-2 flex items-center gap-2">
            <code style={{ fontSize: '11px', color: '#64748B', background: 'rgba(37,99,235,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
              {agent.id.slice(0, 16)}...
            </code>
            <button
              onClick={copyAgentId}
              style={{ fontSize: '11px', color: '#2563EB', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              Copy
            </button>
          </div>
        </div>

        {/* Derived score */}
        <div className="text-right flex-shrink-0 ml-4">
          <div style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '32px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
          }}>
            {agent.derived_score}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            Effective Trust
          </div>
        </div>
      </div>

      {/* Credential details */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2" style={{ fontSize: '13px', color: '#475569' }}>
        {agent.identifier && (
          <div>
            <span style={{ color: '#94A3B8' }}>Identifier:</span>{' '}
            <span style={{ fontFamily: 'monospace' }}>{agent.identifier.slice(0, 20)}{agent.identifier.length > 20 ? '...' : ''}</span>
            {agent.identifier_type && agent.identifier_type !== 'other' && (
              <span style={{ color: '#94A3B8', marginLeft: '4px' }}>({agent.identifier_type.replace('_', ' ')})</span>
            )}
          </div>
        )}
        <div>
          <span style={{ color: '#94A3B8' }}>Inheritance:</span> {inheritPct}%
        </div>
        {agent.stake_amount > 0 && (
          <div>
            <span style={{ color: '#94A3B8' }}>Stake:</span>{' '}
            <span style={{ color: '#0EA5E9', fontWeight: 500 }}>{agent.stake_amount} ETH</span>
          </div>
        )}
        {agent.dispute_count > 0 && (
          <div>
            <span style={{ color: '#F43F5E' }}>Disputes: {agent.dispute_count}</span>
          </div>
        )}
      </div>

      {/* Authorized domains */}
      {agent.authorized_domains && agent.authorized_domains.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {agent.authorized_domains.map((domain) => (
            <span
              key={domain}
              style={{
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#1D4ED8',
                background: 'rgba(37,99,235,0.08)',
                padding: '3px 10px',
                borderRadius: '100px',
              }}
            >
              {domain}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid rgba(37,99,235,0.12)', fontSize: '12px', color: '#94A3B8' }}>
        <div>
          Parent: <span style={{ color: '#475569' }}>{agent.parent?.display_name || 'Unknown'}</span>
          {agent.parent?.worker_profile && (
            <span> (Score: {agent.parent.worker_profile.overall_trust_score})</span>
          )}
        </div>
        <div>Created {formatDate(agent.created_at)}</div>
      </div>
    </div>
  );
}
