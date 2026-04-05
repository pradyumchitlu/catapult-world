# Veridex Team Guide

A decentralized trust platform where verified humans build portable reputation, stake WLD on each other's integrity, and register **Agent Credentials** that cryptographically bind AI agents to human identity, reputation, and stake.

This document is the team’s single source of truth for what Veridex is, how the repo is laid out, how to run it, and who owns which workstreams.

---

## About Veridex (full project description)

### One-liner

**“What if your reputation was portable, stakeable, and worked for both you and your AI agents?”**

Veridex is a protocol that turns fragmented online reputation into a single, verified trust identity — and lets people put economic weight behind vouching for each other.

### Why this matters

Judges and users care about **problem clarity**, **technical ambition**, and **“I haven’t seen that before.”** Veridex is aimed at all three.

- **Problem clarity:** Trust online is broken. Every platform makes you start from zero. Bots and duplicate accounts undermine confidence. Hiring or collaborating often means trusting profiles that are easy to fake, with no portable history.
- **Technical ambition:** World ID verification, a vouching system with real economic weight, LLM-powered contextual scoring, a developer API, and a polished frontend — delivered as one coherent system.
- **Differentiator:** **Social staking** (vouching with consequences) and the **Guardian pattern** (your AI agent inherits and answers to your trust profile). That is infrastructure for how people and agents establish trust, not “yet another chatbot.”

### The core problem (lead with stories, not stack)

These are the human situations the product addresses:

> You hire someone through a platform. They have great reviews. Work moves off-platform to save fees. Suddenly those reviews do not travel with them. You are trusting a stranger again.

> You apply for a role. You have years of verified work, peer proof, and a strong public footprint on one channel. None of it transfers. You start from zero on every new system.

> You need someone for something important. A friend says, “I know someone — they’re solid.” That word-of-mouth vouch is the strongest trust signal we have — but it rarely exists in a verifiable, portable form online.

Veridex targets portable reputation, real vouching, and the same trust model for **humans and their AI agents**.

### Architecture — what we are actually building

#### Layer 1 — World ID verification (proof of personhood)

Every user verifies through World ID: one real human, one identity, sharply reduced bots and duplicates. This is the foundation; scoring and staking assume a verified person.

**Build:** World ID SDK integration; on success, create a Veridex identity. This is the entry point for demos and the first “this is a real person” moment.

**Pitch line:** Before we score anyone, we answer the basics: is this a real person, not a bot or throwaway account? World ID gives cryptographic proof of personhood.

#### Layer 2 — Reputation aggregation pipeline

Pull verified signals from a user’s digital life and normalize them into one profile.

**Sources that resonate in demos:**

- **GitHub** — contributions, repos, activity (especially for technical roles).
- **Professional history** — work history, tenure, structured evidence (e.g. LinkedIn-style fields or manual onboarding data).
- **Peer endorsements** — references from other verified Veridex users (e.g. staked reviews).

**Build:** A backend pipeline that ingests multiple sources, normalizes to a shared schema, and keeps the profile current. The hackathon goal is to show the _pattern_: many inputs → one living profile.

**Pitch line:** Today reputation is scattered. Veridex aggregates it into one verified, portable profile.

#### Layer 3 — LLM-powered contextual trust scoring

Trust is not one-dimensional. A strong engineer might be a weak fit for another role; a reliable generalist might have thin evidence in a niche. The system produces **context-specific** assessments by reasoning over structured reputation data (e.g. Gemini), not a single static “credit score.”

**Build:** A structured prompt pipeline: aggregated data + natural-language question → confidence-weighted assessment **with reasoning** (what mattered, where uncertainty is high).

**Pitch line:** Traditional tools give star ratings. Veridex gives an assessment tailored to the exact question — with evidence cited from verified history.

#### Layer 4 — Social staking (vouching with skin in the game)

The strongest offline trust signal is a personal vouch. Veridex makes that digital and gives it **economic weight**: stake on someone you believe in; that stake is visible and consequential (returns or loss depending on design and whether you use testnet or simulated balances for the demo).

**Why it matters:** Eases **cold start**, increases **accountability** (vouching is not free), and mirrors **how trust works in the real world** — now verifiable.

**Pitch line:** Most systems are backward-looking (ratings, history). Social staking is also **forward-looking**: who is willing to bet on this person _now_?

#### Layer 5 — Portable trust API

Expose a clean **developer API** so other products can query trust for a user in a given context (aligned with endpoints like querying trust score and profile data — see API Reference below).

**Example use cases (no in-app marketplace required):** hiring workflows, rental or access verification, community integrity checks, any product that needs “is this person real, credible, and who vouches for them?” in one integration.

**Pitch line:** Veridex is not only a UI — it is **infrastructure** other systems can call instead of reinventing identity and reputation silos.

_Out of scope for this plan:_ building our own **marketplace** or a **“data rent”** / pay-per-query business model around third parties paying users for lookups. The API is still valuable as a trust and integration surface.

#### Layer 6 — Guardian pattern (AI agent identity)

Agents act on our behalf — scheduling, applying, negotiating — but it is hard to answer: **whose** agent is this, and who is accountable if it misbehaves?

**Model:** A verified human can register agents bound to their Veridex identity. The agent inherits a **fractional** trust signal from the human. Third parties can see the link. Misbehavior can flow back to the human’s reputation (and staking design).

**Pitch line:** In the agentic era, Veridex ties agent trust to a **real, verified human** — accountability by design.

#### Layer 7 — Trust dashboard and proof explorer

A polished Next.js experience: unified trust identity, contextual scores, vouch/stake relationships, agent registry, and activity worth showing on screen for demos.

### Demo narrative (reference)

Structure the live demo as a **story**; avoid showing features without a human reason.

1. **“This person is real.”** — World ID → Veridex identity → empty dashboard.
2. **“This person is credible.”** — Connect GitHub and professional evidence → pipeline fills the profile → ask a natural-language qualification question → LLM returns a reasoned answer.
3. **“Other people bet on this person.”** — A colleague vouches with a stake → visible on the profile / graph → social trust signal jumps.
4. **“Even the AI agent is accountable.”** — Spawn an agent linked to the human → inherited trust → show verification for a simple scenario (e.g. agent acting on the user’s behalf with traceable backing).
5. **“Other systems can integrate.”** — A **mock external app** or script calls the Trust API and shows structured trust/context (no marketplace or micropayment storyline required).

**Closing angle:** Every platform today builds its own trust silo. Veridex aims to make trust **portable**, **stakeable**, and **agent-aware** — trust infrastructure, not a single closed app.

### What judges may ask (short answers)

| Question                            | Direction                                                                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **vs LinkedIn / background checks** | Self-reported vs verified signals; portability and real-time contextual reasoning; staking and agent binding are not generic profile features. |
| **Gaming**                          | World ID limits sybils; structured data + LLM can surface inconsistencies; staking makes vouching costly for bad actors.                       |
| **Why vouch for someone?**          | Same as references today — belief and reciprocity — with explicit, visible stakes.                                                             |
| **Is AI scoring a black box?**      | Scores and answers should cite reasoning and evidence where the product exposes them.                                                          |
| **Agent misbehavior**               | Agent trust derives from the human; incentives align with monitoring and controlling agents.                                                   |

---

## Project Structure

```
veridex/
├── frontend/                    # Next.js 14 + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/                 # Pages (App Router)
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── verify/          # World ID verification
│   │   │   ├── onboarding/      # User setup (roles, GitHub, profession)
│   │   │   ├── dashboard/       # Worker dashboard
│   │   │   ├── browse/          # Browse workers marketplace
│   │   │   ├── profile/[id]/    # Public worker profile
│   │   │   ├── staker/          # Staker portfolio
│   │   │   ├── review/[workerId]/ # Leave a review
│   │   │   ├── agents/          # Agent management
│   │   │   └── query-demo/      # External API demo
│   │   │
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── WorldIDButton.tsx
│   │   │   ├── GitHubConnectButton.tsx
│   │   │   ├── TrustScoreCard.tsx
│   │   │   ├── ScoreBreakdown.tsx      # Radar chart
│   │   │   ├── ContextualScoreCard.tsx
│   │   │   ├── WorkerCard.tsx
│   │   │   ├── StakeButton.tsx
│   │   │   ├── StakePortfolio.tsx
│   │   │   ├── ReviewCard.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   ├── ReviewsList.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── JobDescriptionInput.tsx
│   │   │   ├── QueryLog.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   │
│   │   ├── lib/                 # Utilities
│   │   │   ├── supabase.ts      # Supabase browser client
│   │   │   ├── api.ts           # Backend API wrappers
│   │   │   └── worldid.ts       # World ID MiniKit helpers
│   │   │
│   │   └── types/
│   │       └── index.ts         # TypeScript interfaces
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/                     # Express + TypeScript API
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   │
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.ts          # World ID verify, GitHub OAuth
│   │   │   ├── reputation.ts    # Ingest GitHub, get profile
│   │   │   ├── query.ts         # External trust/agent APIs
│   │   │   ├── stake.ts         # Stake WLD on workers
│   │   │   ├── review.ts        # Staked reviews
│   │   │   ├── contextual.ts    # Contextual fit scoring
│   │   │   ├── agent.ts         # Register/list agents (Agent Credential)
│   │   │   └── chat.ts          # AI chatbot
│   │   │
│   │   ├── services/            # Business logic
│   │   │   ├── github.ts        # GitHub API client
│   │   │   ├── scoring.ts       # Trust score computation
│   │   │   ├── contextual.ts    # Contextual fit scoring
│   │   │   ├── agent.ts         # Agent identity logic
│   │   │   └── gemini.ts        # Gemini API client
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT verification
│   │   │
│   │   └── lib/
│   │       └── supabase.ts      # Supabase server client
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/
│   └── schema.sql               # Database schema (run in Supabase SQL Editor)
│
├── .env.example                 # Environment variables template
└── README.md
```

---

## Agent Credential model (not “agent spawning”)

Veridex treats agents as **registered credentials** tied to a verified human (World ID), not disposable “spawned” identities.

**Registration.** A verified human says they want to register an agent. They supply an **agent identifier** — e.g. a public key the agent uses to sign actions, an API endpoint, a wallet address, or whatever surface the agent uses. Veridex mints an on-chain **Agent Credential** (token or registry entry) that links that identifier to the human’s World ID and trust score. The human sets **trust inheritance** (e.g. 0.7× of their score), **authorized domains** (DeFi, negotiation, content, etc.), and optionally **stake** locked as collateral for that agent’s behavior.

**Verification.** Third parties query Veridex: “Is this agent legitimate?” The API returns whether the agent is bound to a verified human, effective trust, authorized domains, and stake backing the credential — cryptographic accountability the counterparty can rely on.

**Accountability.** If the agent misbehaves, anyone can file a **dispute** against the credential. If the dispute is validated (governance as you define it — multisig, staking arbitration, etc.), the human’s trust score is penalized and **stake can be slashed**. Humans have skin in the game for every agent they deploy.

**Hierarchy.** One human can register **multiple agents** with different trust multipliers and stakes (e.g. a high-stakes trading agent vs. a low-stakes email assistant), managed from the dashboard: activity, inheritance, disputes, and staking per agent.

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm
- Supabase account (free tier works)

### 1. Install Dependencies

```bash
# From the veridex/ directory
cd frontend && npm install
cd ../backend && npm install
```

### 2. Set Up Database

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste contents of `supabase/schema.sql` → Run

### 3. Configure Environment Variables

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_WORLD_APP_ID=your_world_app_id
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend** (`backend/.env`):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
# Or split keys (used if GEMINI_API_KEY is unset):
# GEMINI_SCORING_API_KEY=...
# GEMINI_CHATBOT_API_KEY=...
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
PORT=8000
FRONTEND_URL=http://localhost:3000
```

### 4. Run Development Servers

```bash
# Terminal 1 - Frontend (localhost:3000)
cd frontend && npm run dev

# Terminal 2 - Backend (localhost:8000)
cd backend && npm run dev
```

---

## Team Assignments

### Person 1: World ID + Authentication

**Focus:** User verification and session management

**Files to work on:**

```
frontend/
├── src/app/verify/page.tsx          # World ID verification UI
├── src/components/WorldIDButton.tsx  # Verification button component
└── src/lib/worldid.ts               # MiniKit integration

backend/
└── src/routes/auth.ts               # Verify endpoint, GitHub OAuth
```

**Key tasks:**

- [ ] Integrate World ID MiniKit SDK (`@worldcoin/minikit-js`)
- [ ] Implement proof verification with World ID API
- [ ] Complete GitHub OAuth flow (exchange code for token)
- [ ] Set up user session management with Supabase Auth
- [ ] Handle verification errors gracefully

**API Endpoints:**

- `POST /api/auth/verify` - Verify World ID proof
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - Handle OAuth callback

---

### Person 2: Backend + Scoring Engine

**Focus:** Core business logic, GitHub ingestion, trust scoring

**Files to work on:**

```
backend/
├── src/services/
│   ├── github.ts                    # GitHub API data fetching
│   └── scoring.ts                   # Trust score computation
│
├── src/routes/
│   ├── reputation.ts                # Ingest + get profile
│   ├── stake.ts                     # Stake/withdraw WLD
│   └── review.ts                    # Create/get reviews
```

**Key tasks:**

- [ ] Complete GitHub data ingestion (repos, commits, PRs)
- [ ] Implement all 6 score components
- [ ] Add integrity mechanisms:
  - Trust-weighted reviews
  - Mutual review detection
  - Stake concentration penalty
- [ ] Handle stake creation/withdrawal with balance checks
- [ ] Trigger score recomputation on new reviews

**API Endpoints:**

- `POST /api/reputation/evidence` - Save manual LinkedIn/project evidence and recompute score
- `POST /api/reputation/ingest` - Fetch GitHub data, compute scores
- `GET /api/reputation/:userId` - Get full profile
- `POST /api/stake` - Stake WLD on worker
- `POST /api/stake/withdraw` - Withdraw stake
- `POST /api/review` - Leave staked review
- `GET /api/review/:workerId` - Get reviews

**Score Components (0-100 each):**

1. `developer_competence` - Repo quality, stars, languages
2. `collaboration` - External PRs, issues, contributions
3. `consistency` - Commit frequency, active months
4. `specialization_depth` - Language focus, topics
5. `activity_recency` - Recent commits
6. `peer_trust` - Weighted reviews

**Person 2 Handoff Note (Apr 4):**

- Base reputation scoring is still algorithmic in `veridex/backend/src/services/scoring.ts`; it does not use an LLM for `overall_trust_score`.
- The scorer now uses 3 evidence buckets: GitHub data, manual professional evidence (`linkedin_data` + `other_platforms.projects`), and staked reviews.
- `veridex/backend/src/services/reputationIngestion.ts` is now the shared sync path for reputation updates. Both `POST /api/reputation/ingest` and the GitHub OAuth callback use it, so GitHub connect and manual re-ingest now hit the same scoring pipeline.
- `veridex/backend/src/services/github.ts` was upgraded from the weak public-events heuristic to stronger public GitHub signals:
  - per-repo language aggregation
  - authored commit sampling across recent public repos
  - GitHub search for external PR / issue collaboration
- This materially improves `consistency`, `activity_recency`, and `computed_skills` quality for real users. Example dry-run on `pradyumchitlu` moved the score from `29` to `45` with the stronger GitHub signals.
- GitHub OAuth is now least-privilege: `GET /api/auth/github` only requests `read:user`, and the callback no longer persists GitHub access tokens in `worker_profiles.github_data`.
- `POST /api/reputation/evidence` is ready for frontend wiring. It accepts `userId` plus optional `github_username`, `linkedin_data`, `projects`, and `other_platforms`, then recomputes `computed_skills`, `specializations`, `years_experience`, and score fields.
- `POST /api/reputation/ingest` still works even if GitHub is not connected yet, as long as manual evidence or reviews exist.
- Review creation still triggers score recomputation, so manual evidence, GitHub evidence, and reviews all affect the updated worker score.

**Notes For Other People:**

- `Person 1`: preserve the current GitHub OAuth contract. Do not reintroduce broad repo scopes or store GitHub access tokens. The callback already auto-syncs the worker reputation through `syncWorkerReputation(...)`, so a successful GitHub connect should update `github_username`, `github_data`, score fields, and skills without a separate frontend ingest call.
- `Person 3`: a successful GitHub connect should now update the worker profile automatically after the OAuth redirect. For non-GitHub/manual profile building, send structured data to `POST /api/reputation/evidence`. No GitHub private repo permission is needed for the current product.
- `Person 4`: contextual scoring and agent logic can rely more heavily on `worker_profiles.computed_skills`, `specializations`, `years_experience`, and `github_data.{languages, contributions, collaboration}` because those fields are now populated from better GitHub-derived signals.

**Files Modified By Person 2 So Far:**

- `veridex/backend/src/routes/auth.ts` - GitHub OAuth now uses least privilege and auto-syncs the reputation layer
- `veridex/backend/src/routes/reputation.ts` - shared ingest path for GitHub/manual evidence
- `veridex/backend/src/routes/review.ts` - recomputes worker score after reviews
- `veridex/backend/src/services/github.ts` - stronger public GitHub signal extraction
- `veridex/backend/src/services/scoring.ts` - adaptive reputation scoring engine
- `veridex/backend/src/services/reputationIngestion.ts` - shared GitHub/manual sync pipeline
- `veridex/backend/src/services/reputationProfile.ts` - worker profile ensure/merge helpers
- `veridex/backend/src/routes/query.ts` and `veridex/backend/src/services/contextual.ts` - minor TypeScript/build fixes

---

### Person 3: Frontend UI/UX

**Focus:** All pages and components, user experience

**Files to work on:**

```
frontend/
├── src/app/
│   ├── page.tsx                     # Landing page
│   ├── onboarding/page.tsx          # User setup flow
│   ├── dashboard/page.tsx           # Worker dashboard
│   ├── browse/page.tsx              # Worker marketplace
│   ├── profile/[id]/page.tsx        # Public profile
│   ├── staker/page.tsx              # Staker portfolio
│   └── review/[workerId]/page.tsx   # Review form
│
├── src/components/
│   ├── Navbar.tsx
│   ├── TrustScoreCard.tsx
│   ├── ScoreBreakdown.tsx           # Radar chart (recharts)
│   ├── WorkerCard.tsx
│   ├── StakeButton.tsx
│   ├── ReviewForm.tsx
│   └── ... (all other components)
│
└── src/lib/api.ts                   # API call functions
```

**Key tasks:**

- [ ] Connect all pages to real backend APIs
- [ ] Implement user state/context (logged in user, balance)
- [ ] Add loading states and error handling
- [ ] Polish the dark theme UI
- [ ] Make responsive for mobile
- [ ] Add filters/search to browse page
- [ ] Implement the review form with stake slider

**Pages:**
| Page | Description |
|------|-------------|
| `/` | Landing page with CTA |
| `/verify` | World ID verification |
| `/onboarding` | Role selection, GitHub connect |
| `/dashboard` | Worker's own profile + stats |
| `/browse` | Search/filter workers |
| `/profile/[id]` | View any worker's profile |
| `/staker` | Staker's portfolio |
| `/review/[id]` | Leave a review |

---

### Person 4: AI + Agents

**Focus:** Gemini integration, contextual scoring, Agent Credentials (registration, verification API, disputes/slashing narrative)

**Files to work on:**

```
backend/
├── src/services/
│   ├── gemini.ts                 # Gemini API client
│   ├── contextual.ts                # Fit scoring logic
│   └── agent.ts                     # Agent Credential logic
│
├── src/routes/
│   ├── chat.ts                      # AI chatbot endpoint
│   ├── contextual.ts                # Contextual score endpoint
│   └── agent.ts                     # Register/list agents (verification API)

frontend/
├── src/app/agents/page.tsx          # Agent management UI
├── src/components/
│   ├── ChatPanel.tsx                # Chat interface
│   ├── ContextualScoreCard.tsx      # Fit score display
│   └── AgentCard.tsx                # Agent display
```

**Key tasks:**

- [ ] Refine Gemini prompts for worker evaluation
- [ ] Implement job description parsing
- [ ] Build contextual fit scoring (met/partial/missing)
- [ ] Implement chat session management
- [ ] Agent Credential registration (identifier, inheritance fraction, domains, optional stake)
- [ ] Public agent lookup API for counterparties (verification flow)

**API Endpoints:**

- `POST /api/chat` - Send message, get AI response
- `POST /api/contextual-score` - Get fit score for job desc
- `POST /api/agent/spawn` - Register agent / mint Agent Credential (implementation name; not “spawn” in product copy)
- `GET /api/agent/list/:userId` - List user's agents
- `GET /api/agent/:agentId` - Lookup agent (public)

**Gemini prompts to refine:**

1. `evaluateWorker` - Answer questions about worker qualifications
2. `parseJobRequirements` - Extract structured requirements from JD
3. `generateContextualEvaluation` - Match worker to requirements

---

## API Reference

### Public Endpoints (no auth required)

```
GET  /api/trust/:veridexId     # Query user's trust score
GET  /api/agent/:agentId       # Lookup agent identity
GET  /api/reputation/:userId   # Get worker profile
GET  /api/review/:workerId     # Get reviews for worker
```

### Authenticated Endpoints (require Bearer token)

```
POST /api/auth/verify          # Verify World ID
POST /api/reputation/ingest    # Trigger GitHub ingestion
POST /api/stake                # Stake WLD on worker
POST /api/stake/withdraw       # Withdraw stake
POST /api/review               # Leave staked review
POST /api/contextual-score     # Get contextual fit score
POST /api/chat                 # AI chatbot message
POST /api/agent/spawn          # Register agent (Agent Credential)
GET  /api/agent/list/:userId   # List user's agents
GET  /api/stake/:userId        # Get user's stakes
```

---

## Database Tables

| Table               | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| `users`             | Core user data, WLD balance, roles                                              |
| `worker_profiles`   | GitHub data, skills, trust scores                                               |
| `reviews`           | Staked reviews with ratings                                                     |
| `stakes`            | WLD stakes on workers                                                           |
| `agents`            | Agent Credentials (identifiers, inheritance, domains, stake refs) tied to users |
| `contextual_scores` | Cached fit scores                                                               |
| `chat_sessions`     | Chat history                                                                    |
| `query_log`         | Profile view tracking                                                           |

---

## Git Workflow

1. Each person works on their assigned files
2. Create feature branches: `git checkout -b feature/your-feature`
3. Commit frequently with clear messages
4. Push and create PRs to main
5. Test locally before merging

---

## Questions?

Ping in the team chat or check the code comments marked with `// TODO`.

---

**Person 1 Handoff Note (Apr 4):**

Auth layer is fully implemented and live. World ID verification, JWT sessions, GitHub OAuth, and auth middleware are all wired end-to-end.

### What was built

**Session system:** Custom JWTs signed with `JWT_SECRET` (7-day expiry). Token is stored in `localStorage` as `veridex_token` and sent as `Authorization: Bearer <token>` on every authenticated request. The auth middleware now resolves to a real Supabase user UUID — no more `mock-user-id`.

**World ID:** Uses `@worldcoin/idkit` (IDKit v4) — works in any browser via QR code, no World App required. Backend signs an `rp_context` using `@worldcoin/idkit-server` which the frontend fetches before opening the widget. Proof is verified against `https://developer.world.org/api/v4/verify/{rp_id}`.

**React Auth Context:** Available via `useAuth()` from `@/contexts/AuthContext`. Provides `{ user, token, isLoading, login, logout, updateUser }`. Hydrates from localStorage on page load via `GET /api/auth/me` — refresh-safe.

**GitHub OAuth:** Full server-side flow. The user's JWT is encoded into the OAuth `state` param so the callback can associate the GitHub account to the right user. After callback, `worker_profiles.github_username` and `github_data` are populated.

### Files created

| File                                            | Purpose                                   |
| ----------------------------------------------- | ----------------------------------------- |
| `veridex/frontend/src/contexts/AuthContext.tsx` | React auth context + localStorage session |
| `veridex/frontend/src/components/Providers.tsx` | Client wrapper for `layout.tsx`           |

### Files modified

| File                                                      | What changed                                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `veridex/backend/src/middleware/auth.ts`                  | Real JWT verification (was hardcoded `mock-user-id`)                                                                 |
| `veridex/backend/src/routes/auth.ts`                      | JWT generation, `/me`, `/profile`, `/rp-context`, full GitHub OAuth callback                                         |
| `veridex/backend/.env.example`                            | Added `JWT_SECRET`, `WORLD_RP_ID`, `WORLD_ID_PRIVATE_KEY`, fixed `GITHUB_CALLBACK_URL` (was port 3000, must be 8000) |
| `veridex/frontend/src/components/WorldIDButton.tsx`       | Real IDKit widget (was mock) with dev-mode fallback                                                                  |
| `veridex/frontend/src/components/Navbar.tsx`              | Consumes `useAuth()` — shows real user + logout button                                                               |
| `veridex/frontend/src/components/GitHubConnectButton.tsx` | Real OAuth redirect with token                                                                                       |
| `veridex/frontend/src/app/verify/page.tsx`                | Wired to backend + Auth Context login + redirect logic                                                               |
| `veridex/frontend/src/app/onboarding/page.tsx`            | Auth guard, GitHub detection, profile save                                                                           |
| `veridex/frontend/src/app/layout.tsx`                     | Wrapped with `<Providers>`                                                                                           |
| `veridex/frontend/src/lib/api.ts`                         | Added `verifyWorldId`, `getMe`, `updateProfile`                                                                      |
| `veridex/frontend/src/lib/worldid.ts`                     | Cleaned up stubs, kept types + `isDevMode()`                                                                         |

### How to set up

**Backend `backend/.env`** — create this file (not committed):

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WORLD_APP_ID=app_8d1cc770a29beeb3298b2d1b8c8542d3
WORLD_RP_ID=rp_dd4522c570eaf65d
WORLD_ID_PRIVATE_KEY=0x27b2ac78b1a2d08fc423a88d7bcd1e515bcf5495517637a9741b1f31fc985a43
WORLD_ID_ACTION=verify-human
JWT_SECRET=veridex-hackathon-secret-2024
DEV_SKIP_WORLDID_VERIFY=false
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:8000/api/auth/github/callback
PORT=8000
FRONTEND_URL=http://localhost:3000
GEMINI_SCORING_API_KEY=...
GEMINI_CHATBOT_API_KEY=...
```

**Frontend `frontend/.env.local`** — create this file (not committed):

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_WORLD_APP_ID=app_8d1cc770a29beeb3298b2d1b8c8542d3
NEXT_PUBLIC_DEV_MOCK_WORLDID=false
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Set `NEXT_PUBLIC_DEV_MOCK_WORLDID=true` and `DEV_SKIP_WORLDID_VERIFY=true` to bypass World ID during local dev (no phone scan needed).

### How to use auth from other code (P2, P3, P4)

**Getting a token (for testing):**

```bash
curl -X POST http://localhost:8000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"merkle_root":"test","nullifier_hash":"test-user-1","proof":"test","verification_level":"orb"}'
# Returns: { success: true, user: {...}, isNewUser: true, token: "eyJ..." }
```

(Requires `DEV_SKIP_WORLDID_VERIFY=true` on backend)

**Making authenticated API calls (frontend):**

```typescript
import { useAuth } from "@/contexts/AuthContext";
const { user, token } = useAuth();
// token is the Bearer token — pass it to any api.ts function that takes a token param
```

**New API endpoints added:**

- `GET /api/auth/rp-context` — get signed World ID context (called by WorldIDButton internally)
- `GET /api/auth/me` — returns the current user (requires Bearer token)
- `PUT /api/auth/profile` — update `display_name`, `roles`, `profession_category` (requires Bearer token)

**Notes for P2:** After GitHub OAuth completes, `worker_profiles.github_username` is populated. You can then call `POST /api/reputation/ingest` for that user to pull their GitHub data.

**Notes for P3:** Use `useAuth()` hook for the current user everywhere. Call `updateProfile()` from `api.ts` to save onboarding data. Auth guards: check `if (!user && !isLoading) router.push('/verify')`.

## Team notes

Our API shouldn't be able to be invoked by anyone who isn't signed in with us (there is a cost involved)
