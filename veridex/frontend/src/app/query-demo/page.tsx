'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getAgent, getTrustScore } from '@/lib/api';

export default function QueryDemoPage() {
  const [veridexId, setVeridexId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [trustResult, setTrustResult] = useState<Record<string, any> | null>(null);
  const [agentResult, setAgentResult] = useState<Record<string, any> | null>(null);
  const [isLoadingTrust, setIsLoadingTrust] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);

  const handleTrustQuery = async () => {
    if (!veridexId.trim()) return;

    setIsLoadingTrust(true);
    setTrustResult(null);

    try {
      const result = await getTrustScore(veridexId.trim());
      setTrustResult(result as Record<string, any>);
    } catch (error) {
      setTrustResult({
        error: error instanceof Error ? error.message : 'Failed to query trust score',
      });
    } finally {
      setIsLoadingTrust(false);
    }
  };

  const handleAgentQuery = async () => {
    if (!agentId.trim()) return;

    setIsLoadingAgent(true);
    setAgentResult(null);

    try {
      const result = await getAgent(agentId.trim());
      setAgentResult(result as Record<string, any>);
    } catch (error) {
      setAgentResult({
        error: error instanceof Error ? error.message : 'Failed to query agent credential',
      });
    } finally {
      setIsLoadingAgent(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Public Verification API Demo</h1>
      <p className="text-worldcoin-gray-400 mb-8">
        Test the public APIs that third-party services can use to verify a human trust profile or trace an
        agent credential back to the verified human behind it.
      </p>

      {/* Trust Score Query */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Query Human Trust Surface</h2>
        <p className="text-sm text-worldcoin-gray-400 mb-4">
          <code className="bg-worldcoin-gray-700 px-2 py-1 rounded">GET /api/trust/:veridexId</code>
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
          <pre className="bg-worldcoin-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(trustResult, null, 2)}
          </pre>
        )}
      </div>

      {/* Agent Lookup */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Lookup Agent Credential</h2>
        <p className="text-sm text-worldcoin-gray-400 mb-4">
          <code className="bg-worldcoin-gray-700 px-2 py-1 rounded">GET /api/agent/:agentId</code>
        </p>
        <p className="text-sm text-worldcoin-gray-400 mb-4">
          Use the agent credential ID a website would receive with the automated request. This doubles as the
          tracking ID that traces the agent back to Veridex.
        </p>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Agent Credential ID..."
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="input flex-1"
          />
          <button
            onClick={handleAgentQuery}
            disabled={isLoadingAgent || !agentId.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {isLoadingAgent ? <LoadingSpinner /> : 'Verify'}
          </button>
        </div>
        {agentResult && (
          <pre className="bg-worldcoin-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
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
            <p className="text-worldcoin-gray-300 mt-1">
              Returns a public trust surface for a verified human, including score breakdown and staking context.
            </p>
          </div>
          <div>
            <code className="text-veridex-secondary">GET /api/agent/:agentId</code>
            <p className="text-worldcoin-gray-300 mt-1">
              Returns an agent credential trace, including delegated score and the verified human behind the agent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
