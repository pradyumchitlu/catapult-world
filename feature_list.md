Here's the complete updated feature set:

**Identity & Verification**

1. World ID verification via MiniKit — one-human-one-identity, gatekeeper for all platform features.
2. GitHub OAuth connection — authorize Veridex to pull repository and contribution data.
3. LinkedIn data ingestion — via Proxycurl for demo profiles, manual input as fallback.
4. Role selection — after verification, users indicate if they're a worker, staker, client, or multiple.
5. Profession category selection — software, writing, design, trades, other. Determines which data sources matter and how scoring weights are distributed.

**Reputation Data Pipeline**

6. GitHub data extraction — repos, stars, forks, commit history, languages, PRs to other repos, contribution frequency/recency.
7. LinkedIn data extraction — work history, skills, endorsements, education.
8. Data normalization — convert heterogeneous platform data into a standardized schema (skills, years of experience, specializations, activity patterns).
9. Trust score computation — weighted algorithm producing an overall score (0–100) plus sub-scores: developer competence, collaboration, consistency, specialization depth, activity recency, and peer trust.
10. Adaptive score weighting — weights adjust based on available data sources. GitHub-heavy for developers, review-heavy for non-tech workers like gardeners or writers. Workers with no platform connections build reputation entirely through staked reviews.
11. One-time ingestion job — runs on platform connection, processes all data, stores aggregated profile in Supabase.

**Integrity Mechanisms**

12. Trust-weighted reviews — review impact on a worker's score scales with the reviewer's own trust score and the WLD staked on the review. Low-trust reviewers with small stakes barely move the needle.
13. Mutual review detection — if reviewer A reviewed worker B and worker B reviewed reviewer A, both reviews get flagged and downweighted automatically.
14. Stake concentration penalty — diminishing returns when more than 50% of a worker's staked WLD comes from a single staker. First 100 WLD = full weight, next 100 = 50%, next 100 = 25%.
15. GitHub quality signals — scoring weights signals that are hard to fake: PRs merged into external repos, commit consistency over 6+ months, meaningful code contribution size. Shallow repos with few commits are explicitly flagged as minimal experience.

**Staked Reviews**

16. Leave a staked review — after working with someone, clients leave a star rating (1–5), written feedback, job category, and stake WLD on their review to back it with skin in the game.
17. Review display — each review shows reviewer name, reviewer trust score, star rating, feedback text, WLD staked, and timestamp. Sorted by stake amount (most skin in the game first).
18. Review-driven reputation — for workers without platform data (gardeners, writers, etc.), staked reviews are the primary reputation signal. World ID verify → get reviews → build trust score.
19. Reviewer credibility snapshot — reviewer's trust score at the time of review is recorded, so the review's weight is anchored to their credibility when they wrote it.

**Contextual Fit Scoring**

20. Client-initiated contextual scoring — client pastes a job description or types requirements on a worker's profile. System generates a fit score (0–100) with a breakdown of requirements met, partially met, and missing, with evidence from the worker's actual data.
21. Worker self-evaluation — workers paste job descriptions they're targeting on their own dashboard and get a fit score plus gap analysis ("you'd score 72 for this role — strong on React, no public D3 work").
22. Browse with contextual filtering — on the browse page, clients can paste a job description at the top. Worker cards then show contextual fit scores alongside overall trust scores, ranked by fit.
23. LLM-powered evaluation depth — contextual scoring uses the Anthropic API to go beyond keyword matching. "Worker has 8 React repos spanning 2 years with consistent contributions — strong experience" vs "1 React repo with 3 commits over 1 day — minimal."

**Worker Experience**

24. Worker dashboard — overall trust score with visual component breakdown (radar chart), connected platforms, WLD staked on you (total + by whom), recent reviews received, query log.
25. Connected platforms view — shows which platforms are linked, last sync time, option to reconnect.
26. Query log — every time someone views your profile, queries the API, or runs a contextual score, you see who and when.

**Staker Experience**

27. Browse workers marketplace — searchable, filterable grid of verified workers. Filter by skills, score range, profession category, review count, average rating.
28. Stake WLD on a worker — allocate WLD credits to a worker you believe in, with amount input and confirmation.
29. Staker portfolio dashboard — active stakes, WLD balance, yield earned/lost per worker, worker score trends over time.
30. WLD credit system — every verified user starts with 1000 WLD. Staking deducts from balance. Yield earned when staked workers maintain or improve scores. In production, settles on World Chain (stated roadmap).

**Client Experience**

31. Worker public profile — full trust breakdown, GitHub highlights (if connected), reviews section, staking info, AI chatbot panel, "Leave Review" and "Stake" buttons.
32. AI chatbot on worker profiles — natural language interface grounded in the worker's verified data and reviews. First message: "Describe what you're looking for." First response: contextual fit score with evidence. Then conversational follow-ups.
33. Chat session history — clients can revisit past evaluation conversations.

**Agent Identity**

34. Agent spawning — workers generate a named AI agent tied to their World ID and reputation.
35. Derived trust score — agents inherit 70% of their parent's overall trust score.
36. Agent lookup — anyone can query an agent's ID and see the backing human's trust profile and verification status.

**External API / Composability**

37. Trust query API — `GET /api/trust/:veridexId` returns a worker's trust score, verification status, score components, and review summary.
38. Agent query API — `GET /api/agent/:agentId` returns the agent's derived score and link to parent human.
39. Query demo page — simulated third-party app that calls the API and displays results, proving composability.

**Landing / Marketing**

40. Landing page — problem framing (fake identity, trapped reputation, unaccountable agents), solution overview, three CTAs for each user type, "how it works" section.

41. Outside website - create another small scale website that queries Veridex for its purposes.

---

That's **40 features**, up from 30. The 10 new ones are: profession categories (5), adaptive score weighting (10), trust-weighted reviews (12), mutual review detection (13), stake concentration penalty (14), GitHub quality signals (15), staked reviews system (16–19), contextual fit scoring (20–23), and worker self-evaluation (21).

**Updated priority tiers for the hackathon:**

**Must-have for demo** (14 features): 1, 2, 6, 9, 10, 16, 17, 20, 24, 27, 31, 32, 37, 40 — these tell the complete story in the video.

**Strong-to-have** (13 features): 4, 5, 8, 11, 12, 13, 14, 21, 28, 29, 30, 34, 35 — these make it feel like a real platform.

**Nice-to-have** (13 features): 3, 7, 15, 18, 19, 22, 23, 25, 26, 33, 36, 38, 39 — cut these first if time is tight.
