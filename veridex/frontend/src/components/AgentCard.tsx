'use client';

import type { Agent, User, WorkerProfile } from '@/types';

interface AgentWithParent extends Agent {
  parent: User & { worker_profile: WorkerProfile };
}

interface AgentCardProps {
  agent: AgentWithParent;
}

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

  return (
    <div className="p-4 bg-worldcoin-gray-700/50 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="font-semibold">{agent.name}</h3>
          </div>
          <div className="mt-2 text-sm text-worldcoin-gray-400">
            <div className="flex items-center gap-2">
              <span>Agent ID:</span>
              <code className="bg-worldcoin-gray-800 px-2 py-0.5 rounded text-xs">
                {agent.id.slice(0, 12)}...
              </code>
              <button
                onClick={copyAgentId}
                className="text-veridex-secondary hover:underline text-xs"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-veridex-primary">
            {agent.derived_score}
          </div>
          <div className="text-xs text-worldcoin-gray-400">Derived Score</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-worldcoin-gray-600 flex justify-between items-center text-sm">
        <div className="text-worldcoin-gray-400">
          Parent: {agent.parent.display_name} (Score: {agent.parent.worker_profile.overall_trust_score})
        </div>
        <div className="text-worldcoin-gray-500">
          Created {formatDate(agent.created_at)}
        </div>
      </div>
    </div>
  );
}
