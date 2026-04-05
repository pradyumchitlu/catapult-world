/**
 * Trust Score Computation Service
 *
 * Score components (each 0-100):
 * - identity_assurance: proof of personhood + cross-platform verification signals
 * - evidence_depth: independently verifiable work artifacts and experience
 * - consistency: sustained activity over time
 * - recency: how recently the profile shows meaningful work
 * - employer_outcomes: employer/project outcome reviews from client-role reviewers
 * - staking: economic backing weighted by each staker's own verifiability
 */

export interface ScoreComponents {
  identity_assurance: number;
  evidence_depth: number;
  consistency: number;
  recency: number;
  employer_outcomes: number;
  staking: number;
}

export interface GroupedScores {
  evidence: number;
  employer: number;
  staking: number;
  veridex: number;
}

export interface ScoreResult {
  overall: number;
  components: ScoreComponents;
  groupedScores: GroupedScores;
  computed_skills: string[];
  specializations: string[];
  years_experience: number | null;
}

interface ProfileData {
  githubData?: any;
  linkedinData?: any;
  otherPlatforms?: any;
}

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  stake_amount: number;
  reviewer_trust_score_at_time: number | null;
  is_flagged: boolean;
  flag_reason?: string | null;
  job_category: string | null;
  created_at: string;
  reviewer?: {
    roles?: string[] | null;
  } | null;
}

interface StakeEvidence {
  amount: number;
  staker_score?: number | null;
  created_at?: string;
  staker?: {
    worker_profiles?:
      | { overall_trust_score?: number | null }
      | Array<{ overall_trust_score?: number | null }>
      | null;
  } | null;
}

interface EmployerReview {
  outcome?: string | null;
  created_at?: string;
}

interface LinkedInExperience {
  title?: string;
  company?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  skills?: string[];
  technologies?: string[];
}

interface ProjectEvidence {
  title?: string;
  role?: string;
  description?: string;
  url?: string;
  proof_urls?: string[];
  start_date?: string;
  end_date?: string;
  updated_at?: string;
  skills?: string[];
  technologies?: string[];
  tags?: string[];
}

interface ManualSignals {
  computedSkills: string[];
  specializations: string[];
  topSpecializationCount: number;
  repeatedSkillCount: number;
  totalSkillMentions: number;
  yearsExperience: number | null;
  projectCount: number;
  evidenceBackedProjectCount: number;
  professionalExperienceCount: number;
  collaborationEvidenceCount: number;
  activeManualMonths: number;
  recentManualActivityScore: number;
  hasProfessionalEvidence: boolean;
}

/**
 * Compute overall trust score from profile data and reviews
 */
export async function computeOverallScore(
  profileData: ProfileData,
  reviews: Review[],
  stakes: StakeEvidence[] = [],
  employerReviews: EmployerReview[] = []
): Promise<ScoreResult> {
  const github = profileData.githubData ?? {};
  const manualSignals = collectManualSignals(profileData, reviews);
  const otherPlatforms = profileData.otherPlatforms ?? {};

  const components: ScoreComponents = {
    identity_assurance: computeIdentityAssurance(github, otherPlatforms, manualSignals),
    evidence_depth: computeEvidenceDepth(github, manualSignals),
    consistency: computeConsistency(github, manualSignals, reviews),
    recency: computeRecency(github, manualSignals, reviews),
    employer_outcomes: computeEmployerOutcomes(employerReviews),
    staking: computeStaking(stakes),
  };

  const overall = Math.round(
    (components.identity_assurance * 0.10) +
    (components.evidence_depth * 0.10) +
    (components.consistency * 0.10) +
    (components.recency * 0.05) +
    (components.employer_outcomes * 0.25) +
    (components.staking * 0.40)
  );
  const clampedOverall = clampScore(overall);
  const groupedScores: GroupedScores = {
    evidence: computeEvidenceGroupScore(components),
    employer: components.employer_outcomes,
    staking: components.staking,
    veridex: clampedOverall,
  };

  return {
    overall: clampedOverall,
    components,
    groupedScores,
    computed_skills: manualSignals.computedSkills,
    specializations: manualSignals.specializations,
    years_experience: manualSignals.yearsExperience,
  };
}

function computeIdentityAssurance(
  github: any,
  otherPlatforms: any,
  signals: ManualSignals
): number {
  let score = 40;

  if (hasGitHubEvidence(github)) {
    score += 20;
  }

  if (signals.hasProfessionalEvidence) {
    score += 15;
  }

  score += Math.min(10, countExtraPlatformSignals(otherPlatforms) * 5);

  const accountAgeYears = Math.max(
    github.created_at ? yearsSince(github.created_at) : 0,
    signals.yearsExperience || 0
  );
  score += Math.min(15, accountAgeYears * 3);

  return clampScore(score);
}

function computeEvidenceDepth(github: any, signals: ManualSignals): number {
  let score = 0;

  const repoCount = safeArray<any>(github.repos).length;
  score += Math.min(22, repoCount * 1.6);

  const totalStars = Number(github.total_stars || 0);
  score += Math.min(12, totalStars);

  const languageCount = safeArray<string>(github.languages).length;
  score += Math.min(10, languageCount * 3);

  score += Math.min(
    28,
    (signals.evidenceBackedProjectCount * 6) + (signals.projectCount * 2)
  );
  score += Math.min(16, signals.repeatedSkillCount * 4);
  score += Math.min(12, (signals.yearsExperience || 0) * 2);

  return clampScore(score);
}

function computeEmployerOutcomes(employerReviews: EmployerReview[]): number {
  let score = 50;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const review of employerReviews) {
    const outcome = (review.outcome || '').toLowerCase();

    if (outcome === 'positive') {
      score += diminishingSeriesValue(positiveCount, [10, 8, 6, 5, 5, 4, 4]);
      positiveCount += 1;
      continue;
    }

    if (outcome === 'negative') {
      score -= diminishingSeriesValue(negativeCount, [15, 12, 10, 8, 8, 6, 6]);
      negativeCount += 1;
      continue;
    }

    if (outcome === 'neutral') {
      score += diminishingSeriesValue(neutralCount, [2, 2, 1, 1, 1]);
      neutralCount += 1;
    }
  }

  return clampScore(score);
}

function computeEvidenceGroupScore(components: ScoreComponents): number {
  const weightedEvidenceScore =
    (components.identity_assurance * 0.10) +
    (components.evidence_depth * 0.10) +
    (components.consistency * 0.10) +
    (components.recency * 0.05);

  return clampScore(weightedEvidenceScore / 0.35);
}

function computeStaking(stakes: StakeEvidence[]): number {
  const effectiveStakeTotal = stakes.reduce((sum, stake) => {
    const amount = Math.max(0, Number(stake.amount || 0));
    if (amount <= 0) {
      return sum;
    }

    const stakerScore = resolveStakerScore(stake);
    const trustMultiplier = Math.max(stakerScore / 100, 0.10);
    return sum + (applyStakeTranches(amount) * trustMultiplier);
  }, 0);

  if (effectiveStakeTotal <= 0) {
    return 0;
  }

  return clampScore((effectiveStakeTotal / 500) * 100);
}

function countExtraPlatformSignals(otherPlatforms: any): number {
  let count = 0;

  if (safeArray<any>(otherPlatforms.portfolio).length > 0) {
    count += 1;
  }

  if (safeArray<any>(otherPlatforms.work_samples).length > 0) {
    count += 1;
  }

  if (safeArray<any>(otherPlatforms.certifications).length > 0) {
    count += 1;
  }

  if (safeArray<any>(otherPlatforms.skills).length > 0) {
    count += 1;
  }

  return count;
}

function diminishingSeriesValue(index: number, values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values[Math.min(index, values.length - 1)];
}

function resolveStakerScore(stake: StakeEvidence): number {
  if (typeof stake.staker_score === 'number') {
    return stake.staker_score;
  }

  const workerProfiles = stake.staker?.worker_profiles;
  if (Array.isArray(workerProfiles)) {
    return Number(workerProfiles[0]?.overall_trust_score || 0);
  }

  if (workerProfiles && typeof workerProfiles === 'object') {
    return Number(workerProfiles.overall_trust_score || 0);
  }

  return 0;
}

function computeDeveloperCompetence(github: any, signals: ManualSignals): number {
  let score = 0;

  const repoCount = safeArray<any>(github.repos).length;
  score += Math.min(28, repoCount * 1.8);

  const totalStars = Number(github.total_stars || 0);
  score += Math.min(18, totalStars);

  const languageCount = safeArray<string>(github.languages).length;
  score += Math.min(14, languageCount * 3.5);

  const githubYears = github.created_at ? yearsSince(github.created_at) : 0;
  score += Math.min(10, githubYears * 2.5);

  score += Math.min(18, (signals.evidenceBackedProjectCount * 5) + (signals.projectCount * 2));
  score += Math.min(12, (signals.yearsExperience || 0) * 2);

  return clampScore(score);
}

function computeCollaboration(github: any, signals: ManualSignals, reviews: Review[]): number {
  let score = 0;

  const collaboration = github.collaboration;
  if (collaboration) {
    score += Math.min(40, Number(collaboration.collaboration_score || 0));
    score += Math.min(15, Number(collaboration.prs_merged_to_external_repos || 0) * 4);
    score += Math.min(10, Number(collaboration.repos_contributed_to || 0) * 2);
  }

  score += Math.min(25, signals.collaborationEvidenceCount * 5);

  const reviewCategories = new Set(
    reviews.map((review) => normalizeSkill(review.job_category)).filter(Boolean)
  );
  score += Math.min(10, reviewCategories.size * 2.5);

  return clampScore(score);
}

function computeConsistency(github: any, signals: ManualSignals, reviews: Review[]): number {
  let score = 0;

  const contributions = github.contributions;
  if (contributions) {
    if (contributions.commit_frequency === 'high') score += 30;
    else if (contributions.commit_frequency === 'medium') score += 18;
    else if (contributions.commit_frequency === 'low') score += 8;

    score += Math.min(25, Number(contributions.active_months || 0) * 2);
    score += Math.min(15, Number(contributions.longest_streak_days || 0) / 4);
  }

  score += Math.min(20, signals.activeManualMonths / 3);

  const reviewConsistency = Math.min(10, reviews.length * 2);
  score += reviewConsistency;

  return clampScore(score);
}

function computeSpecialization(github: any, signals: ManualSignals): number {
  let score = 0;

  score += Math.min(40, signals.topSpecializationCount * 8);
  score += Math.min(20, signals.repeatedSkillCount * 5);

  const reposWithTopics = safeArray<any>(github.repos).filter(
    (repo) => safeArray<string>(repo.topics).length > 0
  ).length;
  score += Math.min(20, (reposWithTopics * 2) + (signals.evidenceBackedProjectCount * 3));
  score += Math.min(20, signals.specializations.length * 4);

  return clampScore(score);
}

function computeRecency(github: any, signals: ManualSignals, reviews: Review[]): number {
  const sources: Array<{ score: number; weight: number }> = [];

  const githubRecency = Number(github.contributions?.recent_activity_score || 0);
  if (githubRecency > 0) {
    sources.push({ score: githubRecency, weight: 0.5 });
  }

  if (signals.hasProfessionalEvidence) {
    sources.push({ score: signals.recentManualActivityScore, weight: 0.35 });
  }

  if (reviews.length > 0) {
    sources.push({ score: computeReviewRecencyScore(reviews), weight: 0.15 });
  }

  if (sources.length === 0) {
    return 0;
  }

  return clampScore(weightedAverage(sources));
}

/**
 * Compute peer trust score from reviews with integrity mechanisms
 */
function computePeerTrust(reviews: Review[]): number {
  if (reviews.length === 0) {
    return 0;
  }

  const totalRawStake = reviews.reduce((sum, review) => sum + Math.max(0, review.stake_amount || 0), 0);
  const totalStakeByReviewer = reviews.reduce<Record<string, number>>((acc, review) => {
    const reviewerId = review.reviewer_id || 'unknown';
    acc[reviewerId] = (acc[reviewerId] || 0) + Math.max(0, review.stake_amount || 0);
    return acc;
  }, {});

  let totalWeight = 0;
  let weightedSum = 0;

  for (const review of reviews) {
    const reviewerTrust = review.reviewer_trust_score_at_time ?? 50;
    const rawStake = Math.max(0, review.stake_amount || 0);
    const effectiveStake = applyStakeTranches(rawStake);

    const trustMultiplier = 0.35 + (reviewerTrust / 100);
    const stakeWeight = rawStake > 0 ? Math.log10(effectiveStake + 1) : 0.35;

    const reviewerShare = totalRawStake > 0
      ? (totalStakeByReviewer[review.reviewer_id] || 0) / totalRawStake
      : 0;

    let concentrationPenalty = 1;
    if (reviewerShare > 0.75) concentrationPenalty = 0.55;
    else if (reviewerShare > 0.5) concentrationPenalty = 0.7;

    let integrityPenalty = 1;
    if (review.is_flagged) {
      integrityPenalty = review.flag_reason === 'mutual_review_detected' ? 0.35 : 0.6;
    }

    const weight = trustMultiplier * stakeWeight * concentrationPenalty * integrityPenalty;
    totalWeight += weight;

    const normalizedRating = ((review.rating - 1) / 4) * 100;
    weightedSum += normalizedRating * weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  const baseScore = weightedSum / totalWeight;
  const uniqueReviewers = new Set(reviews.map((review) => review.reviewer_id)).size;
  const confidenceBonus = Math.min(18, (reviews.length * 2) + uniqueReviewers);

  return clampScore((baseScore * 0.88) + confidenceBonus);
}

function collectManualSignals(profileData: ProfileData, reviews: Review[]): ManualSignals {
  const github = profileData.githubData ?? {};
  const linkedin = profileData.linkedinData ?? {};
  const otherPlatforms = profileData.otherPlatforms ?? {};
  const experiences = extractExperiences(linkedin);
  const projects = extractProjects(otherPlatforms);
  const hasManualSkillInputs =
    safeArray<string>(linkedin.skills).length > 0 ||
    safeArray<string>(linkedin.top_skills).length > 0 ||
    safeArray<string>(linkedin.specializations).length > 0 ||
    safeArray<string>(otherPlatforms.skills).length > 0 ||
    safeArray<string>(otherPlatforms.certifications).length > 0;

  const skillCounts = new Map<string, { label: string; count: number }>();

  addSkills(skillCounts, safeArray<string>(github.languages), 3);

  for (const repo of safeArray<any>(github.repos)) {
    if (repo.language) {
      addSkills(skillCounts, [repo.language], 2);
    }
    addSkills(skillCounts, safeArray<string>(repo.topics), 1);
  }

  addSkills(skillCounts, safeArray<string>(linkedin.skills), 3);
  addSkills(skillCounts, safeArray<string>(linkedin.top_skills), 3);
  addSkills(skillCounts, safeArray<string>(linkedin.specializations), 2);

  for (const experience of experiences) {
    addSkills(skillCounts, safeArray<string>(experience.skills), 2);
    addSkills(skillCounts, safeArray<string>(experience.technologies), 2);
  }

  for (const project of projects) {
    addSkills(skillCounts, safeArray<string>(project.skills), 2);
    addSkills(skillCounts, safeArray<string>(project.technologies), 2);
    addSkills(skillCounts, safeArray<string>(project.tags), 1);
  }

  addSkills(skillCounts, safeArray<string>(otherPlatforms.skills), 2);
  addSkills(skillCounts, safeArray<string>(otherPlatforms.certifications), 1);

  for (const review of reviews) {
    if (review.job_category) {
      addSkills(skillCounts, [review.job_category], 1);
    }
  }

  const sortedSkills = [...skillCounts.values()].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.label.localeCompare(b.label);
  });

  const computedSkills = sortedSkills.slice(0, 15).map((entry) => entry.label);
  const specializations = sortedSkills
    .filter((entry) => entry.count >= 2)
    .slice(0, 5)
    .map((entry) => entry.label);

  const yearsExperience = estimateYearsExperience(github, experiences, projects);
  const activeManualMonths = estimateActiveManualMonths(experiences, projects);
  const recentManualActivityScore = estimateManualRecencyScore(experiences, projects);

  const companyCount = new Set(
    experiences.map((experience) => normalizeSkill(experience.company)).filter(Boolean)
  ).size;
  const collaborationRoleCount = projects.filter((project) =>
    /team|lead|manager|collaborat|client|mentor/i.test(`${project.role || ''} ${project.description || ''}`)
  ).length;
  const collaborationEvidenceCount = companyCount + collaborationRoleCount;

  const evidenceBackedProjectCount = projects.filter((project) => {
    return Boolean(
      project.url ||
      safeArray<string>(project.proof_urls).length > 0 ||
      (project.description && project.description.trim().length > 20)
    );
  }).length;

  return {
    computedSkills,
    specializations,
    topSpecializationCount: sortedSkills[0]?.count || 0,
    repeatedSkillCount: sortedSkills.filter((entry) => entry.count >= 2).length,
    totalSkillMentions: sortedSkills.reduce((sum, entry) => sum + entry.count, 0),
    yearsExperience,
    projectCount: projects.length,
    evidenceBackedProjectCount,
    professionalExperienceCount: experiences.length,
    collaborationEvidenceCount,
    activeManualMonths,
    recentManualActivityScore,
    hasProfessionalEvidence: experiences.length > 0 || projects.length > 0 || hasManualSkillInputs,
  };
}

function extractExperiences(linkedinData: any): LinkedInExperience[] {
  return [
    ...safeArray<LinkedInExperience>(linkedinData.experiences),
    ...safeArray<LinkedInExperience>(linkedinData.positions),
    ...safeArray<LinkedInExperience>(linkedinData.work_history),
  ].filter((experience) => typeof experience === 'object' && experience !== null);
}

function extractProjects(otherPlatforms: any): ProjectEvidence[] {
  return [
    ...safeArray<ProjectEvidence>(otherPlatforms.projects),
    ...safeArray<ProjectEvidence>(otherPlatforms.portfolio),
    ...safeArray<ProjectEvidence>(otherPlatforms.work_samples),
  ].filter((project) => typeof project === 'object' && project !== null);
}

function addSkills(
  counts: Map<string, { label: string; count: number }>,
  skills: string[],
  weight = 1
): void {
  for (const skill of skills) {
    const normalized = normalizeSkill(skill);
    if (!normalized) {
      continue;
    }

    const existing = counts.get(normalized);
    const label = formatSkillLabel(skill);
    counts.set(normalized, {
      label: existing?.label || label,
      count: (existing?.count || 0) + weight,
    });
  }
}

function normalizeSkill(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function formatSkillLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function estimateYearsExperience(
  github: any,
  experiences: LinkedInExperience[],
  projects: ProjectEvidence[]
): number | null {
  const spans: number[] = [];

  const experienceSpan = computeSpanYears(
    experiences.map((experience) => [experience.start_date, experience.end_date])
  );
  if (experienceSpan !== null) {
    spans.push(experienceSpan);
  }

  const projectSpan = computeSpanYears(
    projects.map((project) => [project.start_date, project.end_date || project.updated_at])
  );
  if (projectSpan !== null) {
    spans.push(projectSpan);
  }

  if (github.created_at) {
    spans.push(yearsSince(github.created_at));
  }

  if (spans.length === 0) {
    return null;
  }

  return Math.max(1, Math.round(Math.max(...spans)));
}

function estimateActiveManualMonths(
  experiences: LinkedInExperience[],
  projects: ProjectEvidence[]
): number {
  const experienceMonths = computeSpanMonths(
    experiences.map((experience) => [experience.start_date, experience.end_date])
  );
  const projectMonths = computeSpanMonths(
    projects.map((project) => [project.start_date, project.end_date || project.updated_at])
  );

  return Math.max(experienceMonths, projectMonths);
}

function estimateManualRecencyScore(
  experiences: LinkedInExperience[],
  projects: ProjectEvidence[]
): number {
  const currentExperience = experiences.some((experience) => isCurrentRole(experience.end_date));
  const currentProject = projects.some((project) => isCurrentRole(project.end_date));

  if (currentExperience || currentProject) {
    return 100;
  }

  const mostRecentDate = latestDate([
    ...experiences.map((experience) => experience.end_date || experience.start_date),
    ...projects.map((project) => project.updated_at || project.end_date || project.start_date),
  ]);

  if (!mostRecentDate) {
    return 0;
  }

  const monthsAgo = monthsSinceDate(mostRecentDate);
  if (monthsAgo <= 1) return 95;
  if (monthsAgo <= 3) return 85;
  if (monthsAgo <= 6) return 70;
  if (monthsAgo <= 12) return 55;
  if (monthsAgo <= 24) return 35;
  return 20;
}

function computeReviewRecencyScore(reviews: Review[]): number {
  const now = Date.now();
  let score = 0;

  for (const review of reviews) {
    const createdAt = Date.parse(review.created_at);
    if (Number.isNaN(createdAt)) {
      continue;
    }

    const daysAgo = (now - createdAt) / (1000 * 60 * 60 * 24);
    if (daysAgo <= 30) score += 22;
    else if (daysAgo <= 90) score += 14;
    else if (daysAgo <= 180) score += 8;
    else if (daysAgo <= 365) score += 4;
  }

  return clampScore(score);
}

function computeSpanYears(ranges: Array<[string | undefined, string | undefined]>): number | null {
  const months = computeSpanMonths(ranges);
  if (months === 0) {
    return null;
  }

  return months / 12;
}

function computeSpanMonths(ranges: Array<[string | undefined, string | undefined]>): number {
  const timestamps = ranges.flatMap(([start, end]) => {
    const startTs = parseDate(start);
    const endTs = parseDate(end) || Date.now();
    return [startTs, endTs].filter((value): value is number => value !== null);
  });

  if (timestamps.length < 2) {
    return 0;
  }

  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);
  return Math.max(0, Math.round((latest - earliest) / (1000 * 60 * 60 * 24 * 30)));
}

function latestDate(values: Array<string | undefined>): string | null {
  const parsed = values
    .map((value) => parseDate(value))
    .filter((value): value is number => value !== null);

  if (parsed.length === 0) {
    return null;
  }

  return new Date(Math.max(...parsed)).toISOString();
}

function parseDate(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  if (/present|current|ongoing/i.test(value)) {
    return Date.now();
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isCurrentRole(value: string | undefined): boolean {
  return Boolean(value && /present|current|ongoing/i.test(value));
}

function monthsSinceDate(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 999;
  }

  return Math.max(0, Math.round((Date.now() - parsed) / (1000 * 60 * 60 * 24 * 30)));
}

function yearsSince(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, (Date.now() - parsed) / (1000 * 60 * 60 * 24 * 365));
}

function hasGitHubEvidence(github: any): boolean {
  return Boolean(
    safeArray<any>(github.repos).length > 0 ||
    safeArray<string>(github.languages).length > 0 ||
    Number(github.total_stars || 0) > 0 ||
    github.created_at ||
    github.contributions ||
    github.collaboration
  );
}

function applyStakeTranches(stakeAmount: number): number {
  const firstTranche = Math.min(stakeAmount, 100);
  const secondTranche = Math.min(Math.max(stakeAmount - 100, 0), 100) * 0.5;
  const remaining = Math.max(stakeAmount - 200, 0) * 0.25;
  return firstTranche + secondTranche + remaining;
}

function weightedAverage(sources: Array<{ score: number; weight: number }>): number {
  const totalWeight = sources.reduce((sum, source) => sum + source.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  return sources.reduce((sum, source) => sum + (source.score * source.weight), 0) / totalWeight;
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
