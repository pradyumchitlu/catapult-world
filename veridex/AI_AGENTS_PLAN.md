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

### Product model (replace “agent spawning” in copy)

1. **Registration** — Human provides agent identifier (signing key, API endpoint, wallet, etc.); Veridex mints an Agent Credential linked to World ID + trust; human sets inheritance fraction, authorized domains, optional stake.
2. **Verification** — Third parties call the lookup API: legitimate or not, effective trust, domains, stake.
3. **Accountability loop** — Disputes against the credential can penalize human score and slash stake when validated.
4. **Hierarchy** — Dashboard lists multiple agents per human with different inheritance and stake.

The backend may still expose `POST /api/agent/spawn` and `spawnAgent()` as **implementation names**; treat them as registration in documentation and UI.

---

## Current State Summary

### Backend — COMPLETE
All services and routes are fully implemented with no TODOs:

| File | Purpose | Status |
|------|---------|--------|
| `backend/src/services/gemini.ts` | Gemini API client (evaluateWorker, parseJobRequirements, generateContextualEvaluation) | Done |
| `backend/src/services/contextual.ts` | Hybrid algorithm + LLM contextual fit scoring | Done |
| `backend/src/services/agent.ts` | Agent Credential CRUD (register, lookup, update scores, list) | Done |
| `backend/src/routes/chat.ts` | POST /api/chat — session management, message persistence | Done |
| `backend/src/routes/contextual.ts` | POST /api/contextual-score — caching, optional auth | Done |
| `backend/src/routes/agent.ts` | Register, list, lookup agent endpoints | Done |

### Frontend — Presentation Components COMPLETE
All display components are built and working:

| Component | Purpose | Status |
|-----------|---------|--------|
| `ContextualScoreCard.tsx` | Displays fit score with met/partial/missing breakdown | Done |
| `AgentCard.tsx` | Displays agent with derived score and parent info | Done |
| `JobDescriptionInput.tsx` | Textarea + submit for job descriptions | Done |
| `ChatPanel.tsx` | Chat UI with message bubbles, input, loading states | UI done, API stubbed |
| `api.ts` | All API wrapper functions (sendChatMessage, getContextualScore, spawnAgent/registerAgent, listAgents) | Done |
| `types/index.ts` | All TypeScript interfaces | Done |

### Frontend — Pages Need API Wiring
These pages have TODO stubs where placeholder data needs to be replaced with real API calls:

| Page | Components Used | What's Stubbed |
|------|----------------|----------------|
| `/profile/[id]` | ChatPanel | Chat responses are placeholder |
| `/dashboard` | JobDescriptionInput, ContextualScoreCard | `handleEvaluateFit` uses placeholder data |
| `/agents` | AgentCard | Agent list is hardcoded, registration is a fake delay |
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

### Phase 1: ChatPanel API Wiring
**File:** `frontend/src/components/ChatPanel.tsx`

Wire the chat panel to the real backend. Replace the placeholder response (lines 54-66) with:
1. Import `sendChatMessage` from `@/lib/api` and `useAuth` from `@/contexts/AuthContext`
2. Call `sendChatMessage(workerId, input, sessionId, token)`
3. Persist `session_id` from response for multi-turn conversations
4. Push assistant message from response into the messages array

**Used on:** `/profile/[id]` page (toggle "Ask About This Worker")

**Dependencies:** None — backend chat route + Gemini service are complete

---

### Phase 2: Dashboard Contextual Scoring
**File:** `frontend/src/app/dashboard/page.tsx`

Wire the "Evaluate My Fit" section to real contextual scoring. Replace placeholder in `handleEvaluateFit` (lines 67-86) with:
1. Import `getContextualScore` from `@/lib/api` and `useAuth`
2. Call `getContextualScore(profile.user_id, jobDescription, token)`
3. Map response `{ fit_score, breakdown }` to `setContextualScore()`

**Used on:** `/dashboard` page (worker evaluates themselves against a JD)

**Dependencies:** None — contextual score route + service are complete

---

### Phase 3: Agents Page (Fetch + Register Credential)
**File:** `frontend/src/app/agents/page.tsx`

Wire agent list fetching and agent registration. Two changes:

**A. Fetch agents on mount (lines 20-73):**
1. Import `listAgents` from `@/lib/api` and `useAuth`
2. Replace hardcoded placeholder with `listAgents(user.id, token)`
3. Map response to `AgentWithParent[]` state

**B. Register agent (lines 82-86):**
1. Import `spawnAgent` from `@/lib/api` (calls `POST /api/agent/spawn` — registration endpoint)
2. Call `spawnAgent(newAgentName, token)`
3. Refetch agent list after success

**Used on:** `/agents` page

**Dependencies:** User must be authenticated (World ID verified)

---

### Phase 4: Browse Page Batch Scoring
**File:** `frontend/src/app/browse/page.tsx`

Wire batch contextual scoring for the worker marketplace. Replace placeholder in `handleEvaluateAll` (lines 117-129) with:
1. Import `getContextualScore` from `@/lib/api` and `useAuth`
2. Call `getContextualScore` for each worker using `Promise.allSettled`
3. Update each worker's `contextualFitScore` with the returned `fit_score`
4. `setWorkers(updatedWorkers)` to trigger re-render

**Used on:** `/browse` page (evaluate all workers against a job description)

**Dependencies:** Workers must exist in the database (Person 2/3 responsibility)

---

### Phase 5: Gemini Prompt Refinement
**File:** `backend/src/services/gemini.ts`

Improve AI output quality after seeing real results:

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

### Phase 6: Design System Alignment
**Files:** All frontend files modified in Phases 1-4

Align UI with DESIGN.md (light glass morphism):
- ChatPanel: Update bubble colors from dark theme (`bg-worldcoin-gray-700`) to glass morphism
- Agents page: Dark card classes → light glass styling
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
| POST | `/api/agent/spawn` | Required | Register agent / mint Agent Credential (implementation route name) |
| GET | `/api/agent/list/:userId` | Required | List user's agents |
| GET | `/api/agent/:agentId` | Public | Lookup agent identity |

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

### Phase 1: ChatPanel API Wiring
- [ ] Import `sendChatMessage` and `useAuth` into ChatPanel.tsx
- [ ] Replace placeholder response with real API call
- [ ] Persist session_id across messages
- [ ] Test end-to-end chat on profile page

### Phase 2: Dashboard Contextual Score
- [ ] Import `getContextualScore` and `useAuth` into dashboard/page.tsx
- [ ] Replace placeholder in handleEvaluateFit with real API call
- [ ] Test with real job description input

### Phase 3: Agents Page
- [ ] Import `listAgents`, `spawnAgent`, and `useAuth` into agents/page.tsx
- [ ] Replace hardcoded agent list with real API fetch
- [ ] Wire register button to real API call
- [ ] Refetch agent list after successful registration
- [ ] Test create + list flow

### Phase 4: Browse Page Batch Scoring
- [ ] Import `getContextualScore` and `useAuth` into browse/page.tsx
- [ ] Replace placeholder in handleEvaluateAll with Promise.allSettled batch calls
- [ ] Update worker cards with contextual fit scores
- [ ] Test batch evaluation with job description

### Phase 5: Gemini Prompt Refinement
- [ ] Improve evaluateWorker prompt (markdown, missing data, score interpretation)
- [ ] Improve parseJobRequirements prompt (edge cases, normalization)
- [ ] Improve generateContextualEvaluation prompt (conservative, actionable gaps)
- [ ] Test with 3-5 diverse job descriptions

### Phase 6: Design System Alignment
- [ ] Update ChatPanel colors to light glass morphism
- [ ] Update Agents page to light glass styling
- [ ] Verify all pages use shared design tokens
- [ ] Check typography alignment with DESIGN.md
