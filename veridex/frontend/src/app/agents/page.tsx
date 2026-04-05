'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgentCard from '@/components/AgentCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { applyAgentAction, listAgents, resetAgentDemo, spawnAgent } from '@/lib/api';
import {
  col,
  headingLg,
  headingMd,
  sectionLabel,
  textSecondary,
  textMuted,
  gradientText,
  colors,
} from '@/lib/styles';
import type { Agent, AgentActionEvent, AgentListResponse, AgentSummary, AgentActionType } from '@/types';

const IDENTIFIER_TYPES = [
  { value: 'other', label: 'Custom' },
  { value: 'api_endpoint', label: 'API Endpoint' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'signing_key', label: 'Signing Key' },
];

const DEPLOYMENT_SURFACES = [
  { value: 'custom', label: 'Custom Demo' },
  { value: 'website', label: 'Website' },
  { value: 'api', label: 'API' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'automation', label: 'Automation' },
];

const ACTION_LABELS: Record<AgentActionType, string> = {
  no_issue: 'No issue logged',
  warning: 'Warning recorded',
  failure: 'Failure recorded',
  severe_failure: 'Severe failure recorded',
  reset_demo: 'Demo reset',
};

const ACTION_DESCRIPTIONS: Record<AgentActionType, string> = {
  no_issue: 'No penalty applied.',
  warning: 'Agent score dropped by 5 points.',
  failure: 'Agent score dropped by 15 points.',
  severe_failure: 'Agent score dropped by 30 points.',
  reset_demo: 'Agent score was reset back to 100.',
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatActionDate(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const EMPTY_SUMMARY: AgentSummary = {
  base_user_score: 0,
  effective_user_score: 0,
  agent_penalty_score: 0,
  total_registered_agents: 0,
  active_agents_count: 0,
  used_agents_count: 0,
  allocated_fraction: 0,
  remaining_fraction: 1,
  recent_actions_count: 0,
};

export default function AgentsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentActions, setRecentActions] = useState<AgentActionEvent[]>([]);
  const [summary, setSummary] = useState<AgentSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);
  const [newAgentName, setNewAgentName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState('other');
  const [deploymentSurface, setDeploymentSurface] = useState('custom');
  const [inheritanceFraction, setInheritanceFraction] = useState(0.3);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
    }
  }, [user, authLoading, router]);

  const refreshAgents = async () => {
    if (!user || !token) return;

    const data = await listAgents(user.id, token) as AgentListResponse;
    setAgents(data.agents || []);
    setRecentActions(data.recent_actions || []);
    setSummary(data.summary || EMPTY_SUMMARY);
  };

  useEffect(() => {
    if (!user || !token) return;

    const fetchAgents = async () => {
      try {
        await refreshAgents();
      } catch (err) {
        console.error('Failed to fetch agents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, [user, token]);

  const preview = useMemo(() => {
    const baseScore = summary.base_user_score || 0;
    const maxPenalty = Math.round(baseScore * inheritanceFraction);
    return {
      baseScore,
      maxPenalty,
      currentPenalty: 0,
      initialBackedScore: maxPenalty,
      remainingAfterCreate: Math.max(0, summary.remaining_fraction - inheritanceFraction),
    };
  }, [inheritanceFraction, summary.base_user_score, summary.remaining_fraction]);

  const usedAgents = agents.filter((agent) => agent.action_count > 0);

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !identifier.trim() || !token) return;

    setIsCreating(true);
    setError(null);

    try {
      await spawnAgent({
        name: newAgentName.trim(),
        identifier: identifier.trim(),
        identifier_type: identifierType,
        deployment_surface: deploymentSurface,
        inheritance_fraction: inheritanceFraction,
      }, token);
      setNewAgentName('');
      setIdentifier('');
      setIdentifierType('other');
      setDeploymentSurface('custom');
      setInheritanceFraction(0.3);
      await refreshAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register agent');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAgentAction = async (
    agentId: string,
    actionType: Exclude<AgentActionType, 'reset_demo'>
  ) => {
    if (!token) return;

    setBusyAgentId(agentId);
    setError(null);

    try {
      await applyAgentAction(agentId, actionType, token);
      await refreshAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
    } finally {
      setBusyAgentId(null);
    }
  };

  const handleResetAgent = async (agentId: string) => {
    if (!token) return;

    setBusyAgentId(agentId);
    setError(null);

    try {
      await resetAgentDemo(agentId, token);
      await refreshAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset demo state');
    } finally {
      setBusyAgentId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        <div className="fade-up fade-up-1" style={{ marginBottom: '32px' }}>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            Agent Registry
          </h1>
          <p style={textSecondary}>
            Register self-attested agents for the demo, decide how much of your reputation they can put at risk,
            and show how bad outcomes affect the score people see.
          </p>
        </div>

        <GlassCard className="fade-up fade-up-2" style={{ marginBottom: '24px' }}>
          <span style={sectionLabel}>Live Summary</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Base Reputation', value: summary.base_user_score },
              { label: 'Effective Reputation', value: summary.effective_user_score },
              { label: 'Agent Penalty', value: `${summary.agent_penalty_score} pts` },
              { label: 'Allocated Risk', value: formatPercent(summary.allocated_fraction) },
              { label: 'Remaining Capacity', value: formatPercent(summary.remaining_fraction) },
              { label: 'Used Agents', value: summary.used_agents_count },
            ].map((item) => (
              <div key={item.label} style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(37,99,235,0.12)', padding: '16px' }}>
                <div style={{ ...textMuted, fontSize: '11px', marginBottom: '6px' }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '28px', fontWeight: 700, ...gradientText }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="fade-up fade-up-3" style={{ marginBottom: '24px' }}>
          <span style={sectionLabel}>Register New Agent</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ ...textMuted, fontSize: '12px' }}>Agent Name</span>
              <input
                type="text"
                placeholder="Shopping Agent"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="input"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ ...textMuted, fontSize: '12px' }}>Identifier</span>
              <input
                type="text"
                placeholder="https://demo-agent.app or wallet / bot ID"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ ...textMuted, fontSize: '12px' }}>Identifier Type</span>
              <select
                value={identifierType}
                onChange={(e) => setIdentifierType(e.target.value)}
                className="input"
              >
                {IDENTIFIER_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ ...textMuted, fontSize: '12px' }}>Where It Lives</span>
              <select
                value={deploymentSurface}
                onChange={(e) => setDeploymentSurface(e.target.value)}
                className="input"
              >
                {DEPLOYMENT_SURFACES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div
            style={{
              borderRadius: '16px',
              border: '1px solid rgba(37,99,235,0.14)',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(15,23,42,0.03))',
              padding: '18px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div>
                <div style={{ ...textMuted, fontSize: '12px', marginBottom: '4px' }}>Reputation at Risk</div>
                <div style={{ ...headingMd, fontSize: '26px', margin: 0 }}>{formatPercent(inheritanceFraction)}</div>
              </div>
              <div style={{ ...textSecondary, fontSize: '13px', maxWidth: '420px' }}>
                This sets the maximum share of your base reputation this agent can reduce. It cannot increase your score.
              </div>
            </div>

            <input
              type="range"
              min={0.05}
              max={Math.max(0.05, Math.min(1, summary.remaining_fraction || 1))}
              step={0.05}
              value={inheritanceFraction}
              onChange={(e) => setInheritanceFraction(Number(e.target.value))}
              style={{ width: '100%' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '14px' }}>
              {[
                { label: 'Base Reputation', value: preview.baseScore },
                { label: 'Max Penalty', value: `${preview.maxPenalty} pts` },
                { label: 'Starting Agent Score', value: 100 },
                { label: 'Current Penalty', value: `${preview.currentPenalty} pts` },
                { label: 'Initial Backed Score', value: preview.initialBackedScore },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ ...textMuted, fontSize: '11px', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ ...textSecondary, fontSize: '14px' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 16px',
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                borderRadius: '10px',
                color: '#F43F5E',
                fontSize: '14px',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ ...textMuted, fontSize: '12px' }}>
              Remaining reputation capacity after this registration: {formatPercent(preview.remainingAfterCreate)}
            </div>
            <button
              onClick={handleCreateAgent}
              disabled={isCreating || !newAgentName.trim() || !identifier.trim()}
              className="btn-primary"
            >
              {isCreating ? <LoadingSpinner /> : 'Register Agent'}
            </button>
          </div>
        </GlassCard>

        <GlassCard className="fade-up fade-up-4" style={{ marginBottom: '24px' }}>
          <span style={sectionLabel}>Your Agents</span>
          {agents.length === 0 ? (
            <p style={{ ...textSecondary, textAlign: 'center', padding: '48px 0' }}>
              No agents registered yet. Create one above to start the demo flow.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isBusy={busyAgentId === agent.id}
                  onAction={(actionType) => handleAgentAction(agent.id, actionType)}
                  onReset={() => handleResetAgent(agent.id)}
                />
              ))}
            </div>
          )}
        </GlassCard>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
          <GlassCard className="fade-up fade-up-5">
            <span style={sectionLabel}>Agents Used In Demo</span>
            {usedAgents.length === 0 ? (
              <p style={{ ...textSecondary, padding: '24px 0' }}>
                Once an agent receives demo actions, it will show up here as an active demo agent.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {usedAgents.map((agent) => (
                  <div
                    key={agent.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(37,99,235,0.12)',
                      background: 'rgba(255,255,255,0.55)',
                      padding: '14px 16px',
                    }}
                  >
                    <div>
                      <div style={{ ...textSecondary, fontSize: '14px', fontWeight: 600 }}>{agent.name}</div>
                      <div style={{ ...textMuted, fontSize: '12px', marginTop: '4px' }}>
                        {agent.action_count} action{agent.action_count !== 1 ? 's' : ''} · penalty {agent.current_penalty_points} pts
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '24px', fontWeight: 700, color: agent.agent_score < 70 ? '#F97316' : colors.primary }}>
                        {agent.agent_score}
                      </div>
                      <div style={{ ...textMuted, fontSize: '11px' }}>Agent score</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="fade-up fade-up-6">
            <span style={sectionLabel}>Recent Activity</span>
            {recentActions.length === 0 ? (
              <p style={{ ...textSecondary, padding: '24px 0' }}>
                No demo activity yet. Use the action buttons on any registered agent to generate a live history.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActions.map((action) => (
                  <div
                    key={action.id}
                    style={{
                      borderRadius: '12px',
                      border: '1px solid rgba(37,99,235,0.12)',
                      background: 'rgba(255,255,255,0.55)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ ...textSecondary, fontSize: '14px', fontWeight: 600 }}>
                        {action.agent_name || 'Agent'}
                      </div>
                      <div style={{ ...textMuted, fontSize: '11px' }}>{formatActionDate(action.created_at)}</div>
                    </div>
                    <div style={{ ...textSecondary, fontSize: '13px', marginBottom: '4px' }}>
                      {ACTION_LABELS[action.action_type] || action.action_type}
                    </div>
                    <div style={{ ...textMuted, fontSize: '12px' }}>
                      {ACTION_DESCRIPTIONS[action.action_type] || 'Demo action recorded.'}
                      {action.note ? ` ${action.note}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
