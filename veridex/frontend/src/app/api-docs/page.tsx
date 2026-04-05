import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Veridex API Docs',
  description: 'Editorial API documentation for the public Veridex trust and verification surfaces that are live today.',
};

type EndpointDoc = {
  id: string;
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
    id: 'trust',
    method: 'GET',
    path: '/api/trust/:veridexId',
    auth: 'None',
    purpose:
      'Resolve the public trust surface for a Veridex user, including Veridex score, score summaries, staking totals, and review aggregates.',
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
    curl: 'curl <base-url>/api/trust/<veridex-id>',
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
    id: 'reputation',
    method: 'GET',
    path: '/api/reputation/:userId',
    auth: 'None',
    purpose:
      'Return the public profile surface for a user, including the current worker profile payload, active reviews, and stake totals.',
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
    curl: 'curl <base-url>/api/reputation/<user-id>',
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
    id: 'reviews',
    method: 'GET',
    path: '/api/review/:workerId',
    auth: 'None',
    purpose:
      'List active public reviews for a worker in stake order, with reviewer display metadata attached.',
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
    curl: 'curl <base-url>/api/review/<worker-id>',
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
    id: 'agent',
    method: 'GET',
    path: '/api/agent/:agentId',
    auth: 'None',
    purpose:
      'Resolve an agent credential back to its parent human, including the delegated score snapshot used for public verification.',
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
    curl: 'curl <base-url>/api/agent/<agent-id>',
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

function InlineCode({ children }: { children: ReactNode }) {
  return <code className={styles.inlineCode}>{children}</code>;
}

function renderInlineCode(text: string) {
  const parts = text.split('`');

  return parts.map((part, index) => (
    index % 2 === 1 ? <InlineCode key={`${part}-${index}`}>{part}</InlineCode> : <span key={`${part}-${index}`}>{part}</span>
  ));
}

function EndpointSection({ endpoint }: { endpoint: EndpointDoc }) {
  return (
    <section id={endpoint.id} className={`${styles.docSection} ${styles.endpointSection}`}>
      <div className={styles.sectionTopline}>
        <span className={styles.sectionKicker}>{endpoint.method}</span>
        {endpoint.status ? <span className={styles.statusBadge}>{endpoint.status}</span> : null}
      </div>

      <h2 className={styles.endpointPath}>{endpoint.path}</h2>
      <p className={styles.endpointPurpose}>{endpoint.purpose}</p>

      <dl className={styles.factsGrid}>
        <div className={styles.fact}>
          <dt>Auth</dt>
          <dd>{endpoint.auth}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Path params</dt>
          <dd>
            {endpoint.params.length} required
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Response</dt>
          <dd>JSON</dd>
        </div>
      </dl>

      <div className={styles.detailBlock}>
        <h3 className={styles.blockHeading}>Path parameters</h3>
        <table className={styles.docTable}>
          <thead>
            <tr>
              <th>Param</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoint.params.map((param) => (
              <tr key={param.name}>
                <td>
                  <InlineCode>{param.name}</InlineCode>
                </td>
                <td>{param.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.detailBlock}>
        <h3 className={styles.blockHeading}>Success shape</h3>
        <ul className={styles.editorialList}>
          {endpoint.successShape.map((item) => (
            <li key={item}>{renderInlineCode(item)}</li>
          ))}
        </ul>
      </div>

      <div className={styles.detailBlock}>
        <h3 className={styles.blockHeading}>Common errors</h3>
        <ul className={styles.editorialList}>
          {endpoint.errors.map((item) => (
            <li key={item}>{renderInlineCode(item)}</li>
          ))}
        </ul>
      </div>

      <div className={styles.detailBlock}>
        <h3 className={styles.blockHeading}>Examples</h3>
        <div className={styles.exampleGrid}>
          <div>
            <div className={styles.exampleLabel}>Request</div>
            <pre className={styles.codeBlock}>{endpoint.curl}</pre>
          </div>
          <div>
            <div className={styles.exampleLabel}>Response</div>
            <pre className={styles.codeBlock}>{endpoint.responseExample}</pre>
          </div>
        </div>
      </div>

      {endpoint.notes?.length ? (
        <blockquote className={styles.noteBlock}>
          {endpoint.notes.map((note) => (
            <p key={note}>{renderInlineCode(note)}</p>
          ))}
        </blockquote>
      ) : null}
    </section>
  );
}

export default function ApiDocsPage() {
  return (
    <div className={styles.docsPage}>
      <div className={styles.docsFrame}>
        <aside className={styles.docsSidebar}>
          <div className={styles.sidebarInner}>
            <p className={styles.sidebarEyebrow}>Public API</p>
            <nav className={styles.sidebarNav} aria-label="API sections">
              <a href="#overview">Overview</a>
              {endpointDocs.map((endpoint) => (
                <a key={endpoint.id} href={`#${endpoint.id}`}>
                  {endpoint.path}
                </a>
              ))}
              <a href="#notes">Notes</a>
            </nav>

            <div className={styles.sidebarMeta}>
              <div>
                <span>Scope</span>
                <p>Public read surfaces only.</p>
              </div>
              <div>
                <span>Format</span>
                <p>JSON responses with restrained, sanitized examples.</p>
              </div>
              <div>
                <span>Status</span>
                <p>Agent lookup is live, but still documented as beta.</p>
              </div>
            </div>

            <Link href="/agents" className={styles.textLink}>
              Back to Credentials
            </Link>
          </div>
        </aside>

        <main className={styles.docsMain}>
          <header id="overview" className={styles.hero}>
            <p className={styles.heroEyebrow}>Veridex API</p>
            <h1>Trust surfaces, documented with restraint.</h1>
            <p className={styles.heroBody}>
              This documentation covers the public Veridex endpoints that are live today. It is intentionally
              narrow, deliberately calm, and written as a reference rather than a dashboard.
            </p>
            <p className={styles.heroBody}>
              Every route on this page is a public <InlineCode>GET</InlineCode> endpoint. Response examples are
              sanitized to avoid publishing wallet addresses, evidence storage metadata, or raw platform exports.
            </p>
          </header>

          <section className={styles.docSection}>
            <h2 className={styles.sectionHeading}>Reading guide</h2>
            <div className={styles.overviewRows}>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>Base URL</div>
                <div className={styles.overviewCopy}>
                  Replace <InlineCode>&lt;base-url&gt;</InlineCode> with the deployed API origin for your environment.
                </div>
              </div>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>Authentication</div>
                <div className={styles.overviewCopy}>
                  The documented routes are public and do not require a bearer token.
                </div>
              </div>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>What is included</div>
                <div className={styles.overviewCopy}>
                  Trust, reputation, reviews, and beta agent lookup. Broken or undocumented routes stay out of this contract.
                </div>
              </div>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>Tone</div>
                <div className={styles.overviewCopy}>
                  These docs are the public contract for what external consumers should rely on right now.
                </div>
              </div>
            </div>
          </section>

          {endpointDocs.map((endpoint) => (
            <EndpointSection key={endpoint.id} endpoint={endpoint} />
          ))}

          <section id="notes" className={styles.docSection}>
            <h2 className={styles.sectionHeading}>Notes</h2>
            <blockquote className={styles.noteBlock}>
              <p>
                <InlineCode>GET /api/reputation/browse/workers</InlineCode> is intentionally excluded from the public
                contract. The current route order allows <InlineCode>GET /api/reputation/:userId</InlineCode> to shadow
                it, so it stays undocumented until that behavior is fixed.
              </p>
            </blockquote>
            <p className={styles.closingCopy}>
              The product-facing route for this page is <InlineCode>/api-docs</InlineCode>. The legacy
              <InlineCode>/query-demo</InlineCode> path still redirects here for compatibility.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
