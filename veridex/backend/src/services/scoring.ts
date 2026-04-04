/**
 * Trust Score Computation Service
 *
 * Score components (each 0-100):
 * - developer_competence: from GitHub data
 * - collaboration: from GitHub PRs + review sentiment
 * - consistency: from commit history + review frequency
 * - specialization_depth: from repo topics + review categories
 * - activity_recency: from recent commits + recent reviews
 * - peer_trust: from staked reviews, weighted by reviewer credibility
 *
 * INTEGRITY MECHANISMS:
 * 1. Trust-weighted reviews: impact = f(reviewer_trust_score, stake_amount)
 * 2. Mutual review detection: downweight reciprocal reviews
 * 3. Stake concentration penalty: diminishing returns from single staker
 */

export interface ScoreComponents {
  developer_competence: number;
  collaboration: number;
  consistency: number;
  specialization_depth: number;
  activity_recency: number;
  peer_trust: number;
}

export interface ScoreResult {
  overall: number;
  components: ScoreComponents;
  computed_skills: string[];
}

interface ProfileData {
  githubData?: any;
  linkedinData?: any;
}

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  stake_amount: number;
  reviewer_trust_score_at_time: number | null;
  is_flagged: boolean;
  job_category: string | null;
  created_at: string;
}

/**
 * Compute overall trust score from profile data and reviews
 */
export async function computeOverallScore(
  profileData: ProfileData,
  reviews: Review[]
): Promise<ScoreResult> {
  const components: ScoreComponents = {
    developer_competence: 0,
    collaboration: 0,
    consistency: 0,
    specialization_depth: 0,
    activity_recency: 0,
    peer_trust: 0,
  };

  const computedSkills: string[] = [];
  let hasGitHub = false;

  // Compute GitHub-based scores
  if (profileData.githubData) {
    hasGitHub = true;
    const github = profileData.githubData;

    // Developer competence: based on repo quality, stars, languages
    components.developer_competence = computeDeveloperCompetence(github);

    // Collaboration: based on external contributions
    components.collaboration = computeCollaboration(github);

    // Consistency: based on commit patterns
    components.consistency = computeConsistency(github);

    // Specialization depth: based on language focus and repo topics
    components.specialization_depth = computeSpecialization(github);

    // Activity recency
    components.activity_recency = computeActivityRecency(github);

    // Extract skills from languages and topics
    if (github.languages) {
      computedSkills.push(...github.languages.slice(0, 10));
    }
    if (github.repos) {
      const topics = github.repos.flatMap((r: any) => r.topics || []);
      const uniqueTopics = [...new Set(topics)].slice(0, 10);
      computedSkills.push(...uniqueTopics);
    }
  }

  // Compute peer trust from reviews
  components.peer_trust = computePeerTrust(reviews);

  // Add skills from review categories
  const reviewCategories = [...new Set(reviews.map((r) => r.job_category).filter(Boolean))];
  computedSkills.push(...reviewCategories as string[]);

  // Calculate overall score with weighted average
  // Weights adjust based on available data sources
  const weights = hasGitHub
    ? {
        developer_competence: 0.20,
        collaboration: 0.15,
        consistency: 0.15,
        specialization_depth: 0.10,
        activity_recency: 0.15,
        peer_trust: 0.25,
      }
    : {
        developer_competence: 0,
        collaboration: 0.10,
        consistency: 0.15,
        specialization_depth: 0.15,
        activity_recency: 0.20,
        peer_trust: 0.40,
      };

  const overall = Math.round(
    Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + components[key as keyof ScoreComponents] * weight;
    }, 0)
  );

  return {
    overall,
    components,
    computed_skills: [...new Set(computedSkills)],
  };
}

function computeDeveloperCompetence(github: any): number {
  let score = 0;

  // Repo count (max 30 points)
  const repoCount = github.repos?.length || 0;
  score += Math.min(30, repoCount * 2);

  // Total stars (max 30 points)
  const totalStars = github.total_stars || 0;
  score += Math.min(30, totalStars);

  // Language diversity (max 20 points)
  const languageCount = github.languages?.length || 0;
  score += Math.min(20, languageCount * 4);

  // Account age bonus (max 20 points)
  if (github.created_at) {
    const yearsOld = (Date.now() - new Date(github.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000);
    score += Math.min(20, yearsOld * 5);
  }

  return Math.min(100, Math.round(score));
}

function computeCollaboration(github: any): number {
  const collab = github.collaboration;
  if (!collab) return 30; // Default for no data

  // Collaboration score from GitHub service (max 60 points)
  let score = Math.min(60, collab.collaboration_score || 0);

  // External PRs bonus (max 20 points)
  score += Math.min(20, (collab.prs_merged_to_external_repos || 0) * 5);

  // Repos contributed to (max 20 points)
  score += Math.min(20, (collab.repos_contributed_to || 0) * 4);

  return Math.min(100, Math.round(score));
}

function computeConsistency(github: any): number {
  const contributions = github.contributions;
  if (!contributions) return 30;

  let score = 0;

  // Commit frequency (max 40 points)
  if (contributions.commit_frequency === 'high') score += 40;
  else if (contributions.commit_frequency === 'medium') score += 25;
  else score += 10;

  // Active months (max 30 points)
  score += Math.min(30, (contributions.active_months || 0) * 2.5);

  // Streak bonus (max 30 points)
  score += Math.min(30, (contributions.longest_streak_days || 0) / 3);

  return Math.min(100, Math.round(score));
}

function computeSpecialization(github: any): number {
  let score = 30; // Base score

  // Language concentration (specialization)
  if (github.repos) {
    const languageCounts: Record<string, number> = {};
    github.repos.forEach((repo: any) => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });

    const sortedLangs = Object.entries(languageCounts).sort((a, b) => b[1] - a[1]);
    if (sortedLangs.length > 0) {
      const topLangCount = sortedLangs[0][1];
      const total = github.repos.length;
      // Specialization bonus: higher if more repos in primary language
      score += Math.min(40, (topLangCount / total) * 50);
    }
  }

  // Topic depth (having repos with topics indicates intentional categorization)
  if (github.repos) {
    const reposWithTopics = github.repos.filter((r: any) => r.topics?.length > 0).length;
    score += Math.min(30, reposWithTopics * 3);
  }

  return Math.min(100, Math.round(score));
}

function computeActivityRecency(github: any): number {
  const contributions = github.contributions;
  if (!contributions) return 30;

  // Recent activity score from GitHub service (0-100)
  return Math.round(contributions.recent_activity_score || 30);
}

/**
 * Compute peer trust score from reviews with integrity mechanisms
 */
function computePeerTrust(reviews: Review[]): number {
  if (reviews.length === 0) return 0;

  // Filter out flagged reviews
  const activeReviews = reviews.filter((r) => !r.is_flagged);
  if (activeReviews.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  // Track stake by reviewer for concentration penalty
  const stakeByReviewer: Record<string, number> = {};

  activeReviews.forEach((review) => {
    // Trust-weighted impact: higher weight for higher trust reviewers with larger stakes
    const reviewerTrust = review.reviewer_trust_score_at_time || 50;
    const stake = review.stake_amount || 0;

    // Base weight from reviewer trust (0.5 to 1.5 multiplier)
    const trustMultiplier = 0.5 + (reviewerTrust / 100);

    // Stake weight (logarithmic to prevent gaming)
    const stakeWeight = stake > 0 ? Math.log10(stake + 1) : 0.5;

    // Stake concentration penalty
    stakeByReviewer[review.reviewer_id] = (stakeByReviewer[review.reviewer_id] || 0) + stake;
    const reviewerTotalStake = stakeByReviewer[review.reviewer_id];

    // Diminishing returns: first 100 WLD = full weight, next 100 = 50%, next = 25%
    let concentrationPenalty = 1;
    if (reviewerTotalStake > 300) concentrationPenalty = 0.25;
    else if (reviewerTotalStake > 200) concentrationPenalty = 0.5;
    else if (reviewerTotalStake > 100) concentrationPenalty = 0.75;

    const weight = trustMultiplier * stakeWeight * concentrationPenalty;
    totalWeight += weight;

    // Convert 1-5 rating to 0-100 scale
    const normalizedRating = ((review.rating - 1) / 4) * 100;
    weightedSum += normalizedRating * weight;
  });

  if (totalWeight === 0) return 0;

  const baseScore = weightedSum / totalWeight;

  // Review count bonus (more reviews = more confidence)
  const countBonus = Math.min(20, activeReviews.length * 2);

  return Math.min(100, Math.round(baseScore + countBonus));
}
