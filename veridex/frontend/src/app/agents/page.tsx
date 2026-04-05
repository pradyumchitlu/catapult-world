'use client';

import { useState, useEffect } from 'react';
import AgentCard from '@/components/AgentCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { spawnAgent, listAgents } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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

const DOMAIN_OPTIONS = ['defi', 'content', 'negotiation', 'trading', 'customer-support', 'development', 'research'];

export default function AgentsPage() {
  const { user, token } = useAuth();
  const [agents, setAgents] = useState<AgentWithParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration form state
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState('other');
  const [inheritanceFraction, setInheritanceFraction] = useState(70);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [stakeAmount, setStakeAmount] = useState(0);

  const fetchAgents = async () => {
    if (!user || !token) return;
    try {
      const result = await listAgents(user.id, token) as { agents: any[] };
      // Normalize the joined data shape
      const normalized: AgentWithParent[] = (result.agents || []).map((a: any) => {
        const parent = a.parent || {};
        const wp = parent.worker_profiles || {};
        return {
          ...a,
          inheritance_fraction: parseFloat(a.inheritance_fraction) || 0.7,
          authorized_domains: a.authorized_domains || [],
          stake_amount: a.stake_amount || 0,
          status: a.status || 'active',
          dispute_count: a.dispute_count || 0,
          parent: {
            ...parent,
            worker_profile: {
              overall_trust_score: wp.overall_trust_score || 0,
            },
          },
        };
      });
      setAgents(normalized);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [user, token]);

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const handleRegister = async () => {
    if (!name.trim() || !token) return;
    setIsCreating(true);
    setError(null);

    try {
      await spawnAgent(
        {
          name: name.trim(),
          identifier: identifier.trim() || undefined,
          identifier_type: identifierType,
          inheritance_fraction: inheritanceFraction / 100,
          authorized_domains: selectedDomains.length > 0 ? selectedDomains : undefined,
          stake_amount: stakeAmount > 0 ? stakeAmount : undefined,
        },
        token
      );
      // Reset form
      setName('');
      setIdentifier('');
      setIdentifierType('other');
      setInheritanceFraction(70);
      setSelectedDomains([]);
      setStakeAmount(0);
      // Refetch to get full join data
      await fetchAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register agent');
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
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 24px' }}>
      {/* Page header */}
      <h1 style={{
        fontFamily: 'var(--font-fraunces)',
        fontSize: '48px',
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '12px',
      }}>
        Agent Credentials
      </h1>
      <p style={{ fontSize: '16px', lineHeight: 1.75, color: '#475569', marginBottom: '48px' }}>
        Register accountable AI agents tied to your World ID. Each credential binds an agent identifier
        to your trust score, authorized domains, and optional stake collateral.
      </p>

      {/* Registration Form */}
      <GlassCard style={{ padding: '32px', marginBottom: '48px' }}>
        <span style={sectionLabel}>Register New Credential</span>

        <div className="space-y-4">
          {/* Agent Name */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
              Agent Name
            </label>
            <input
              type="text"
              placeholder="e.g. Trading Assistant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Identifier */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
              Agent Identifier <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Signing key, API endpoint, wallet address..."
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Identifier Type */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
              Identifier Type
            </label>
            <select
              value={identifierType}
              onChange={(e) => setIdentifierType(e.target.value)}
              className="input w-full"
            >
              <option value="signing_key">Signing Key</option>
              <option value="api_endpoint">API Endpoint</option>
              <option value="wallet">Wallet Address</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Inheritance Fraction */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
              Trust Inheritance: <span style={{ color: '#2563EB', fontWeight: 600 }}>{inheritanceFraction}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={inheritanceFraction}
              onChange={(e) => setInheritanceFraction(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#2563EB' }}
            />
            <div className="flex justify-between" style={{ fontSize: '11px', color: '#94A3B8' }}>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Authorized Domains */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
              Authorized Domains <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_OPTIONS.map((domain) => {
                const isSelected = selectedDomains.includes(domain);
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => toggleDomain(domain)}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '5px 14px',
                      borderRadius: '100px',
                      border: isSelected ? '1px solid #2563EB' : '1px solid rgba(37,99,235,0.2)',
                      background: isSelected ? 'rgba(37,99,235,0.1)' : 'transparent',
                      color: isSelected ? '#2563EB' : '#64748B',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {domain.replace('-', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stake Amount */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
              Stake Collateral <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional, ETH)</span>
            </label>
            <input
              type="number"
              min={0}
              max={user?.wld_balance || 0}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Math.max(0, parseInt(e.target.value) || 0))}
              className="input w-full"
              placeholder="0"
            />
            {user && (
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                Balance: {user.wld_balance} ETH
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleRegister}
          disabled={isCreating || !name.trim()}
          className="btn-primary w-full mt-6 disabled:opacity-50"
        >
          {isCreating ? <LoadingSpinner /> : 'Register Agent Credential'}
        </button>

        {error && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#F43F5E' }}>{error}</div>
        )}
      </GlassCard>

      {/* Agent List */}
      <GlassCard style={{ padding: '32px', marginBottom: '48px' }}>
        <span style={sectionLabel}>Your Agent Credentials</span>

        {agents.length === 0 ? (
          <p style={{ ...textSecondary, textAlign: 'center', padding: '32px 0' }}>
            No agent credentials registered yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </GlassCard>

      {/* Info Section */}
      <GlassCard style={{ padding: '24px' }}>
        <span style={sectionLabel}>How Agent Credentials Work</span>
        <ul style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8, listStyle: 'none', padding: 0, margin: 0 }}>
          <li>Credentials are cryptographically tied to your World ID</li>
          <li>Third parties verify agents via the public lookup API</li>
          <li>Effective trust = your score x inheritance fraction</li>
          <li>Stake is locked as collateral -- slashable on validated disputes</li>
          <li>Your reputation is on the line for every agent you deploy</li>
        </ul>
      </GlassCard>
    </div>
  );
}
