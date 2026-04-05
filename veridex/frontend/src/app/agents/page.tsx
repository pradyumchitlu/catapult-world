'use client';

import { useState, useEffect } from 'react';
import AgentCard from '@/components/AgentCard';
import LoadingSpinner from '@/components/LoadingSpinner';
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
            derived_score: 59, // 70% of parent's 85
            created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            parent: {
              id: 'current-user',
              world_id_hash: 'hash1',
              display_name: 'Current User',
              roles: ['worker'],
              profession_category: 'software',
              wld_balance: 1000,
              wallet_address: null,
              wallet_verified_at: null,
              wallet_verification_method: null,
              wallet_last_balance_sync_at: null,
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
      // const agent = await spawnAgent(newAgentName, token);
      // setAgents([...agents, agent]);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Placeholder
      setNewAgentName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">AI Agents</h1>
      <p className="text-worldcoin-gray-400 mb-8">
        Spawn accountable AI agents tied to your identity. Each agent inherits 70% of your trust score.
      </p>

      {/* Create Agent */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Spawn New Agent</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Agent name..."
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            className="input flex-1"
          />
          <button
            onClick={handleCreateAgent}
            disabled={isCreating || !newAgentName.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {isCreating ? <LoadingSpinner /> : 'Spawn Agent'}
          </button>
        </div>
        {error && (
          <div className="mt-3 text-sm text-veridex-error">{error}</div>
        )}
      </div>

      {/* Agent List */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your Agents</h2>
        {agents.length === 0 ? (
          <p className="text-worldcoin-gray-400 text-center py-8">
            You haven&apos;t created any agents yet.
          </p>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-6 card bg-veridex-primary/10 border-veridex-primary/30">
        <h3 className="font-semibold mb-2">How Agent Identity Works</h3>
        <ul className="text-sm text-worldcoin-gray-300 space-y-2">
          <li>• Agents are cryptographically tied to your Veridex identity</li>
          <li>• Anyone can look up an agent&apos;s parent human</li>
          <li>• Agent trust score = 70% of your score (derived trust)</li>
          <li>• Your reputation is on the line for your agent&apos;s behavior</li>
        </ul>
      </div>
    </div>
  );
}
