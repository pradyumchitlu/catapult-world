'use client';

import { useState, useEffect } from 'react';
import AgentCard from '@/components/AgentCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import {
  col,
  headingLg,
  headingSm,
  sectionLabel,
  separator,
  textSecondary,
  textMuted,
  gradientText,
  colors,
} from '@/lib/styles';
import type { Agent, User, WorkerProfile } from '@/types';

interface AgentWithParent extends Agent {
  parent: User & { worker_profile: WorkerProfile };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentWithParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch user's agents
    const fetchAgents = async () => {
      try {
        // Placeholder data
        setAgents([
          {
            id: 'agent-1',
            parent_user_id: 'current-user',
            name: 'My Code Assistant',
            derived_score: 59,
            created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            parent: {
              id: 'current-user',
              world_id_hash: 'hash1',
              display_name: 'Current User',
              roles: ['worker'],
              profession_category: 'software',
              wld_balance: 1000,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              worker_profile: {
                id: '1',
                user_id: 'current-user',
                github_username: 'user',
                github_data: {},
                linkedin_data: {},
                other_platforms: {},
                computed_skills: ['TypeScript', 'React'],
                specializations: ['Full-stack'],
                years_experience: 5,
                overall_trust_score: 85,
                score_components: {
                  developer_competence: 90,
                  collaboration: 82,
                  consistency: 85,
                  specialization_depth: 88,
                  activity_recency: 92,
                  peer_trust: 78,
                },
                ingestion_status: 'completed',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      // TODO: Call spawn agent API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setNewAgentName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        {/* ── Header ── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '48px' }}>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            AI Agents
          </h1>
          <p style={textSecondary}>
            Spawn accountable AI agents tied to your identity. Each agent inherits 70% of your trust score.
          </p>
        </div>

        {/* ── Create Agent ── */}
        <GlassCard className="fade-up fade-up-2" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>Spawn New Agent</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Agent name..."
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              className="input"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleCreateAgent}
              disabled={isCreating || !newAgentName.trim()}
              className="btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {isCreating ? <LoadingSpinner /> : 'Spawn Agent'}
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

        {/* ── Agent List ── */}
        <GlassCard className="fade-up fade-up-3" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>Your Agents</span>
          {agents.length === 0 ? (
            <p style={{ ...textSecondary, textAlign: 'center', padding: '48px 0' }}>
              You haven&apos;t created any agents yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </GlassCard>

        {/* ── How Agent Identity Works ── */}
        <GlassCard className="fade-up fade-up-4">
          <span style={sectionLabel}>How Agent Identity Works</span>

          {[
            { num: '01', text: 'Agents are cryptographically tied to your Veridex identity' },
            { num: '02', text: 'Anyone can look up an agent\'s parent human' },
            { num: '03', text: 'Agent trust score = 70% of your score (derived trust)' },
            { num: '04', text: 'Your reputation is on the line for your agent\'s behavior' },
          ].map((item, i, arr) => (
            <div key={item.num}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', padding: i === 0 ? '0 0 20px 0' : '20px 0' }}>
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
                  {item.num}
                </span>
                <p style={{ ...textSecondary, fontSize: '15px' }}>{item.text}</p>
              </div>
              {i < arr.length - 1 && <div style={separator} />}
            </div>
          ))}
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
