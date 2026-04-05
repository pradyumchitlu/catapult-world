'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function QueryDemoPage() {
  const [veridexId, setVeridexId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [trustResult, setTrustResult] = useState<any>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [isLoadingTrust, setIsLoadingTrust] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);

  const handleTrustQuery = async () => {
    if (!veridexId.trim()) return;

    setIsLoadingTrust(true);
    setTrustResult(null);

    try {
      // TODO: Call trust query API
      // const result = await getTrustScore(veridexId);
      // setTrustResult(result);

      // Placeholder
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTrustResult({
        veridex_id: veridexId,
        veridex_score: 85,
        overall_trust_score: 85,
        is_verified_human: true,
        score_summary: {
          evidence: 82,
          employer: 50,
          staking: 78,
          veridex: 85,
        },
        score_components: {
          identity_assurance: 76,
          evidence_depth: 88,
          consistency: 85,
          recency: 92,
          employer_outcomes: 50,
          staking: 78,
        },
        total_staked: 5000,
        review_count: 12,
      });
    } catch (error) {
      setTrustResult({ error: 'Failed to query trust score' });
    } finally {
      setIsLoadingTrust(false);
    }
  };

  const handleAgentQuery = async () => {
    if (!agentId.trim()) return;

    setIsLoadingAgent(true);
    setAgentResult(null);

    try {
      // TODO: Call agent lookup API
      // const result = await getAgent(agentId);
      // setAgentResult(result);

      // Placeholder
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAgentResult({
        agent_id: agentId,
        agent_name: 'My Code Assistant',
        derived_score: 59,
        parent: {
          veridex_id: 'user-123',
          display_name: 'Alice Developer',
          overall_trust_score: 85,
          is_verified_human: true,
        },
      });
    } catch (error) {
      setAgentResult({ error: 'Failed to query agent' });
    } finally {
      setIsLoadingAgent(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">External Query API Demo</h1>
      <p className="text-veridex-gray-400 mb-8">
        Test the external APIs that third-party services can use to query trust scores and agent identities.
      </p>

      {/* Trust Score Query */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Query Trust Score</h2>
        <p className="text-sm text-veridex-gray-400 mb-4">
          <code className="bg-veridex-gray-700 px-2 py-1 rounded">GET /api/trust/:veridexId</code>
        </p>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Veridex ID..."
            value={veridexId}
            onChange={(e) => setVeridexId(e.target.value)}
            className="input flex-1"
          />
          <button
            onClick={handleTrustQuery}
            disabled={isLoadingTrust || !veridexId.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {isLoadingTrust ? <LoadingSpinner /> : 'Query'}
          </button>
        </div>
        {trustResult && (
          <pre className="bg-veridex-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(trustResult, null, 2)}
          </pre>
        )}
      </div>

      {/* Agent Lookup */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Lookup Agent</h2>
        <p className="text-sm text-veridex-gray-400 mb-4">
          <code className="bg-veridex-gray-700 px-2 py-1 rounded">GET /api/agent/:agentId</code>
        </p>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Agent ID..."
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="input flex-1"
          />
          <button
            onClick={handleAgentQuery}
            disabled={isLoadingAgent || !agentId.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {isLoadingAgent ? <LoadingSpinner /> : 'Lookup'}
          </button>
        </div>
        {agentResult && (
          <pre className="bg-veridex-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(agentResult, null, 2)}
          </pre>
        )}
      </div>

      {/* API Documentation */}
      <div className="card bg-veridex-primary/10 border-veridex-primary/30">
        <h3 className="font-semibold mb-4">API Endpoints</h3>
        <div className="space-y-4 text-sm">
          <div>
            <code className="text-veridex-secondary">GET /api/trust/:veridexId</code>
            <p className="text-veridex-gray-300 mt-1">
              Returns trust score, verification status, score components, and staking info for a user.
            </p>
          </div>
          <div>
            <code className="text-veridex-secondary">GET /api/agent/:agentId</code>
            <p className="text-veridex-gray-300 mt-1">
              Returns agent info including derived score and parent human&apos;s identity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
