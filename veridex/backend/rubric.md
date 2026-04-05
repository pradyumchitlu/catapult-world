Context
Replace the current 6-factor adaptive-weighted scoring system with a new 6-factor verification scoring system. Simple weighted sum to 100. Staking is 40% of the score and depends on both the staker's money AND their own verifiability. Employer reviews are a new factor. All mock data removed from frontend. TEAM.md updated with full documentation.

The 6 Factors & Formula
FactorWeightWhat it measuresidentity_assurance10%Proof of personhood + cross-platform presenceevidence_depth10%Volume of independently verifiable work artifactsconsistency10%Sustained, reliable track record over timerecency5%Freshness of evidence across all sourcesemployer_outcomes25%Starts at 50, moves based on employer/project reviews (client role only)staking40%Economic backing — staker's money * staker's verifiability score
overall = 0.10 * identity_assurance
        + 0.10 * evidence_depth
        + 0.10 * consistency
        + 0.05 * recency
        + 0.25 * employer_outcomes
        + 0.40 * staking
Staking factor (0-100)
The staking score depends on two things:

How much money each staker puts on the line (with diminishing returns via tranches)
The staker's own verifiability score — a highly verified staker's stake has more impact

Per staker: effectiveStake = applyStakeTranches(rawStakeAmount) * (stakerVeridexScore / 100)

Floor: max(stakerVeridexScore / 100, 0.10) so zero-score stakers still have minimal impact
Sum all effective stakes → normalize to 0-100 scale (e.g. 0 stake = 0, 500+ effective = 100, linear between)

Employer Outcomes (0-100)

Starts at 50 for every user (neutral baseline, no reviews)
Positive employer review: +10 (diminishing: +10, +8, +6, +5, +5...)
Negative employer review: -15 (diminishing: -15, -12, -10, -8...)
Neutral employer review: +2
Clamped 0-100
Only users with 'client' role can leave employer reviews


Implementation Steps
Step 1: Database — employer_reviews table
File: veridex/supabase/schema.sql

Add employer_reviews table (employer_id, worker_id, project_title, outcome enum, content, created_at)
Update score_components JSONB comments to 6 new keys
Add index on worker_id

New file: veridex/supabase/migrate_scoring_v2.sql — standalone migration SQL
Step 2: Backend — Scoring engine rewrite
File: veridex/backend/src/services/scoring.ts
Replace ScoreComponents interface with 6 new keys. Replace computeOverallScore() signature to accept employerReviews and stakes arrays. Apply the simple weighted formula above.
New compute functions:

computeIdentityAssurance(github, signals) — World ID (base 40) + GitHub (+20) + professional evidence (+15) + extra platforms + account age
computeEvidenceDepth(github, signals) — repos, stars, languages, evidence-backed projects, repeated skills, years experience
computeConsistency(github, signals, reviews) — keep existing logic (commit freq, active months, streaks, manual months, review count)
computeRecency(github, signals, reviews) — keep existing logic (weighted avg of GitHub/professional/review recency)
computeEmployerOutcomes(employerReviews) — starts at 50, adjusts per review
computeStaking(stakes, reviews) — sum effective stakes (amount * staker verifiability), normalize to 0-100

Delete: computeDeveloperCompetence, computeCollaboration, computeSpecialization, computeActivityRecency, computePeerTrust, computeAdaptiveWeights
Keep: collectManualSignals, applyStakeTranches, all helpers
Step 3: Backend — Employer review route
New file: veridex/backend/src/routes/employer-review.ts

POST /api/employer-review — requires auth + 'client' role. Body: { worker_id, project_title, outcome, content? }. Triggers score recomputation.
GET /api/employer-review/:workerId — public, lists employer reviews

File: veridex/backend/src/index.ts — register new router
Step 4: Backend — Update routes calling computeOverallScore
Files: reputation.ts, review.ts

Before calling computeOverallScore, also fetch employer reviews and stakes from DB
Pass all data to the new function signature

Step 5: Backend — Gemini prompt update
File: veridex/backend/src/services/gemini.ts (line 53)

Replace component names with 6 new ones

Step 6: Frontend — Types + ScoreBreakdown
File: veridex/frontend/src/types/index.ts — new ScoreComponents interface (6 keys)
File: veridex/frontend/src/components/ScoreBreakdown.tsx — new COMPONENT_LABELS:

Identity, Evidence, Consistency, Recency, Employer Reviews, Staking

Step 7: Frontend — API wrappers
File: veridex/frontend/src/lib/api.ts

Add createEmployerReview(data, token) and getEmployerReviews(workerId)

Step 8: Backend — Workers list endpoint
File: veridex/backend/src/routes/reputation.ts

Add GET /api/workers — queries worker_profiles + users, optional profession filter

Step 9: Frontend — Remove ALL mock data

profile/[id]/page.tsx — remove hardcoded data (lines 36-103), fetch via getReputation, getReviews, getEmployerReviews
browse/page.tsx — remove hardcoded workers (lines 44-81), fetch from GET /api/workers
staker/page.tsx — remove hardcoded data (lines 26-72), fetch from getMe + getStakes
query-demo/page.tsx — uncomment real API calls (lines 21-23, 56-58), remove mocks

Step 10: Frontend — Employer review UI on profile page
File: frontend/src/app/profile/[id]/page.tsx

Show employer reviews section
If current user has 'client' role → show "Leave Employer Review" form

Step 11: Test fixtures
File: backend/src/__tests__/fixtures.ts — update mock score_components to 6 new keys
Step 12: Update TEAM.md
File: TEAM.md

Add section documenting the 6-factor verification scoring system
Document the formula, weights, staking mechanics, employer review system
Document the new employer_reviews table
Document new API endpoints (POST/GET /api/employer-review)
Update Person 4 section with completed work


Files Modified
FileChangeTEAM.mdAdd scoring system documentationsupabase/schema.sqlNew employer_reviews table + updated commentssupabase/migrate_scoring_v2.sqlNew — migration SQLbackend/src/services/scoring.tsMajor rewrite — 6 factors, fixed weighted formulabackend/src/services/gemini.tsPrompt updatebackend/src/routes/employer-review.tsNew — employer review CRUDbackend/src/routes/reputation.tsFetch employer reviews/stakes + GET /api/workersbackend/src/routes/review.tsFetch employer reviews/stakes before recomputationbackend/src/index.tsRegister employer-review routerfrontend/src/types/index.tsScoreComponents interfacefrontend/src/components/ScoreBreakdown.tsxLabels + empty statefrontend/src/lib/api.tsEmployer review wrappersfrontend/src/app/profile/[id]/page.tsxRemove mocks, real API, employer review UIfrontend/src/app/browse/page.tsxRemove mocks, fetch workersfrontend/src/app/staker/page.tsxRemove mocks, fetch real stakesfrontend/src/app/query-demo/page.tsxUncomment real API callsbackend/src/__tests__/fixtures.tsUpdate mock keys
Verification

cd veridex/backend && npx jest --forceExit — tests pass
New user: identity_assurance ~40 (World ID only), employer_outcomes 50, staking 0 → overall ~17
Connect GitHub → identity_assurance ~60, evidence_depth populates → overall rises
Client leaves employer review → employer_outcomes moves from 50
Staker stakes on worker → staking factor rises (weighted by staker's own score)
All frontend pages load real data, no hardcoded mocks
ScoreBreakdown shows 6-point radar chart