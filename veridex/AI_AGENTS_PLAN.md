# Person 4: AI + Agents — Implementation Plan

> Owner: Akhil (Person 4)
> Last updated: 2026-04-04

---

## Scope

Person 4 owns the AI/Agents vertical of Veridex:
- **Gemini AI integration** — chatbot evaluation, job description parsing, contextual fit scoring
- **Contextual scoring** — match workers to job requirements (met/partial/missing)
- **Agent Credentials** — registration (identifier → on-chain credential), verification API for counterparties, accountability (disputes / slashing), multi-agent hierarchy per human
- **Chat** — AI-powered Q&A about worker qualifications

### Product model (replace "agent spawning" in copy)

1. **Registration** — Human provides agent identifier (signing key, API endpoint, wallet, etc.); Veridex mints an Agent Credential linked to World ID + trust; human sets inheritance fraction, authorized domains, optional stake.
2. **Verification** — Third parties call the lookup API: legitimate or not, effective trust, domains, stake.
3. **Accountability loop** — Disputes against the credential can penalize human score and slash stake when validated.
4. **Hierarchy** — Dashboard lists multiple agents per human with different inheritance and stake.

The backend may still expose `POST /api/agent/spawn` and `spawnAgent()` as **implementation names**; treat them as registration in documentation and UI.

---

## Current State Summary

### Backend — Partially Complete (needs Agent Credential updates)

| File | Purpose | Status |
|------|---------|--------|
| `backend/src/services/gemini.ts` | Gemini API client (evaluateWorker, parseJobRequirements, generateContextualEvaluation) | Done |
| `backend/src/services/contextual.ts` | Hybrid algorithm + LLM contextual fit scoring | Done |
| `backend/src/services/agent.ts` | Agent CRUD — **still old simple model (name + hardcoded 0.7)** | Needs update for Credential model |
| `backend/src/routes/chat.ts` | POST /api/chat — session management, message persistence | Done |
| `backend/src/routes/contextual.ts` | POST /api/contextual-score — caching, optional auth | Done |
| `backend/src/routes/agent.ts` | Register, list, lookup agent endpoints — **still old simple model** | Needs update for Credential model |

### Database Schema — Needs Migration

Current `agents` table: `id, parent_user_id, name, derived_score, created_at`

**Missing columns for Credential model:**
- `identifier` — signing key, API endpoint, wallet address
- `identifier_type` — 'signing_key', 'api_endpoint', 'wallet', 'other'
- `inheritance_fraction` — configurable 0.0–1.0 (replaces hardcoded 0.7)
- `authorized_domains` — TEXT array e.g. ['defi', 'content', 'negotiation']
- `stake_amount` — WLD locked as collateral
- `status` — 'active', 'suspended', 'revoked'
- `dispute_count` — number of disputes filed

### Frontend — Presentation Components COMPLETE (need Credential updates)

| Component | Purpose | Status |
|-----------|---------|--------|
| `ContextualScoreCard.tsx` | Displays fit score with met/partial/missing breakdown | Done |
| `AgentCard.tsx` | Displays agent — **needs update for new credential fields** | Needs update |
| `JobDescriptionInput.tsx` | Textarea + submit for job descriptions | Done |
| `ChatPanel.tsx` | Chat UI with message bubbles, input, loading states | UI done, API stubbed |
| `api.ts` | All API wrapper functions — **spawnAgent needs new params** | Needs update |
| `types/index.ts` | TypeScript interfaces — **Agent needs new fields** | Needs update |

### Frontend — Pages Need API Wiring

| Page | Components Used | What's Stubbed |
|------|----------------|----------------|
| `/profile/[id]` | ChatPanel | Chat responses are placeholder |
| `/dashboard` | JobDescriptionInput, ContextualScoreCard | `handleEvaluateFit` uses placeholder data |
| `/agents` | AgentCard | Agent list is hardcoded, registration form needs credential fields |
| `/browse` | JobDescriptionInput, WorkerCard | `handleEvaluateAll` uses placeholder data |

---

## Auth Integration (from Person 1)

Person 1 has delivered a complete auth system:
- **`frontend/src/contexts/AuthContext.tsx`** — `useAuth()` hook returning `{ user, token, isLoading, login, logout }`
- **`backend/src/middleware/auth.ts`** — Real JWT verification with `jsonwebtoken`
- **`backend/src/routes/auth.ts`** — World ID verification (IDKit v4), GitHub OAuth, profile updates
- Token stored in localStorage, hydrated on mount via `GET /api/auth/me`
- All app pages wrapped in `<AuthProvider>` via `Providers.tsx` in `layout.tsx`

**Impact:** We use `useAuth()` directly from `@/contexts/AuthContext` — no stub needed.

---

## Implementation Phases

### Phase 1: Database Schema Migration
**File:** `supabase/schema.sql` (run in Supabase SQL Editor)

Add new columns to `agents` table for the Credential model:
```sql
ALTER TABLE agents ADD COLUMN identifier TEXT;
ALTER TABLE agents ADD COLUMN identifier_type TEXT DEFAULT 'other';
ALTER TABLE agents ADD COLUMN inheritance_fraction NUMERIC(3,2) DEFAULT 0.70;
ALTER TABLE agents ADD COLUMN authorized_domains TEXT[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN stake_amount INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE agents ADD COLUMN dispute_count INTEGER DEFAULT 0;
```

**Dependencies:** None — first step, everything else builds on this.

---

### Phase 2: Backend Agent Credential Updates

**File:** `backend/src/services/agent.ts`
1. Update `Agent` interface with new fields (identifier, identifier_type, inheritance_fraction, authorized_domains, stake_amount, status, dispute_count)
2. Update `spawnAgent()` to accept registration params; use `inheritance_fraction` instead of hardcoded 0.7
3. Deduct `stake_amount` from user's `wld_balance` if > 0
4. Update `lookupAgent()` response to include all credential fields (verification API)
5. Update `AgentWithParent` interface

**File:** `backend/src/routes/agent.ts`
1. Update `POST /api/agent/spawn` to accept new fields: `identifier`, `identifier_type`, `inheritance_fraction`, `authorized_domains`, `stake_amount`
2. Add validation: inheritance_fraction 0–1, stake doesn't exceed balance
3. Update `GET /api/agent/:agentId` response to be a proper verification response (is_verified, effective_trust, domains, stake)

**Dependencies:** Phase 1 (schema migration)

---

### Phase 3: Frontend Type + API Updates

**File:** `frontend/src/types/index.ts`
- Update `Agent` interface with new credential fields

**File:** `frontend/src/lib/api.ts`
- Update `spawnAgent()` to accept `{ name, identifier, identifier_type, inheritance_fraction, authorized_domains, stake_amount }`

**Dependencies:** Phase 2 (backend must accept new fields)

---

### Phase 4: ChatPanel API Wiring

**File:** `frontend/src/components/ChatPanel.tsx`
1. Import `sendChatMessage` from `@/lib/api` and `useAuth` from `@/contexts/AuthContext`
2. Replace placeholder (lines 54-66) with real API call
3. Persist `session_id` for multi-turn conversations

**Used on:** `/profile/[id]` page (toggle "Ask About This Worker")

**Dependencies:** None (backend chat route + Gemini service are complete)

---

### Phase 5: Dashboard Contextual Scoring

**File:** `frontend/src/app/dashboard/page.tsx`
1. Import `getContextualScore` from `@/lib/api` and `useAuth`
2. Replace placeholder in `handleEvaluateFit` (lines 67-86) with real API call
3. Map response `{ fit_score, breakdown }` to `setContextualScore()`

**Used on:** `/dashboard` page

**Dependencies:** None (contextual score route + service are complete)

---

### Phase 6: Agents Page — Credential Registration UI

**File:** `frontend/src/app/agents/page.tsx`
1. Import `listAgents`, `spawnAgent` from `@/lib/api` and `useAuth`
2. Replace hardcoded agent list with `listAgents(user.id, token)` on mount
3. Redesign registration form with fields:
   - Agent name (existing)
   - Identifier (text input — signing key, API endpoint, wallet)
   - Identifier type (dropdown: signing_key, api_endpoint, wallet, other)
   - Inheritance fraction (slider 0%–100%, default 70%)
   - Authorized domains (multi-select or tag input: defi, content, negotiation, etc.)
   - Stake amount (number input with balance check)
4. Wire form to `spawnAgent()` with all credential fields
5. Refetch agent list after successful registration

**File:** `frontend/src/components/AgentCard.tsx`
- Display: identifier (truncated), identifier type, inheritance %, domains as tags, stake amount, status badge

**Used on:** `/agents` page

**Dependencies:** Phases 1-3 (schema + backend + types)

---

### Phase 7: Browse Page Batch Scoring

**File:** `frontend/src/app/browse/page.tsx`
1. Import `getContextualScore` from `@/lib/api` and `useAuth`
2. Replace placeholder in `handleEvaluateAll` with `Promise.allSettled` batch calls
3. Update each worker's `contextualFitScore` with returned `fit_score`

**Used on:** `/browse` page

**Dependencies:** None (contextual score route is complete)

---

### Phase 8: Gemini Prompt Refinement

**File:** `backend/src/services/gemini.ts`

**A. `evaluateWorker` prompt:**
- Add markdown formatting guidance for chat readability
- Handle missing data explicitly ("No verified data available")
- Add trust score interpretation (80+ = highly trusted, etc.)
- Reference stake amounts when discussing review credibility

**B. `parseJobRequirements` prompt:**
- Add edge case handling (informal JDs, short descriptions)
- Normalize technology names (React.js/ReactJS → React)

**C. `generateContextualEvaluation` prompt:**
- Broaden beyond "soft skills" to all requirement types
- Be conservative: only "met" with strong evidence
- Provide actionable gap descriptions for "partial" matches

---

### Phase 9: Design System Alignment

**Files:** All frontend files modified in prior phases

Align UI with DESIGN.md (light glass morphism):
- ChatPanel: dark bubble colors (`bg-worldcoin-gray-700`) → glass morphism styling
- Agents page: dark card classes → light glass cards with frosted blur
- Use shared tokens from `@/lib/styles` instead of hardcoded colors
- Verify typography (Fraunces for headings, Inter for UI)

---

## Dependencies on Other Team Members

| What We Need | Owner | Status | Impact |
|--------------|-------|--------|--------|
| Auth system (JWT, useAuth hook) | Person 1 | DONE | We use `useAuth()` directly |
| Backend scoring engine | Person 2 | DONE | Contextual scoring reads `computed_skills` from profiles |
| Real worker data in DB (not placeholders) | Person 2/3 | In progress | Our API calls work; placeholder data in useEffects is Person 3's to replace |
| Page layouts and base data fetching | Person 3 | In progress | Our changes are additive (replacing TODO blocks), minimal conflict risk |

---

## API Endpoints (Person 4 Owns)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat` | Required | Send message, get AI response |
| POST | `/api/contextual-score` | Optional | Get fit score for job description |
| POST | `/api/agent/spawn` | Required | Register agent / mint Agent Credential |
| GET | `/api/agent/list/:userId` | Required | List user's agent credentials |
| GET | `/api/agent/:agentId` | Public | Verify agent credential (counterparty API) |

---

## Key Files Reference

| File | Role |
|------|------|
| `frontend/src/contexts/AuthContext.tsx` | Auth hook — `useAuth()` |
| `frontend/src/lib/api.ts` | All API wrapper functions |
| `frontend/src/types/index.ts` | TypeScript interfaces |
| `frontend/src/lib/styles.ts` | Design system tokens |
| `frontend/src/app/globals.css` | CSS classes (.card, .btn-primary, .input, animations) |
| `DESIGN.md` | Design language specification |
| `TEAM.md` | Full project structure and team assignments |

---

## TODO Tracker

### Phase 1: Database Schema Migration
- [x] Write ALTER TABLE SQL for new agent columns (`supabase/migrate_agent_credentials.sql`)
- [x] Update schema.sql with new agents table definition
- [ ] Run migration in Supabase SQL Editor (manual step)

### Phase 2: Backend Agent Credential Updates
- [x] Update Agent interface in agent.ts service (identifier, identifier_type, inheritance_fraction, authorized_domains, stake_amount, status, dispute_count)
- [x] Update spawnAgent() → registerAgent() to accept credential registration params
- [x] Use configurable inheritance_fraction (not hardcoded 0.7)
- [x] Add stake deduction from user's wld_balance
- [x] Update lookupAgent() response with all credential fields
- [x] Update POST /api/agent/spawn route validation (fraction range, stake check)
- [x] Update GET /api/agent/:agentId for verification response (is_verified, effective_trust, domains, stake)
- [ ] Test registration + lookup via curl (needs running server)

### Phase 3: Frontend Type + API Updates
- [x] Update Agent interface in types/index.ts (+ RegisterAgentParams)
- [x] Update spawnAgent() in api.ts with new params object

### Phase 4: ChatPanel API Wiring
- [x] Import sendChatMessage and useAuth into ChatPanel.tsx
- [x] Replace placeholder response with real API call
- [x] Persist session_id across messages
- [ ] Test end-to-end chat on profile page (needs running servers)

### Phase 5: Dashboard Contextual Score
- [x] Import getContextualScore and useAuth into dashboard/page.tsx
- [x] Replace placeholder in handleEvaluateFit with real API call
- [ ] Test with real job description input (needs running servers)

### Phase 6: Agents Page — Credential Registration UI
- [x] Import listAgents, spawnAgent, and useAuth into agents/page.tsx
- [x] Replace hardcoded agent list with real API fetch
- [x] Build credential registration form (name, identifier, type, inheritance slider, domains picker, stake)
- [x] Wire form to real API call
- [x] Refetch agent list after successful registration
- [x] Update AgentCard to display credential fields (identifier, domains, stake, status, inheritance %)
- [ ] Test full registration + display flow (needs running servers)

### Phase 7: Browse Page Batch Scoring
- [x] Import getContextualScore and useAuth into browse/page.tsx
- [x] Replace placeholder in handleEvaluateAll with Promise.allSettled batch calls
- [x] Update worker cards with contextual fit scores
- [ ] Test batch evaluation with job description (needs running servers)

### Phase 8: Gemini Prompt Refinement
- [x] Improve evaluateWorker prompt (markdown formatting, missing data handling, score interpretation, stake-weighted review credibility)
- [x] Improve parseJobRequirements prompt (edge cases, tech name normalization, informal JDs, non-technical roles)
- [x] Improve generateContextualEvaluation prompt (all requirement types, conservative scoring, actionable gaps, no hallucinated evidence)
- [ ] Test with 3-5 diverse job descriptions (needs running servers + Gemini API key)

### Phase 9: Design System Alignment
- [x] Update ChatPanel colors to light glass morphism (frosted glass bubbles, blue gradient user messages)
- [x] Update Agents page to light glass styling (glass cards, section labels, Fraunces headings)
- [x] Update AgentCard to light glass styling
- [x] Verify typography alignment with DESIGN.md (Fraunces for headings, Inter for UI)

### Automated Test Suite (validates all features without running servers)
- [x] Set up Jest + ts-jest + supertest with mock infrastructure
- [x] Created Supabase mock (chainable query builder, per-table/per-operation responses)
- [x] Created Gemini mock (deterministic AI responses)
- [x] Created shared test fixtures (users, workers, agents, reviews, chat sessions, JWT tokens)
- [x] Agent service tests — 13 tests (register, lookup, score update, listing, stake, validation)
- [x] Contextual scoring service tests — 8 tests (hard skill matching, fit score formula, LLM eval, partial matches)
- [x] Agent route tests — 11 tests (spawn, list, lookup, validation, auth)
- [x] Chat route tests — 6 tests (session create, session reuse, validation, auth, 404)
- [x] Contextual score route tests — 7 tests (computation, optional auth, validation, 404, skill matching)
- [x] **All 48 tests passing** ✅ (run: `cd veridex/backend && npx jest --forceExit`)

### Remaining (needs running environment)
- [ ] Run `supabase/migrate_agent_credentials.sql` in Supabase SQL Editor
- [ ] Start backend + frontend servers and test all wired endpoints
- [ ] Verify chat session persistence on profile page
- [ ] Verify contextual scoring on dashboard
- [ ] Verify agent credential registration + display
- [ ] Verify browse batch scoring
