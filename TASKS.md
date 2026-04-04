# Veridex Task List

Tasks organized by feature, prioritized for incremental development. Complete each feature end-to-end before moving to the next.

---

## Phase 1: Core Auth & User Setup
*Get users into the system with verified identities*

### Backend
- [ ] **B1.1** Set up Supabase connection and test it works
- [ ] **B1.2** Implement World ID proof verification in `routes/auth.ts`
  - Call World ID API to verify proof
  - Create user in `users` table with `world_id_hash`
  - Return user data + session token
- [ ] **B1.3** Implement JWT/session middleware in `middleware/auth.ts`
  - Verify Supabase auth tokens
  - Attach user to request object
- [ ] **B1.4** Add user update endpoint (display name, roles, profession)

### Frontend
- [ ] **F1.1** Set up Supabase client and auth context/provider
- [ ] **F1.2** Implement World ID verification in `WorldIDButton.tsx`
  - Install `@worldcoin/minikit-js`
  - Handle verification flow
  - Call backend `/api/auth/verify`
- [ ] **F1.3** Complete `verify/page.tsx` - handle success/error states
- [ ] **F1.4** Complete `onboarding/page.tsx` - save user profile to backend
- [ ] **F1.5** Update `Navbar.tsx` to show logged-in user + WLD balance
- [ ] **F1.6** Add auth redirect logic (protect dashboard, etc.)

**Milestone:** Users can verify with World ID and complete onboarding.

---

## Phase 2: Worker Profiles (No GitHub Yet)
*Basic profiles that work without external integrations*

### Backend
- [ ] **B2.1** Create worker profile on user creation (in `routes/auth.ts`)
- [ ] **B2.2** Implement `GET /api/reputation/:userId` to return full profile
- [ ] **B2.3** Add endpoint to update worker profile (skills, specializations manually)

### Frontend
- [ ] **F2.1** Complete `dashboard/page.tsx` - fetch and display own profile
- [ ] **F2.2** Complete `profile/[id]/page.tsx` - fetch and display any profile
- [ ] **F2.3** Wire up `TrustScoreCard.tsx` with real data
- [ ] **F2.4** Wire up `ScoreBreakdown.tsx` radar chart with real data
- [ ] **F2.5** Add profile view logging (call backend when viewing a profile)

**Milestone:** Users can view their own and others' profiles.

---

## Phase 3: Browse & Search Workers
*Marketplace to discover workers*

### Backend
- [ ] **B3.1** Add `GET /api/workers` endpoint - list all workers with filters
  - Filter by: profession, skills, score range
  - Sort by: trust score, review count
  - Pagination
- [ ] **B3.2** Add search by name/skills

### Frontend
- [ ] **F3.1** Complete `browse/page.tsx` - fetch workers list
- [ ] **F3.2** Implement filters (profession, score range)
- [ ] **F3.3** Implement search input
- [ ] **F3.4** Wire up `WorkerCard.tsx` with real data
- [ ] **F3.5** Add "View Profile" links to worker cards

**Milestone:** Users can browse and search for workers.

---

## Phase 4: Reviews System
*Let clients leave staked reviews*

### Backend
- [ ] **B4.1** Implement `POST /api/review` - create staked review
  - Validate rating (1-5)
  - Deduct stake from reviewer's WLD balance
  - Check for mutual review (flag if found)
  - Snapshot reviewer's trust score
- [ ] **B4.2** Implement `GET /api/review/:workerId` - get reviews sorted by stake
- [ ] **B4.3** Trigger score recomputation when review is added
- [ ] **B4.4** Implement peer_trust calculation in `services/scoring.ts`
  - Trust-weighted reviews
  - Stake concentration penalty

### Frontend
- [ ] **F4.1** Complete `review/[workerId]/page.tsx` - review form
- [ ] **F4.2** Wire up `ReviewForm.tsx` - stars, text, category, stake slider
- [ ] **F4.3** Wire up `ReviewCard.tsx` with real data
- [ ] **F4.4** Wire up `ReviewsList.tsx` on profile page
- [ ] **F4.5** Show WLD balance in review form, validate sufficient funds
- [ ] **F4.6** Add success/error handling after review submission

**Milestone:** Clients can leave staked reviews, workers see reviews on profile.

---

## Phase 5: Staking System
*Let stakers back workers with WLD*

### Backend
- [ ] **B5.1** Implement `POST /api/stake` - stake WLD on worker
  - Validate sufficient balance
  - Create stake record
  - Deduct from staker balance
- [ ] **B5.2** Implement `GET /api/stake/:userId` - get user's stakes
- [ ] **B5.3** Implement `POST /api/stake/withdraw` - withdraw stake
  - Optional: add 7-day lock period
- [ ] **B5.4** Calculate yield (based on worker score changes) - can be simplified for hackathon

### Frontend
- [ ] **F5.1** Wire up `StakeButton.tsx` - modal with amount input
- [ ] **F5.2** Complete `staker/page.tsx` - portfolio view
- [ ] **F5.3** Wire up `StakePortfolio.tsx` with real stakes
- [ ] **F5.4** Show total staked on worker profiles
- [ ] **F5.5** Add withdraw functionality

**Milestone:** Stakers can stake WLD on workers and manage portfolio.

---

## Phase 6: GitHub Integration
*Connect GitHub for developer trust signals*

### Backend
- [ ] **B6.1** Complete GitHub OAuth flow in `routes/auth.ts`
  - Exchange code for access token
  - Store token securely
- [ ] **B6.2** Implement `services/github.ts` fully
  - `fetchUserProfile` - repos, stars, languages
  - `fetchContributionHistory` - commit patterns
  - `fetchCollaborationSignals` - external PRs
- [ ] **B6.3** Implement `POST /api/reputation/ingest`
  - Fetch all GitHub data
  - Compute all score components
  - Update worker profile
- [ ] **B6.4** Complete scoring algorithm in `services/scoring.ts`
  - All 6 components working
  - Weighted average based on available data

### Frontend
- [ ] **F6.1** Wire up `GitHubConnectButton.tsx` - redirect to OAuth
- [ ] **F6.2** Handle OAuth callback redirect
- [ ] **F6.3** Show GitHub data on profiles (repos, languages, stats)
- [ ] **F6.4** Add "Refresh GitHub Data" button on dashboard
- [ ] **F6.5** Show ingestion status (pending/processing/completed)

**Milestone:** Developers can connect GitHub and get scored on their activity.

---

## Phase 7: AI Chat & Contextual Scoring
*Gemini-powered worker evaluation*

### Backend
- [ ] **B7.1** Set up Gemini client in `services/gemini.ts`
- [ ] **B7.2** Implement `evaluateWorker` - answer questions about worker
- [ ] **B7.3** Implement `parseJobRequirements` - extract skills from JD
- [ ] **B7.4** Implement `generateContextualEvaluation` - fit scoring
- [ ] **B7.5** Implement `POST /api/chat` - chat endpoint with session
- [ ] **B7.6** Implement `POST /api/contextual-score` - fit score endpoint
- [ ] **B7.7** Store chat sessions in database

### Frontend
- [ ] **F7.1** Wire up `ChatPanel.tsx` - send/receive messages
- [ ] **F7.2** Add chat panel to profile pages
- [ ] **F7.3** Wire up `JobDescriptionInput.tsx`
- [ ] **F7.4** Wire up `ContextualScoreCard.tsx` - show met/partial/missing
- [ ] **F7.5** Add "Evaluate for Role" on browse page
- [ ] **F7.6** Add "Evaluate My Fit" on dashboard

**Milestone:** Clients can chat with AI about workers and get contextual fit scores.

---

## Phase 8: Agent Credentials
*Register agents on-chain, verify for counterparties, enforce accountability*

### Backend
- [ ] **B8.1** Implement `POST /api/agent/spawn` (registration — mint / record Agent Credential)
  - Accept agent identifier (signing key, endpoint, wallet, etc. as applicable)
  - Store trust inheritance fraction, authorized domains, optional stake reference
  - Bind credential to verified human (World ID) and effective trust
- [ ] **B8.2** Implement `GET /api/agent/list/:userId` — list credentials for dashboard (hierarchy)
- [ ] **B8.3** Implement `GET /api/agent/:agentId` — public verification response for third parties
- [ ] **B8.4** Update effective agent trust when parent score changes
- [ ] **B8.5** (Stretch) Dispute flow hooks — record dispute, apply score/ stake slashing when validated

### Frontend
- [ ] **F8.1** Complete `agents/page.tsx` — list and register agents (dashboard hierarchy)
- [ ] **F8.2** Wire up `AgentCard.tsx`
- [ ] **F8.3** Add copy agent / credential identifier for integrators
- [ ] **F8.4** Complete `query-demo/page.tsx` — test external verification API

**Milestone:** Humans can register Agent Credentials and counterparties can verify an agent via the public API.

---

## Phase 9: Polish & Edge Cases
*Final touches*

### Backend
- [ ] **B9.1** Add rate limiting
- [ ] **B9.2** Add input validation (zod or similar)
- [ ] **B9.3** Improve error messages
- [ ] **B9.4** Add logging

### Frontend
- [ ] **F9.1** Add loading skeletons everywhere
- [ ] **F9.2** Add error boundaries
- [ ] **F9.3** Mobile responsive fixes
- [ ] **F9.4** Empty states (no reviews, no stakes, etc.)
- [ ] **F9.5** Toast notifications for actions
- [ ] **F9.6** Favicon and meta tags

**Milestone:** Production-ready polish.

---

## Quick Reference: What to Work on Now

| Priority | Feature | Backend Tasks | Frontend Tasks |
|----------|---------|---------------|----------------|
| 1 | Auth | B1.1-B1.4 | F1.1-F1.6 |
| 2 | Profiles | B2.1-B2.3 | F2.1-F2.5 |
| 3 | Browse | B3.1-B3.2 | F3.1-F3.5 |
| 4 | Reviews | B4.1-B4.4 | F4.1-F4.6 |
| 5 | Staking | B5.1-B5.4 | F5.1-F5.5 |
| 6 | GitHub | B6.1-B6.4 | F6.1-F6.5 |
| 7 | AI/Chat | B7.1-B7.7 | F7.1-F7.6 |
| 8 | Agent Credentials | B8.1-B8.5 | F8.1-F8.4 |
| 9 | Polish | B9.1-B9.4 | F9.1-F9.6 |

---

## Parallel Work Suggestions

Frontend and backend can work in parallel on the same phase:

- **Phase 1:** Backend does auth API while frontend builds UI with mocks
- **Phase 4:** Backend does review API while frontend builds form UI
- **Phase 7:** Backend does Gemini integration while frontend builds chat UI

Use placeholder/mock data in frontend until backend endpoints are ready.
