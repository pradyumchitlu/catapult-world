'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AgentCard from '@/components/AgentCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { spawnAgent, listAgents } from '@/lib/api';
import {
  col,
  headingLg,
  headingMd,
  headingSm,
  sectionLabel,
  separator,
  textSecondary,
  textMuted,
  gradientText,
  colors,
} from '@/lib/styles';
import type { Agent } from '@/types';

const apiResponseExample = `{
  "agent": {
    "id": "98f3d4c2-6b4a-4a0f-...",
    "name": "Shopping Agent",
    "derived_score": 59,
    "parent": {
      "id": "user-abc-123",
      "display_name": "Jane Smith",
      "overall_trust_score": 85
    }
  }
}`;

const verificationSteps = [
  {
    step: '01',
    title: 'Register your agent',
    description: 'Give your agent a name and Veridex issues a credential ID tied to your verified identity.',
  },
  {
    step: '02',
    title: 'Agent presents its credential',
    description: 'When your agent interacts with a third-party service, it includes its Veridex credential ID.',
  },
  {
    step: '03',
    title: 'The service verifies the agent',
    description: 'The service calls the Veridex API to see who owns the agent and what their trust score is.',
  },
  {
    step: '04',
    title: 'Access is granted based on trust',
    description: 'The service decides what to allow based on the verified human behind the agent, not blind faith.',
  },
];

export default function AgentsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !token) return;

    const fetchAgents = async () => {
      try {
        const data = await listAgents(user.id, token) as { agents: Agent[] };
        setAgents(data.agents || []);
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, [user, token]);

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !token) return;

    setIsCreating(true);
    setError(null);

    try {
      const result = await spawnAgent(newAgentName.trim(), token) as { agent: Agent };
      setAgents((prev) => [result.agent, ...prev]);
      setNewAgentName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsCreating(false);
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
        {/* Header */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '48px' }}>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            AI Agents
          </h1>
          <p style={textSecondary}>
            Register agents tied to your verified identity. Each agent gets a credential ID and a trust score derived from yours.
          </p>
        </div>

        {/* Create Agent */}
        <GlassCard className="fade-up fade-up-2" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>Register New Agent</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Agent name..."
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAgent(); }}
              className="input"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleCreateAgent}
              disabled={isCreating || !newAgentName.trim()}
              className="btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {isCreating ? <LoadingSpinner /> : 'Register Agent'}
            </button>
          </div>
          {error && (
            <div
              style={{
                marginTop: '12px',
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
        </GlassCard>

        {/* Agent List */}
        <GlassCard className="fade-up fade-up-3" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>Your Agents</span>
          {agents.length === 0 ? (
            <p style={{ ...textSecondary, textAlign: 'center', padding: '48px 0' }}>
              No agents registered yet. Create one above to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </GlassCard>

        {/* How It Works */}
        <GlassCard className="fade-up fade-up-4" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>How It Works</span>
          {verificationSteps.map((item, index) => (
            <div key={item.step}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', padding: index === 0 ? '0 0 20px 0' : '20px 0' }}>
                <span
                  style={{
                    ...gradientText,
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    lineHeight: '1.6',
                    minWidth: '24px',
                  }}
                >
                  {item.step}
                </span>
                <div>
                  <h3 style={{ ...headingSm, marginBottom: '6px' }}>{item.title}</h3>
                  <p style={{ ...textSecondary, fontSize: '15px' }}>{item.description}</p>
                </div>
              </div>
              {index < verificationSteps.length - 1 && <div style={separator} />}
            </div>
          ))}
        </GlassCard>

        {/* Public API */}
        <GlassCard className="fade-up fade-up-5">
          <span style={sectionLabel}>For Developers</span>
          <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>
            Public Verification API
          </h2>
          <p style={{ ...textSecondary, marginBottom: '20px' }}>
            Any service can look up an agent by its credential ID to see the verified human behind it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            <div>
              <span style={{ ...textMuted, fontSize: '12px', display: 'block', marginBottom: '8px' }}>Request</span>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#0F172A',
                  color: '#E2E8F0',
                  overflowX: 'auto',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              >
                {`GET /api/agent/:credentialId`}
              </pre>
            </div>
            <div>
              <span style={{ ...textMuted, fontSize: '12px', display: 'block', marginBottom: '8px' }}>Response</span>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#0F172A',
                  color: '#E2E8F0',
                  overflowX: 'auto',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              >
                {apiResponseExample}
              </pre>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <Link
              href="/api-docs"
              className="btn-secondary"
              style={{ width: 'fit-content', textDecoration: 'none' }}
            >
              Full API Docs
            </Link>
          </div>
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
