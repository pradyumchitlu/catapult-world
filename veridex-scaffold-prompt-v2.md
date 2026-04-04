# Veridex — Claude Code Scaffolding Prompt

Scaffold a full monorepo for a hackathon project called **Veridex** — a decentralized trust platform where verified humans build portable reputation, stake WLD on each other's integrity, and register **Agent Credentials** that bind AI agents to verified human identity, trust inheritance, authorized domains, and optional stake. Powered by World ID proof-of-personhood.

## Project Overview

Veridex solves three problems: identity is fake (bots and sybils poison every platform), reputation is trapped (you rebuild credibility from zero on every new service), and AI agents are unaccountable (no one knows who's behind the bot).

Three user types:
- **Workers** — verify with World ID, connect GitHub (and optionally other platforms), get a trust profile built automatically. Can be any profession — software engineer, technical writer, gardener, designer.
- **Stakers** — browse worker profiles, stake WLD credits on workers they believe in, earn/lose based on worker performance.
- **Clients** — browse workers, evaluate them via an AI chatbot that answers questions grounded in the worker's real data, leave staked reviews after working with someone.

**Staking note:** The UI displays staking in WLD (Worldcoin) and references World Chain throughout. For the hackathon, staking logic runs server-side in Supabase (credit system). Full on-chain integration with World Chain smart contracts is the stated roadmap item. Every verified user starts with 1000 WLD credits.

## Monorepo Structure

```
veridex/
├── README.md
├── .gitignore
├── .env.example
│
├── frontend/             # Next.js 14+ App Router, TypeScript, Tailwind CSS
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.local.example
│   ├── public/
│   │   └── (placeholder logo)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx                    # root layout with Navbar, global providers
│       │   ├── page.tsx                      # landing page
│       │   ├── verify/
│       │   │   └── page.tsx                  # World ID verification flow
│       │   ├── onboarding/
│       │   │   └── page.tsx                  # connect GitHub, optionally add LinkedIn/other,
│       │   │                                 # select role(s), choose profession category
│       │   │                                 # platform connections are OPTIONAL — a gardener
│       │   │                                 # can skip GitHub and build rep via reviews only
│       │   ├── dashboard/
│       │   │   └── page.tsx                  # worker dashboard:
│       │   │                                 #   - overall trust score with component breakdown
│       │   │                                 #   - WLD staked on you (total + by whom)
│       │   │                                 #   - recent reviews received
│       │   │                                 #   - query log (who viewed your profile)
│       │   │                                 #   - "evaluate my fit" section: paste a job description,
│       │   │                                 #     get your contextual fit score + gap analysis
│       │   ├── browse/
│       │   │   └── page.tsx                  # browse workers marketplace (for stakers + clients)
│       │   │                                 #   - searchable/filterable grid of verified workers
│       │   │                                 #   - filter by: skills, score range, profession category,
│       │   │                                 #     review count, average rating
│       │   │                                 #   - optional: "Evaluate for a role" input at top —
│       │   │                                 #     paste job description, worker cards show contextual
│       │   │                                 #     fit scores alongside overall trust score
│       │   │                                 #   - stakers see "Stake" button, clients see "View Profile"
│       │   ├── profile/
│       │   │   └── [id]/
│       │   │       └── page.tsx              # worker public profile:
│       │   │                                 #   - trust score + component breakdown (radar/bar chart)
│       │   │                                 #   - GitHub highlights (if connected): top repos, languages,
│       │   │                                 #     contribution graph summary
│       │   │                                 #   - reviews section: each review shows reviewer name,
│       │   │                                 #     reviewer trust score, star rating, feedback text,
│       │   │                                 #     WLD staked on review, timestamp
│       │   │                                 #     sorted by stake amount (most skin in game first)
│       │   │                                 #   - staking info: total WLD staked, number of stakers
│       │   │                                 #   - AI chatbot panel: client types requirements/questions,
│       │   │                                 #     gets contextual fit score + evidence-based evaluation
│       │   │                                 #   - "Leave Review" button (for clients who worked with them)
│       │   │                                 #   - "Stake" button (for stakers)
│       │   ├── staker/
│       │   │   └── page.tsx                  # staker portfolio dashboard:
│       │   │                                 #   - WLD balance
│       │   │                                 #   - active stakes: worker name, amount staked, worker's
│       │   │                                 #     current score trend (up/down), yield earned
│       │   │                                 #   - total returns
│       │   ├── review/
│       │   │   └── [workerId]/
│       │   │       └── page.tsx              # leave a review page:
│       │   │                                 #   - star rating (1-5)
│       │   │                                 #   - written feedback
│       │   │                                 #   - job category selector (software, writing, gardening, etc.)
│       │   │                                 #   - WLD stake amount slider — "back your review with WLD"
│       │   │                                 #   - explanation: "staking WLD on your review proves you
│       │   │                                 #     stand behind it. Higher stakes = more impact on their score."
│       │   ├── agents/
│       │   │   └── page.tsx                  # agent management (register Agent Credentials, view hierarchy)
│       │   └── query-demo/
│       │       └── page.tsx                  # external query API demo page
│       ├── components/
│       │   ├── Navbar.tsx                    # top nav: logo, nav links (conditional on role),
│       │   │                                 # user display name, WLD balance badge
│       │   ├── WorldIDButton.tsx             # World ID verify button using MiniKit
│       │   ├── GitHubConnectButton.tsx       # GitHub OAuth trigger
│       │   ├── TrustScoreCard.tsx            # large trust score display with number + ring/gauge
│       │   ├── ScoreBreakdown.tsx            # radar chart or bar chart of score components
│       │   ├── ContextualScoreCard.tsx       # contextual fit score display with met/partial/missing breakdown
│       │   ├── WorkerCard.tsx                # card for browse grid: name, score, skills, profession,
│       │   │                                 # review count, avg rating, total WLD staked
│       │   ├── StakeButton.tsx               # stake WLD on a worker — amount input + confirm
│       │   ├── StakePortfolio.tsx            # staker's list of active stakes with yield info
│       │   ├── ReviewCard.tsx                # single review display: rating, feedback, reviewer info,
│       │   │                                 # reviewer trust score, WLD staked on review
│       │   ├── ReviewForm.tsx                # leave review form: stars, text, category, stake slider
│       │   ├── ReviewsList.tsx               # list of reviews on a worker profile, sorted by stake
│       │   ├── AgentCard.tsx                 # agent with derived score + parent link
│       │   ├── ChatPanel.tsx                 # AI chatbot UI for worker evaluation
│       │   │                                 # first message: "Describe what you're looking for"
│       │   │                                 # first response: contextual fit score + breakdown
│       │   │                                 # then conversational follow-ups
│       │   ├── JobDescriptionInput.tsx       # text area for pasting job description / requirements
│       │   ├── QueryLog.tsx                  # table of who queried your profile
│       │   └── LoadingSpinner.tsx            # shared loading state
│       ├── lib/
│       │   ├── supabase.ts                   # Supabase browser client init
│       │   ├── api.ts                        # fetch wrappers for backend API calls
│       │   └── worldid.ts                    # World MiniKit helpers
│       └── types/
│           └── index.ts                      # shared TypeScript types (see Types section below)
│
├── backend/              # Express + TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts                          # Express app entry, CORS, middleware, route mounting
│       ├── routes/
│       │   ├── auth.ts                       # POST /api/auth/verify — World ID verification
│       │   ├── reputation.ts                 # POST /api/reputation/ingest — trigger GitHub ingestion + scoring
│       │   │                                 # GET /api/reputation/:userId — get computed profile
│       │   ├── query.ts                      # GET /api/trust/:veridexId — external trust query API
│       │   │                                 # GET /api/agent/:agentId — agent lookup API
│       │   ├── stake.ts                      # POST /api/stake — stake WLD on a worker
│       │   │                                 # GET /api/stake/:userId — get stakes for a user
│       │   │                                 # POST /api/stake/withdraw — withdraw stake
│       │   ├── review.ts                     # POST /api/review — leave a staked review
│       │   │                                 #   accepts { worker_id, rating, content, job_category, stake_amount }
│       │   │                                 #   deducts WLD from reviewer, creates review,
│       │   │                                 #   triggers score recomputation for worker
│       │   │                                 # GET /api/review/:workerId — get reviews for a worker
│       │   ├── contextual.ts                 # POST /api/contextual-score — generate contextual fit score
│       │   │                                 #   accepts { worker_id, job_description }
│       │   │                                 #   parses requirements, matches against worker profile,
│       │   │                                 #   calls Gemini API for nuanced evaluation,
│       │   │                                 #   returns { fit_score, breakdown: { met, partial, missing } }
│       │   ├── agent.ts                      # POST /api/agent/spawn — register agent / Agent Credential (identifier, inheritance, domains, stake)
│       │   │                                 # GET /api/agent/list/:userId — list user's agents
│       │   └── chat.ts                       # POST /api/chat — AI chatbot endpoint
│       │                                     #   accepts { worker_id, message, session_id }
│       │                                     #   loads worker profile + reviews from Supabase as context
│       │                                     #   calls Gemini API with worker data + client question
│       │                                     #   returns AI response with evidence citations
│       ├── services/
│       │   ├── github.ts                     # GitHub API client
│       │   │                                 #   - fetchUserProfile(username): repos, stars, languages
│       │   │                                 #   - fetchContributionHistory(username): commit frequency, recency
│       │   │                                 #   - fetchCollaborationSignals(username): PRs, issues on other repos
│       │   │                                 #   - Quality-over-quantity focus: weight signals that are hard
│       │   │                                 #     to fake (PRs merged into external repos, commit consistency
│       │   │                                 #     over 6+ months, meaningful code contributions)
│       │   ├── scoring.ts                    # Trust score computation
│       │   │                                 #   - computeOverallScore(profileData, reviews): { overall, components }
│       │   │                                 #   - Score components (each 0-100):
│       │   │                                 #     * developer_competence (from GitHub, if connected)
│       │   │                                 #     * collaboration (from GitHub PRs + review sentiment)
│       │   │                                 #     * consistency (from commit history + review frequency)
│       │   │                                 #     * specialization_depth (from repo topics + review categories)
│       │   │                                 #     * activity_recency (from recent commits + recent reviews)
│       │   │                                 #     * peer_trust (from staked reviews, weighted by reviewer credibility)
│       │   │                                 #   - Overall = weighted average, weights adjust based on which
│       │   │                                 #     data sources are available (GitHub-heavy for devs,
│       │   │                                 #     review-heavy for non-tech workers)
│       │   │                                 #
│       │   │                                 #   INTEGRITY MECHANISMS:
│       │   │                                 #   - Trust-weighted reviews: review impact = f(reviewer_trust_score, stake_amount)
│       │   │                                 #     Low-trust reviewers with small stakes barely move the needle.
│       │   │                                 #   - Mutual review detection: if A reviewed B and B reviewed A,
│       │   │                                 #     both reviews get downweighted (flag reciprocal reviewing)
│       │   │                                 #   - Stake concentration penalty: diminishing returns when >50%
│       │   │                                 #     of a worker's total stake comes from a single staker.
│       │   │                                 #     First 100 WLD from one staker = full weight.
│       │   │                                 #     Next 100 = 50% weight. Next 100 = 25% weight.
│       │   │
│       │   ├── contextual.ts                 # Contextual fit scoring
│       │   │                                 #   - computeContextualScore(workerProfile, jobDescription):
│       │   │                                 #     { fit_score: number, breakdown: { met, partial, missing } }
│       │   │                                 #   - Step 1: Parse job description into structured requirements
│       │   │                                 #     (skills, experience level, domain) via Gemini API
│       │   │                                 #   - Step 2: Algorithmic matching for hard skills
│       │   │                                 #     (languages, frameworks from GitHub + review categories)
│       │   │                                 #   - Step 3: LLM evaluation for subjective fit
│       │   │                                 #     (project relevance, depth of experience)
│       │   │                                 #   - Returns evidence: "Worker has 8 React repos spanning
│       │   │                                 #     2 years" vs "1 React repo with 3 commits — minimal"
│       │   │
│       │   ├── agent.ts                      # Agent Credential logic
│       │   │                                 #   - registerAgent (e.g. spawnAgent in code): mint credential, derived effective trust from parent × inheritance
│       │   │                                 #   - lookupAgent(agentId): verification payload for counterparties (human link, trust, domains, stake)
│       │   │
│       │   └── gemini.ts                     # Gemini API client
│       │                                     #   - evaluateWorker(workerProfile, reviews, clientQuestion): string
│       │   │                                 #     System prompt: "You are a trust evaluation assistant for Veridex.
│       │   │                                 #     You have access to a worker's verified data including GitHub activity,
│       │   │                                 #     peer reviews (with stake amounts), and trust scores. Answer the
│       │   │                                 #     client's question about the worker's qualifications. Be specific —
│       │   │                                 #     cite actual repos, skills, review quotes, and stats. If the data
│       │   │                                 #     doesn't support a claim, say so honestly. Consider review stake
│       │   │                                 #     amounts as a signal of review credibility."
│       │   │                                 #   - parseJobRequirements(jobDescription): structured requirements object
│       │                                     #   - generateContextualEvaluation(workerProfile, requirements): fit score + breakdown
│       ├── middleware/
│       │   └── auth.ts                       # middleware to verify user session from Supabase JWT
│       └── lib/
│           └── supabase.ts                   # Supabase server client init (service role key)
│
└── supabase/
    └── schema.sql                            # Full database schema
```

## Database Schema (supabase/schema.sql)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id_hash TEXT UNIQUE NOT NULL,
  display_name TEXT,
  roles TEXT[] DEFAULT '{}',            -- array of: 'worker', 'staker', 'client'
  profession_category TEXT,             -- 'software', 'writing', 'design', 'trades', 'other'
  wld_balance INTEGER DEFAULT 1000,     -- starting WLD credits
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Worker profiles
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  github_username TEXT,
  github_data JSONB DEFAULT '{}',
  linkedin_data JSONB DEFAULT '{}',
  other_platforms JSONB DEFAULT '{}',
  computed_skills TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  overall_trust_score INTEGER DEFAULT 0,
  score_components JSONB DEFAULT '{}',
  -- score_components shape: {
  --   developer_competence: number,    (0 if no GitHub connected)
  --   collaboration: number,
  --   consistency: number,
  --   specialization_depth: number,
  --   activity_recency: number,
  --   peer_trust: number               (from staked reviews)
  -- }
  ingestion_status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews (staked)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  job_category TEXT,                    -- 'software', 'gardening', 'writing', 'design', etc.
  stake_amount INTEGER NOT NULL DEFAULT 0,  -- WLD staked on this review
  reviewer_trust_score_at_time INTEGER, -- snapshot of reviewer's score when review was left
  is_flagged BOOLEAN DEFAULT false,     -- flagged by integrity checks
  flag_reason TEXT,                     -- e.g. 'mutual_review_detected'
  status TEXT DEFAULT 'active',         -- active, flagged, slashed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stakes
CREATE TABLE stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'active',         -- active, withdrawn
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contextual scores (cached)
CREATE TABLE contextual_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES users(id),
  job_description TEXT NOT NULL,
  parsed_requirements JSONB DEFAULT '{}',
  fit_score INTEGER,
  score_breakdown JSONB DEFAULT '{}',
  -- breakdown shape: {
  --   met: [{ requirement: string, evidence: string }],
  --   partial: [{ requirement: string, evidence: string, gap: string }],
  --   missing: [{ requirement: string }]
  -- }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Credentials (one row per registered agent)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  derived_score INTEGER DEFAULT 0,      -- effective trust ≈ inheritance_fraction × parent overall_trust_score (demo may use 0.7)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Query log
CREATE TABLE query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  querier_id UUID REFERENCES users(id),
  querier_info TEXT,
  query_type TEXT DEFAULT 'profile_view',  -- profile_view, api_query, chat_query, contextual_score
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  -- messages shape: [{ role: 'user' | 'assistant', content: string, timestamp: string }]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX idx_worker_profiles_trust_score ON worker_profiles(overall_trust_score DESC);
CREATE INDEX idx_reviews_worker_id ON reviews(worker_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_stakes_staker_id ON stakes(staker_id);
CREATE INDEX idx_stakes_worker_id ON stakes(worker_id);
CREATE INDEX idx_contextual_scores_worker_id ON contextual_scores(worker_id);
CREATE INDEX idx_agents_parent_user_id ON agents(parent_user_id);
CREATE INDEX idx_query_log_worker_id ON query_log(worker_id);
CREATE INDEX idx_chat_sessions_client_id ON chat_sessions(client_id);
```

## TypeScript Types (frontend/src/types/index.ts)

```typescript
export interface User {
  id: string;
  world_id_hash: string;
  display_name: string | null;
  roles: ('worker' | 'staker' | 'client')[];
  profession_category: string | null;
  wld_balance: number;
  created_at: string;
  updated_at: string;
}

export interface ScoreComponents {
  developer_competence: number;
  collaboration: number;
  consistency: number;
  specialization_depth: number;
  activity_recency: number;
  peer_trust: number;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  github_username: string | null;
  github_data: Record<string, any>;
  linkedin_data: Record<string, any>;
  other_platforms: Record<string, any>;
  computed_skills: string[];
  specializations: string[];
  years_experience: number | null;
  overall_trust_score: number;
  score_components: ScoreComponents;
  ingestion_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  worker_id: string;
  rating: number;
  content: string | null;
  job_category: string | null;
  stake_amount: number;
  reviewer_trust_score_at_time: number | null;
  is_flagged: boolean;
  flag_reason: string | null;
  status: 'active' | 'flagged' | 'slashed';
  created_at: string;
  // joined fields
  reviewer?: User;
}

export interface Stake {
  id: string;
  staker_id: string;
  worker_id: string;
  amount: number;
  status: 'active' | 'withdrawn';
  created_at: string;
  // joined fields
  staker?: User;
  worker?: User & { worker_profile?: WorkerProfile };
}

export interface ContextualScoreBreakdown {
  met: { requirement: string; evidence: string }[];
  partial: { requirement: string; evidence: string; gap: string }[];
  missing: { requirement: string }[];
}

export interface ContextualScore {
  id: string;
  worker_id: string;
  requester_id: string | null;
  job_description: string;
  parsed_requirements: Record<string, any>;
  fit_score: number;
  score_breakdown: ContextualScoreBreakdown;
  created_at: string;
}

export interface Agent {
  id: string;
  parent_user_id: string;
  name: string;
  derived_score: number;
  created_at: string;
  // joined fields
  parent?: User & { worker_profile?: WorkerProfile };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  client_id: string;
  worker_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}
```

## Environment Variables (.env.example)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# World ID
NEXT_PUBLIC_WORLD_APP_ID=your_world_app_id
WORLD_ID_ACTION=verify-human

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# Gemini (for AI chatbot + contextual scoring)
GEMINI_API_KEY=your_gemini_api_key

# Backend
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

## Implementation Notes

### Frontend
- Use Next.js 14+ with App Router and TypeScript
- Tailwind CSS for styling — clean, modern design with a dark theme
- Use `@supabase/supabase-js` for the browser client
- For charts/visualizations, use recharts (radar chart for score breakdown)
- All pages should have loading states and error handling
- Navbar shows: Veridex logo, nav links (conditional on role), user display name, WLD balance badge
- All monetary values displayed as "WLD" (e.g., "250 WLD staked")
- Use Worldcoin branding colors/styling where appropriate for WLD badges

### Backend
- Express with TypeScript, use ts-node-dev for development
- CORS configured to allow frontend origin
- All routes prefixed with `/api`
- Use `@supabase/supabase-js` with service role key for server-side operations
- The chat and contextual scoring endpoints call the Gemini API using `@google/generative-ai` with a Gemini model (e.g. `gemini-2.0-flash`)
- GitHub service should use the GitHub REST API with `octokit`
- Scoring service must implement the three integrity mechanisms:
  1. Trust-weighted reviews (impact scales with reviewer score + stake)
  2. Mutual review detection (flag and downweight reciprocal reviews)
  3. Stake concentration penalty (diminishing returns from single staker)

### Scaffolding Requirements
1. Initialize both `frontend/` and `backend/` with their respective `package.json` files
2. Install all dependencies
3. Set up TypeScript configs for both
4. Create all files listed in the structure above with:
   - Proper imports and exports
   - Stub implementations with TODO comments marking where logic needs to be filled in
   - Type definitions in `frontend/src/types/index.ts` as specified above
   - Basic Express server that starts and mounts all route files
   - Basic Next.js pages with placeholder UI and layout structure
5. The `supabase/schema.sql` file should be complete and ready to paste
6. Frontend components should have basic JSX structure with Tailwind classes
7. Backend route files should have route handlers defined with request/response types and TODO bodies
8. Backend service files should have function signatures with parameter and return types defined

### Key Dependencies

**Frontend:**
```
next, react, react-dom, typescript, tailwindcss, postcss, autoprefixer,
@supabase/supabase-js, recharts, @types/react, @types/node
```

**Backend:**
```
express, cors, typescript, ts-node-dev, @supabase/supabase-js,
@google/generative-ai, octokit, uuid, dotenv,
@types/express, @types/cors, @types/uuid
```

## Team Assignment Map

After scaffolding, each teammate works in isolated directories:

- **Person 1 (World ID + Auth):** `frontend/src/app/verify/`, `frontend/src/components/WorldIDButton.tsx`, `backend/src/routes/auth.ts`
- **Person 2 (Backend + Scoring):** `backend/src/services/github.ts`, `backend/src/services/scoring.ts`, `backend/src/routes/reputation.ts`, `backend/src/routes/review.ts`, `backend/src/routes/stake.ts`
- **Person 3 (Frontend):** `frontend/src/app/` (all pages), `frontend/src/components/` (all UI components)
- **Person 4 (AI + Agents):** `backend/src/services/gemini.ts`, `backend/src/services/contextual.ts`, `backend/src/routes/chat.ts`, `backend/src/routes/contextual.ts`, `backend/src/routes/agent.ts`, `frontend/src/app/agents/`
