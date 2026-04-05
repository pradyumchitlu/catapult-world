import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
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
  statNumber,
} from '@/lib/styles';
const credentialSignals = [
  {
    title: 'Agent Credential ID',
    description: 'Every agent carries a stable tracking handle that a site can query before granting access.',
  },
  {
    title: 'Delegated Trust Budget',
    description: 'The agent does not get a fresh score. It receives a bounded trust surface derived from a verified human.',
  },
  {
    title: 'Public Verification',
    description: 'A company can validate the credential, inspect the parent human, and decide which actions to allow.',
  },
  {
    title: 'Human Liability',
    description: 'The agent is never anonymous. Its behavior can be traced back to the verified person who delegated it.',
  },
] as const;

const exampleCredentials = [
  {
    name: 'Shopping Agent',
    credentialId: '98f3d4c2-6b4a-4a0f',
    budget: 'Medium delegated trust budget',
    access: 'Price checks, cart assembly, loyalty lookups, and guarded checkout flows',
    impact: 'A merchant can allow more useful automation because the request is traceable to a verified human.',
  },
  {
    name: 'Research Agent',
    credentialId: '1bc884bd-0c58-41f9',
    budget: 'Low-to-medium delegated trust budget',
    access: 'Account-backed search, document retrieval, and higher-rate browsing on trusted domains',
    impact: 'A publisher can distinguish accountable research automation from anonymous scraping.',
  },
  {
    name: 'Travel Booking Agent',
    credentialId: '4ee02af6-97d3-4dc9',
    budget: 'Higher delegated trust budget',
    access: 'Trip planning, booking changes, and itinerary management across verified sessions',
    impact: 'A travel platform can gate sensitive actions on who is behind the agent instead of blocking all bots.',
  },
] as const;

const verificationSteps = [
  {
    step: '01',
    title: 'Agent sends its credential ID',
    description: 'When the agent acts on a site, it includes its Veridex-issued credential ID as the tracking handle.',
  },
  {
    step: '02',
    title: 'The site verifies the credential',
    description: 'The platform calls the public Veridex lookup endpoint to resolve the agent back to its verified parent human.',
  },
  {
    step: '03',
    title: 'Trust is gated, not assumed',
    description: 'The company sees the delegated score and decides what the agent is allowed to do on that property.',
  },
  {
    step: '04',
    title: 'Misuse has a real owner',
    description: 'If the agent causes harm, there is a verified human behind it whose standing is tied to that behavior.',
  },
] as const;

const apiResponseExample = `GET /api/agent/:agentId

{
  "agent_id": "98f3d4c2-6b4a-4a0f",
  "agent_name": "Shopping Agent",
  "derived_score": 59,
  "parent": {
    "veridex_id": "user-123",
    "display_name": "Verified Human",
    "is_verified_human": true,
    "overall_trust_score": 85
  }
}`;

export default function AgentsPage() {
  const heroStats = [
    {
      value: 'Tracked',
      label: 'Agents carry a credential ID, not just a browser fingerprint',
    },
    {
      value: 'Bounded',
      label: 'Trust is delegated from a human instead of invented by the model',
    },
    {
      value: 'Accountable',
      label: 'Sites can trace actions back to the verified human behind the agent',
    },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        {/* ── Header ── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '48px' }}>
          <span style={sectionLabel}>Agent Credentials</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            <div>
              <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
                Make Agents Traceable
              </h1>
              <p style={{ ...textSecondary, fontSize: '18px', maxWidth: '760px' }}>
                Veridex is not where people build agents. It is the trust layer that lets a website trace an
                agent back to a verified human, evaluate delegated risk, and grant access without treating every
                automated action like an anonymous bot.
              </p>
            </div>

            <GlassCard style={{ padding: '24px' }}>
              <span style={{ ...sectionLabel, marginBottom: '16px' }}>Hackathon Framing</span>
              <div style={{ display: 'grid', gap: '12px' }}>
                <p style={{ ...textSecondary, fontSize: '14px' }}>
                  For this demo, each agent carries a public credential ID and a delegated trust budget derived
                  from the parent human&apos;s Veridex score.
                </p>
                <p style={{ ...textSecondary, fontSize: '14px' }}>
                  The important point is not that the model is trustworthy by itself. The point is that the
                  human behind the agent is visible, attributable, and liable for what it does.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ── Hero Stats ── */}
        <GlassCard className="fade-up fade-up-2" style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {heroStats.map((item) => (
              <div
                key={item.value}
                style={{
                  borderRadius: '16px',
                  border: '1px solid rgba(37,99,235,0.12)',
                  background: 'rgba(255,255,255,0.6)',
                  padding: '20px',
                }}
              >
                <div style={{ ...statNumber, fontSize: '28px', marginBottom: '10px' }}>{item.value}</div>
                <p style={{ ...textSecondary, fontSize: '14px' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── What Travels With The Agent ── */}
        <GlassCard className="fade-up fade-up-3" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>What Travels With The Agent</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {credentialSignals.map((item) => (
              <div
                key={item.title}
                style={{
                  borderRadius: '16px',
                  border: '1px solid rgba(37,99,235,0.12)',
                  background: 'rgba(255,255,255,0.6)',
                  padding: '20px',
                }}
              >
                <h3 style={{ ...headingSm, marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ ...textSecondary, fontSize: '14px' }}>{item.description}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Example Credentials ── */}
        <GlassCard className="fade-up fade-up-4" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>Example Credentials</span>
          <h2 style={{ ...headingMd, fontSize: '24px', marginBottom: '12px' }}>
            Believable Agent Stories, Not a Fake Agent Marketplace
          </h2>
          <p style={{ ...textSecondary, marginBottom: '24px' }}>
            The UI does not need to pretend users will build agents inside Veridex. The stronger story is that
            Veridex issues the trust and accountability layer for agents acting elsewhere on the web.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {exampleCredentials.map((agent) => (
              <div
                key={agent.credentialId}
                style={{
                  borderRadius: '18px',
                  border: '1px solid rgba(37,99,235,0.14)',
                  background: 'rgba(255,255,255,0.62)',
                  padding: '22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                  <h3 style={headingSm}>{agent.name}</h3>
                  <span
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: colors.primary,
                      background: 'rgba(37,99,235,0.08)',
                      border: '1px solid rgba(37,99,235,0.18)',
                      borderRadius: '999px',
                      padding: '6px 10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {agent.budget}
                  </span>
                </div>

                <div style={{ ...textMuted, marginBottom: '6px' }}>Agent Credential ID</div>
                <code
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: '13px',
                    color: colors.primaryDark,
                    background: 'rgba(37,99,235,0.06)',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                  }}
                >
                  {agent.credentialId}
                </code>

                <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '14px' }}>
                  <strong style={{ color: colors.textPrimary }}>Could request:</strong> {agent.access}
                </p>
                <p style={{ ...textSecondary, fontSize: '14px' }}>
                  <strong style={{ color: colors.textPrimary }}>Why it matters:</strong> {agent.impact}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Verification Flow ── */}
        <GlassCard className="fade-up fade-up-5" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>How Verification Works</span>
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

        {/* ── Public API Surface ── */}
        <GlassCard className="fade-up fade-up-6">
          <span style={sectionLabel}>Public Verification Surface</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.8fr)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            <div>
              <h2 style={{ ...headingMd, fontSize: '24px', marginBottom: '12px' }}>
                The Credential ID Doubles As The Tracking ID
              </h2>
              <p style={{ ...textSecondary, marginBottom: '16px' }}>
                Third-party sites do not need to trust the agent on faith. They can verify the credential ID,
                inspect the derived score, and see the verified human behind the agent before allowing higher-risk
                actions.
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: '20px',
                  borderRadius: '16px',
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

            <div>
              <GlassCard style={{ padding: '24px' }}>
                <span style={{ ...sectionLabel, marginBottom: '14px' }}>Why This Lands</span>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <p style={{ ...textSecondary, fontSize: '14px' }}>
                    The hackathon story is stronger if Veridex is the accountability layer for agents on the open
                    internet, not an agent-builder platform.
                  </p>
                  <p style={{ ...textSecondary, fontSize: '14px' }}>
                    Websites get a clean verification primitive. Humans keep ownership of the risk they delegate.
                  </p>
                  <Link
                    href="/query-demo"
                    className="btn-secondary"
                    style={{ width: 'fit-content', textDecoration: 'none' }}
                  >
                    Open Public Query Demo
                  </Link>
                </div>
              </GlassCard>
            </div>
          </div>
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
