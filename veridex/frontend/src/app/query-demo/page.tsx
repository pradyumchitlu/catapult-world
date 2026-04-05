'use client';

import { useMemo, useState } from 'react';
import GlassCard from '@/components/GlassCard';
import { getAgent, getReputation, getReviews, getTrustScore } from '@/lib/api';
import {
  col,
  colors,
  gradientText,
  headingLg,
  headingMd,
  sectionLabel,
  textMuted,
  textSecondary,
} from '@/lib/styles';
import type {
  PublicAgentLookupResponse,
  ReputationResponse,
  ReviewListResponse,
  TrustQueryResponse,
} from '@/types';

type DemoEndpointId = 'trust' | 'reputation' | 'reviews' | 'agent';
type DemoResponse =
  | TrustQueryResponse
  | ReputationResponse
  | ReviewListResponse
  | PublicAgentLookupResponse;

type DemoEndpoint = {
  id: DemoEndpointId;
  label: string;
  path: string;
  description: string;
  paramLabel: string;
  placeholder: string;
  run: (value: string) => Promise<DemoResponse>;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ENDPOINTS: DemoEndpoint[] = [
  {
    id: 'trust',
    label: 'Trust Lookup',
    path: '/api/trust/:veridexId',
    description: 'Read the portable Veridex trust surface for a user, including grouped scores, skill metadata, and stake totals.',
    paramLabel: 'Veridex user ID',
    placeholder: 'user-uuid',
    run: (value) => getTrustScore(value),
  },
  {
    id: 'reputation',
    label: 'Public Profile',
    path: '/api/reputation/:userId',
    description: 'Inspect the broader public profile payload used by the app, including worker profile data and public reviews.',
    paramLabel: 'Worker user ID',
    placeholder: 'user-uuid',
    run: (value) => getReputation(value),
  },
  {
    id: 'reviews',
    label: 'Review Feed',
    path: '/api/review/:workerId',
    description: 'Fetch the public review stream for a worker, ordered by stake and ready for external ingestion.',
    paramLabel: 'Worker user ID',
    placeholder: 'worker-uuid',
    run: (value) => getReviews(value),
  },
  {
    id: 'agent',
    label: 'Agent Verify',
    path: '/api/agent/:agentId',
    description: 'Verify an Agent Credential and resolve it back to the parent human trust surface.',
    paramLabel: 'Agent credential ID',
    placeholder: 'agent-uuid',
    run: (value) => getAgent(value),
  },
];

const DEFAULT_INPUTS: Record<DemoEndpointId, string> = {
  trust: '',
  reputation: '',
  reviews: '',
  agent: '',
};

function buildCurlCommand(path: string, value: string): string {
  const resolvedPath = path.replace(/:[^/]+/, value || '<id>');
  return `curl ${API_BASE_URL}${resolvedPath}`;
}

export default function QueryDemoPage() {
  const [selectedEndpointId, setSelectedEndpointId] = useState<DemoEndpointId>('trust');
  const [inputs, setInputs] = useState<Record<DemoEndpointId, string>>(DEFAULT_INPUTS);
  const [response, setResponse] = useState<DemoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const activeEndpoint = useMemo(
    () => ENDPOINTS.find((endpoint) => endpoint.id === selectedEndpointId) || ENDPOINTS[0],
    [selectedEndpointId]
  );
  const activeValue = inputs[selectedEndpointId];
  const curlCommand = buildCurlCommand(activeEndpoint.path, activeValue.trim());

  const handleRunQuery = async () => {
    const trimmedValue = activeValue.trim();
    if (!trimmedValue) {
      setError(`${activeEndpoint.paramLabel} is required.`);
      setResponse(null);
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const result = await activeEndpoint.run(trimmedValue);
      setResponse(result);
    } catch (err) {
      setResponse(null);
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
    } catch (err) {
      console.error('Failed to copy curl command:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        <div className="fade-up fade-up-1" style={{ marginBottom: '32px' }}>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            Query Demo
          </h1>
          <p style={{ ...textSecondary, maxWidth: '760px' }}>
            This is the live external-app demo surface from the Veridex plan. Query the public trust API, profile API,
            review feed, and Agent Credential verification route without leaving the product.
          </p>
        </div>

        <div
          className="fade-up fade-up-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <GlassCard>
            <span style={sectionLabel}>Explorer</span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {ENDPOINTS.map((endpoint) => {
                const selected = endpoint.id === selectedEndpointId;
                return (
                  <button
                    key={endpoint.id}
                    type="button"
                    onClick={() => {
                      setSelectedEndpointId(endpoint.id);
                      setResponse(null);
                      setError(null);
                    }}
                    style={{
                      borderRadius: '999px',
                      border: selected ? '1px solid rgba(37,99,235,0.22)' : '1px solid rgba(148,163,184,0.22)',
                      background: selected ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.55)',
                      color: selected ? colors.primary : colors.textSecondary,
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {endpoint.label}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                borderRadius: '18px',
                border: '1px solid rgba(37,99,235,0.12)',
                background: 'rgba(255,255,255,0.55)',
                padding: '18px',
                marginBottom: '18px',
              }}
            >
              <div style={{ ...textMuted, fontSize: '11px', marginBottom: '6px' }}>Endpoint</div>
              <div style={{ ...headingMd, fontSize: '24px', marginBottom: '8px' }}>{activeEndpoint.path}</div>
              <p style={{ ...textSecondary, fontSize: '14px' }}>{activeEndpoint.description}</p>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <span style={{ ...textMuted, fontSize: '12px' }}>{activeEndpoint.paramLabel}</span>
              <input
                type="text"
                className="input"
                placeholder={activeEndpoint.placeholder}
                value={activeValue}
                onChange={(event) =>
                  setInputs((current) => ({
                    ...current,
                    [selectedEndpointId]: event.target.value,
                  }))
                }
              />
            </label>

            <div
              style={{
                borderRadius: '16px',
                border: '1px solid rgba(15,23,42,0.08)',
                background: 'rgba(15,23,42,0.03)',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ ...textMuted, fontSize: '11px', marginBottom: '6px' }}>cURL</div>
              <code
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: '12px',
                  color: colors.textPrimary,
                  overflowWrap: 'anywhere',
                  lineHeight: 1.6,
                }}
              >
                {curlCommand}
              </code>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(244,63,94,0.2)',
                  background: 'rgba(244,63,94,0.08)',
                  color: colors.rose,
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleRunQuery} className="btn-primary" disabled={isRunning}>
                {isRunning ? 'Running…' : 'Run Query'}
              </button>
              <button type="button" onClick={handleCopyCurl} className="btn-secondary">
                Copy cURL
              </button>
            </div>
          </GlassCard>

          <GlassCard>
            <span style={sectionLabel}>Response</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ ...textMuted, fontSize: '11px', marginBottom: '4px' }}>Selected Surface</div>
                <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>
                  {activeEndpoint.label}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '28px',
                  fontWeight: 700,
                  ...gradientText,
                }}
              >
                {response ? '200' : '...'}
              </div>
            </div>

            <div
              style={{
                borderRadius: '18px',
                border: '1px solid rgba(15,23,42,0.08)',
                background: '#0F172A',
                color: '#E2E8F0',
                padding: '18px',
                minHeight: '480px',
                overflow: 'auto',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: '12px',
                  lineHeight: 1.65,
                }}
              >
                {response
                  ? JSON.stringify(response, null, 2)
                  : `// No response yet.\n// Pick an endpoint, enter an id, and run the query.`}
              </pre>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
