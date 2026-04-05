import type { CSSProperties, ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import {
  col,
  colors,
  headingLg,
  headingMd,
  headingSm,
  sectionLabel,
  separator,
  textMuted,
  textSecondary,
} from '@/lib/styles';

export const metadata: Metadata = {
  title: 'Veridex API Docs',
  description: 'Production-facing API docs for the currently supported public Veridex trust endpoints.',
};

type EndpointDoc = {
  method: 'GET';
  path: string;
  auth: string;
  purpose: string;
  status?: 'Beta';
  params: Array<{ name: string; description: string }>;
  successShape: string[];
  errors: string[];
  curl: string;
  responseExample: string;
  notes?: string[];
};

const endpointDocs: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/trust/:veridexId',
    auth: 'None',
    purpose: 'Resolve the public trust surface for a Veridex user, including trust score, score summaries, staking totals, and review aggregates.',
    params: [
      {
        name: 'veridexId',
        description: 'User UUID for the trust profile you want to read.',
      },
    ],
    successShape: [
      '`veridex_id`, `display_name`, `is_verified_human`, `veridex_score`, and `overall_trust_score`',
      '`score_summary` for grouped scoring output and `score_components` for the current stored component map',
      '`total_staked`, `review_count`, `avg_rating`, `profession_category`, `skills`, `specializations`, and `years_experience`',
    ],
    errors: [
      '`404` with `{ "error": "User not found" }` when the ID does not resolve',
      '`500` with `{ "error": "Query failed" }` if the lookup fails server-side',
    ],
    curl: `curl <base-url>/api/trust/<veridex-id>`,
    responseExample: `{
  "veridex_id": "user-uuid",
  "display_name": "Worker Name",
  "is_verified_human": true,
  "veridex_score": 40,
  "overall_trust_score": 40,
  "score_summary": {
    "evidence": 71,
    "employer": 60,
    "staking": 0,
    "veridex": 40
  },
  "score_components": {
    "identity_assurance": 90,
    "employer_outcomes": 60,
    "grouped_scores": {
      "evidence": 71,
      "employer": 60,
      "staking": 0,
      "veridex": 40
    }
  },
  "total_staked": 0,
  "review_count": 1,
  "avg_rating": 5,
  "profession_category": "software",
  "skills": ["Python", "Machine Learning"],
  "specializations": ["Machine Learning"],
  "years_experience": 7
}`,
    notes: [
      'The example above is sanitized and trimmed, but the field names match the live response shape.',
      'Current production behavior sets `is_verified_human` to `true` for any resolved account returned by this route.',
    ],
  },
  {
    method: 'GET',
    path: '/api/reputation/:userId',
    auth: 'None',
    purpose: 'Return the public profile surface for a user, including the current worker profile payload, active reviews, and stake totals.',
    params: [
      {
        name: 'userId',
        description: 'User UUID for the profile you want to inspect.',
      },
    ],
    successShape: [
      'Top-level `user`, `profile`, `reviews`, `totalStaked`, and `stakerCount` keys',
      '`user` contains the public user record minus nested worker profile data',
      '`profile` contains the current stored worker profile object and may include additional computed fields when populated',
    ],
    errors: [
      '`404` with `{ "error": "User not found" }` when the ID does not resolve',
      '`500` with `{ "error": "Failed to get reputation" }` if the profile lookup fails',
    ],
    curl: `curl <base-url>/api/reputation/<user-id>`,
    responseExample: `{
  "user": {
    "id": "user-uuid",
    "display_name": "Worker Name",
    "roles": ["worker"],
    "profession_category": "software"
  },
  "profile": {
    "overall_trust_score": 40,
    "ingestion_status": "completed",
    "computed_skills": ["Python", "Machine Learning"],
    "score_components": {
      "grouped_scores": {
        "evidence": 71,
        "employer": 60,
        "staking": 0,
        "veridex": 40
      }
    }
  },
  "reviews": [
    {
      "id": "review-uuid",
      "rating": 5,
      "content": "Strong delivery on the engagement.",
      "job_category": "software",
      "stake_amount": 0,
      "reviewer_trust_score_at_time": 32,
      "status": "active",
      "reviewer": {
        "id": "reviewer-uuid",
        "display_name": "Hiring Manager",
        "roles": ["client"]
      }
    }
  ],
  "totalStaked": 0,
  "stakerCount": 0
}`,
    notes: [
      'This route currently returns a broader profile payload than the trust endpoint and is the best public source for review and stake context.',
      'Examples are intentionally trimmed and do not expose stored wallet or evidence metadata.',
    ],
  },
  {
    method: 'GET',
    path: '/api/review/:workerId',
    auth: 'None',
    purpose: 'List active public reviews for a worker in stake order, with reviewer display metadata attached.',
    params: [
      {
        name: 'workerId',
        description: 'User UUID for the worker whose active reviews you want to read.',
      },
    ],
    successShape: [
      'A single top-level `reviews` array',
      'Each review entry includes review metadata, scoring context, contract linkage when present, and a nested `reviewer` object',
      'Returns `200` with an empty `reviews` array when there are no active reviews',
    ],
    errors: [
      '`500` with `{ "error": "Failed to get reviews" }` if the query fails',
    ],
    curl: `curl <base-url>/api/review/<worker-id>`,
    responseExample: `{
  "reviews": [
    {
      "id": "review-uuid",
      "reviewer_id": "reviewer-uuid",
      "worker_id": "worker-uuid",
      "rating": 5,
      "content": "Strong delivery on the engagement.",
      "job_category": "software",
      "stake_amount": 0,
      "reviewer_trust_score_at_time": 32,
      "is_flagged": false,
      "flag_reason": null,
      "status": "active",
      "created_at": "2026-04-05T02:43:39.167026+00:00",
      "contract_id": "contract-uuid",
      "reviewer": {
        "id": "reviewer-uuid",
        "display_name": "Hiring Manager"
      }
    }
  ]
}`,
    notes: [
      'This route is narrower than `/api/reputation/:userId` and is the cleanest feed for standalone review ingestion.',
    ],
  },
  {
    method: 'GET',
    path: '/api/agent/:agentId',
    auth: 'None',
    purpose: 'Resolve an agent credential back to its parent human, including the delegated score snapshot used for public verification.',
    status: 'Beta',
    params: [
      {
        name: 'agentId',
        description: 'Agent credential UUID.',
      },
    ],
    successShape: [
      '`agent_id`, `agent_name`, `derived_score`, and `created_at`',
      'Nested `parent` object containing `veridex_id`, `display_name`, `is_verified_human`, `overall_trust_score`, and `roles`',
    ],
    errors: [
      '`404` with `{ "error": "Agent not found" }` when the credential does not exist',
      '`500` with `{ "error": "Lookup failed" }` if the lookup fails server-side',
    ],
    curl: `curl <base-url>/api/agent/<agent-id>`,
    responseExample: `{
  "agent_id": "agent-uuid",
  "agent_name": "Shopping Agent",
  "derived_score": 59,
  "created_at": "2026-04-05T01:23:45.000Z",
  "parent": {
    "veridex_id": "user-uuid",
    "display_name": "Verified Human",
    "is_verified_human": true,
    "overall_trust_score": 85,
    "roles": ["worker"]
  }
}`,
    notes: [
      'This route is live, but there is currently no seeded public example credential in the dataset.',
      'Treat this endpoint as beta until live agent credentials are being issued in production.',
    ],
  },
];

const codeBlockStyle: CSSProperties = {
  margin: 0,
  padding: '18px 20px',
  borderRadius: '16px',
  background: '#0F172A',
  color: '#E2E8F0',
  overflowX: 'auto',
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: '13px',
  lineHeight: 1.65,
  whiteSpace: 'pre',
};

const inlineCodeStyle: CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: '0.95em',
  color: colors.primaryDark,
  background: 'rgba(37,99,235,0.08)',
  border: '1px solid rgba(37,99,235,0.16)',
  borderRadius: '8px',
  padding: '2px 6px',
};

const subheadingStyle: CSSProperties = {
  ...headingSm,
  marginBottom: '10px',
};

function renderInlineCode(text: string) {
  const parts = text.split('`');

  return parts.map((part, index) => (
    index % 2 === 1
      ? <code key={`${part}-${index}`} style={inlineCodeStyle}>{part}</code>
      : <span key={`${part}-${index}`}>{part}</span>
  ));
}

function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'beta';
}) {
  const palette = tone === 'beta'
    ? {
        color: '#92400E',
        background: 'rgba(245,158,11,0.14)',
        border: '1px solid rgba(245,158,11,0.3)',
      }
    : {
        color: colors.primary,
        background: 'rgba(37,99,235,0.08)',
        border: '1px solid rgba(37,99,235,0.18)',
      };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        ...palette,
      }}
    >
      {children}
    </span>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointDoc }) {
  return (
    <GlassCard style={{ padding: '32px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Badge>{endpoint.method}</Badge>
            {endpoint.status ? <Badge tone="beta">{endpoint.status}</Badge> : null}
          </div>
          <h2 style={{ ...headingMd, fontSize: '24px', marginBottom: '10px' }}>{endpoint.path}</h2>
          <p style={{ ...textSecondary, fontSize: '15px', maxWidth: '760px' }}>{endpoint.purpose}</p>
        </div>
        <div
          style={{
            minWidth: '180px',
            borderRadius: '16px',
            border: '1px solid rgba(37,99,235,0.12)',
            background: 'rgba(255,255,255,0.58)',
            padding: '16px',
          }}
        >
          <div style={{ ...textMuted, marginBottom: '6px' }}>Auth</div>
          <div style={{ ...headingSm, fontSize: '14px' }}>{endpoint.auth}</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(37,99,235,0.12)',
            background: 'rgba(255,255,255,0.56)',
            padding: '18px',
          }}
        >
          <h3 style={subheadingStyle}>Path Params</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {endpoint.params.map((param) => (
              <div key={param.name}>
                <div style={{ ...headingSm, fontSize: '14px', marginBottom: '4px' }}>{param.name}</div>
                <p style={{ ...textSecondary, fontSize: '14px' }}>{param.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(37,99,235,0.12)',
            background: 'rgba(255,255,255,0.56)',
            padding: '18px',
          }}
        >
          <h3 style={subheadingStyle}>Success Shape</h3>
          <ul style={{ margin: 0, paddingLeft: '18px', color: colors.textSecondary, lineHeight: 1.7 }}>
            {endpoint.successShape.map((item) => (
              <li key={item} style={{ marginBottom: '8px' }}>
                {renderInlineCode(item)}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(37,99,235,0.12)',
            background: 'rgba(255,255,255,0.56)',
            padding: '18px',
          }}
        >
          <h3 style={subheadingStyle}>Common Errors</h3>
          <ul style={{ margin: 0, paddingLeft: '18px', color: colors.textSecondary, lineHeight: 1.7 }}>
            {endpoint.errors.map((item) => (
              <li key={item} style={{ marginBottom: '8px' }}>
                {renderInlineCode(item)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <h3 style={subheadingStyle}>cURL</h3>
          <pre style={codeBlockStyle}>{endpoint.curl}</pre>
        </div>
        <div>
          <h3 style={subheadingStyle}>Response Example</h3>
          <pre style={codeBlockStyle}>{endpoint.responseExample}</pre>
        </div>
      </div>

      {endpoint.notes?.length ? (
        <>
          <hr style={{ ...separator, margin: '22px 0 0 0' }} />
          <div style={{ display: 'grid', gap: '10px', paddingTop: '18px' }}>
            {endpoint.notes.map((note) => (
              <p key={note} style={{ ...textSecondary, fontSize: '14px' }}>
                {renderInlineCode(note)}
              </p>
            ))}
          </div>
        </>
      ) : null}
    </GlassCard>
  );
}

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        <div style={{ marginBottom: '40px' }}>
          <span style={sectionLabel}>Public API</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            <div>
              <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 14px 0' }}>
                Veridex API Docs
              </h1>
              <p style={{ ...textSecondary, fontSize: '17px', maxWidth: '760px' }}>
                Production-facing documentation for the public Veridex read surfaces that are live today.
                These docs are intentionally narrow: only currently working endpoints are documented here.
              </p>
            </div>

            <GlassCard style={{ padding: '24px' }}>
              <span style={{ ...sectionLabel, marginBottom: '14px' }}>Scope</span>
              <div style={{ display: 'grid', gap: '12px' }}>
                <p style={{ ...textSecondary, fontSize: '14px' }}>
                  All routes on this page are public <code style={inlineCodeStyle}>GET</code> endpoints and do not require a bearer token.
                </p>
                <p style={{ ...textSecondary, fontSize: '14px' }}>
                  Response examples are sanitized and trimmed to avoid publishing raw wallet, evidence, or storage metadata.
                </p>
                <Link href="/agents" className="btn-secondary" style={{ width: 'fit-content', textDecoration: 'none' }}>
                  Back to Credentials
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>

        <GlassCard style={{ marginBottom: '24px' }}>
          <span style={sectionLabel}>Quick Start</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              style={{
                borderRadius: '16px',
                border: '1px solid rgba(37,99,235,0.12)',
                background: 'rgba(255,255,255,0.58)',
                padding: '20px',
              }}
            >
              <div style={{ ...textMuted, marginBottom: '8px' }}>Base URL</div>
              <p style={{ ...headingSm, fontSize: '14px', marginBottom: '8px' }}>&lt;base-url&gt;</p>
              <p style={{ ...textSecondary, fontSize: '14px' }}>
                Replace with the deployed API origin for your environment before issuing requests.
              </p>
            </div>

            <div
              style={{
                borderRadius: '16px',
                border: '1px solid rgba(37,99,235,0.12)',
                background: 'rgba(255,255,255,0.58)',
                padding: '20px',
              }}
            >
              <div style={{ ...textMuted, marginBottom: '8px' }}>Format</div>
              <p style={{ ...headingSm, fontSize: '14px', marginBottom: '8px' }}>JSON responses</p>
              <p style={{ ...textSecondary, fontSize: '14px' }}>
                All documented routes return JSON and use a simple <code style={inlineCodeStyle}>{'{ "error": "..." }'}</code> pattern for documented failures.
              </p>
            </div>

            <div
              style={{
                borderRadius: '16px',
                border: '1px solid rgba(37,99,235,0.12)',
                background: 'rgba(255,255,255,0.58)',
                padding: '20px',
              }}
            >
              <div style={{ ...textMuted, marginBottom: '8px' }}>Coverage</div>
              <p style={{ ...headingSm, fontSize: '14px', marginBottom: '8px' }}>Current prod surfaces</p>
              <p style={{ ...textSecondary, fontSize: '14px' }}>
                Trust, reputation, review, and beta agent lookup are included. Undocumented or broken routes are intentionally excluded.
              </p>
            </div>
          </div>
        </GlassCard>

        <div style={{ display: 'grid', gap: '24px', marginBottom: '24px' }}>
          {endpointDocs.map((endpoint) => (
            <EndpointCard key={endpoint.path} endpoint={endpoint} />
          ))}
        </div>

        <GlassCard>
          <span style={sectionLabel}>Intentionally Undocumented</span>
          <h2 style={{ ...headingMd, fontSize: '24px', marginBottom: '12px' }}>
            Routes excluded from the public contract
          </h2>
          <p style={{ ...textSecondary, marginBottom: '18px' }}>
            <code style={inlineCodeStyle}>GET /api/reputation/browse/workers</code> is not included in the production docs yet. The current route order
            allows <code style={inlineCodeStyle}>GET /api/reputation/:userId</code> to shadow it, so it is excluded until that bug is fixed.
          </p>
          <p style={{ ...textSecondary, fontSize: '14px' }}>
            This page is the source of truth for what external consumers should rely on right now.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
