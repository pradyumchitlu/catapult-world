import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Veridex API Docs',
  description: 'Editorial API documentation for the live Veridex trust surfaces and embedded login partner app setup.',
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
              <a href="#embedded-login">Embedded Login</a>
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
                <p>Public docs plus signed-in partner app management.</p>
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
          </div>
        </aside>

        <main className={styles.docsMain}>
          <header id="overview" className={styles.hero}>
            <p className={styles.heroEyebrow}>Veridex API</p>
            <h1>Trust surfaces, documented with restraint.</h1>
            <p className={styles.heroBody}>
              This documentation covers the public Veridex endpoints that are live today, plus the new embedded login
              contract for partner apps. It is intentionally narrow, deliberately calm, and written as a reference
              rather than a dashboard.
            </p>
            <p className={styles.heroBody}>
              Trust response examples are sanitized to avoid publishing wallet addresses, evidence storage metadata,
              or raw platform exports. Embedded login remains additive and does not replace the existing first-party
              Veridex login.
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
                  Trust routes are public. Embedded login uses OAuth-style partner credentials and does not affect the
                  normal Veridex app bearer token flow.
                </div>
              </div>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>What is included</div>
                <div className={styles.overviewCopy}>
                  Embedded login, developer app setup, trust, reputation, reviews, and beta agent lookup. Broken or
                  undocumented routes stay out of this contract.
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

          <section id="embedded-login" className={styles.docSection}>
            <h2 className={styles.sectionHeading}>Embedded Login</h2>
            <div className={styles.overviewRows}>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>Authorize URL</div>
                <div className={styles.overviewCopy}>
                  <InlineCode>GET /auth/authorize</InlineCode> accepts <InlineCode>client_id</InlineCode>, <InlineCode>redirect_uri</InlineCode>, <InlineCode>response_type=code</InlineCode>, <InlineCode>scope</InlineCode>, <InlineCode>state</InlineCode>, <InlineCode>code_challenge</InlineCode>, <InlineCode>code_challenge_method=S256</InlineCode>, and optional <InlineCode>response_mode=web_message|query</InlineCode>.
                </div>
              </div>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>Token exchange</div>
                <div className={styles.overviewCopy}>
                  <InlineCode>POST /api/oauth/token</InlineCode> is server-side only in v1 and expects <InlineCode>grant_type</InlineCode>, <InlineCode>client_id</InlineCode>, <InlineCode>client_secret</InlineCode>, <InlineCode>code</InlineCode>, <InlineCode>redirect_uri</InlineCode>, and <InlineCode>code_verifier</InlineCode>.
                </div>
              </div>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>Identity payload</div>
                <div className={styles.overviewCopy}>
                  Tokens and <InlineCode>GET /api/oauth/userinfo</InlineCode> return identity-first fields: <InlineCode>sub</InlineCode>, <InlineCode>veridex_user_id</InlineCode>, and profile fields only when <InlineCode>profile</InlineCode> scope is granted.
                </div>
              </div>
              <div className={styles.overviewRow}>
                <div className={styles.overviewLabel}>Partner setup</div>
                <div className={styles.overviewCopy}>
                  Use the dedicated developer apps page to create partner apps. Each app gets a <InlineCode>client_id</InlineCode>, one-time <InlineCode>client_secret</InlineCode>, and a registered redirect URI allowlist.
                </div>
              </div>
            </div>

            <div className={`${styles.docsCta} ${styles.embeddedDocsCta}`}>
              <div>
                <p className={styles.exampleLabel}>Developer Apps</p>
                <h3 className={styles.ctaHeading}>Need a client ID and secret?</h3>
                <p className={styles.closingCopy}>
                  Open the dedicated developer apps page to register a partner client and manage callback allowlists.
                </p>
              </div>
              <Link href="/developers/apps" className={styles.ctaButton}>
                Open Developer Apps
              </Link>
            </div>

            <div className={styles.detailBlock} style={{ marginTop: '28px' }}>
              <h3 className={styles.blockHeading}>Hosted SDK</h3>
              <div className={styles.exampleGrid}>
                <div>
                  <div className={styles.exampleLabel}>Browser</div>
                  <pre className={styles.codeBlock}>{`<script src="<base-url>/veridex-auth.js"></script>
<script>
  async function loginWithVeridex() {
    const auth = await window.VeridexAuth.login({
      baseUrl: '<base-url>',
      clientId: 'vdx_cli_...',
      redirectUri: 'https://partner.example.com/auth/callback'
    });

    await fetch('/api/veridex/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auth)
    });
  }
</script>`}</pre>
                </div>
                <div>
                  <div className={styles.exampleLabel}>Backend</div>
                  <pre className={styles.codeBlock}>{`POST <base-url>/api/oauth/token
{
  "grant_type": "authorization_code",
  "client_id": "vdx_cli_...",
  "client_secret": "vdx_sec_...",
  "code": "<auth code>",
  "redirect_uri": "https://partner.example.com/auth/callback",
  "code_verifier": "<pkce verifier>"
}`}</pre>
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
              The product-facing route for docs is <InlineCode>/api-docs</InlineCode>. Legacy <InlineCode>/query-demo</InlineCode>
              still redirects here for compatibility, while <InlineCode>/developers/apps</InlineCode> now hosts the
              standalone management experience.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
