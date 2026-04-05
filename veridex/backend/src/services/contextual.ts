import { parseJobRequirements, generateContextualEvaluation } from './gemini';

export interface ContextualScoreBreakdown {
  met: { requirement: string; evidence: string }[];
  partial: { requirement: string; evidence: string; gap: string }[];
  missing: { requirement: string }[];
}

export interface ContextualScoreResult {
  fit_score: number;
  breakdown: ContextualScoreBreakdown;
  parsed_requirements: any;
}

interface WorkerData {
  profile: any;
  reviews: any[];
}

/**
 * Compute contextual fit score for a worker against a job description
 *
 * Process:
 * 1. Parse job description into structured requirements via LLM
 * 2. Algorithmic matching for hard skills (languages, frameworks)
 * 3. LLM evaluation for subjective fit (experience depth, project relevance)
 * 4. Return evidence-based breakdown
 */
export async function computeContextualScore(
  workerData: WorkerData,
  jobDescription: string
): Promise<ContextualScoreResult> {
  const { profile, reviews } = workerData;

  // Step 1: Parse job requirements
  const requirements = await parseJobRequirements(jobDescription);

  // Step 2: Algorithmic matching for hard skills
  const skillsMatch = matchHardSkills(profile, requirements);

  // Step 3: LLM evaluation for subjective fit
  const llmEvaluation = await generateContextualEvaluation(
    {
      skills: profile.computed_skills || [],
      github_data: profile.github_data,
      overall_trust_score: profile.overall_trust_score,
      score_components: profile.score_components,
      reviews: reviews.map((r: any) => ({
        rating: r.rating,
        content: r.content,
        job_category: r.job_category,
        stake_amount: r.stake_amount,
      })),
    },
    requirements
  );

  // Combine results
  const breakdown: ContextualScoreBreakdown = {
    met: [...skillsMatch.met, ...llmEvaluation.met],
    partial: [...skillsMatch.partial, ...llmEvaluation.partial],
    missing: [...skillsMatch.missing, ...llmEvaluation.missing],
  };

  // Calculate fit score
  const totalRequirements = breakdown.met.length + breakdown.partial.length + breakdown.missing.length;
  const fitScore = totalRequirements > 0
    ? Math.round(
        ((breakdown.met.length * 100) + (breakdown.partial.length * 50)) / totalRequirements
      )
    : 50;

  return {
    fit_score: fitScore,
    breakdown,
    parsed_requirements: requirements,
  };
}

/**
 * Match hard skills from profile against requirements
 */
function matchHardSkills(
  profile: any,
  requirements: any
): ContextualScoreBreakdown {
  const result: ContextualScoreBreakdown = {
    met: [],
    partial: [],
    missing: [],
  };

  const workerSkills = new Set<string>(
    ((profile.computed_skills || []) as string[]).map((s: string) => s.toLowerCase())
  );

  const githubLanguages = new Set<string>(
    ((profile.github_data?.languages || []) as string[]).map((l: string) => l.toLowerCase())
  );

  // Check required skills
  const requiredSkills = requirements.required_skills || [];
  for (const skill of requiredSkills) {
    const skillLower = skill.toLowerCase();

    if (workerSkills.has(skillLower) || githubLanguages.has(skillLower)) {
      // Find evidence
      let evidence = `Listed in profile skills`;

      // Check GitHub repos for depth
      const repos = profile.github_data?.repos || [];
      const relevantRepos = repos.filter((r: any) =>
        r.language?.toLowerCase() === skillLower ||
        r.topics?.some((t: string) => t.toLowerCase().includes(skillLower))
      );

      if (relevantRepos.length > 0) {
        const years = calculateYearsFromRepos(relevantRepos);
        evidence = `${relevantRepos.length} repos over ${years} years`;
      }

      result.met.push({ requirement: skill, evidence });
    } else if (hasPartialMatch(skill, workerSkills, githubLanguages)) {
      result.partial.push({
        requirement: skill,
        evidence: 'Related skills found',
        gap: `Direct ${skill} experience not evident`,
      });
    } else {
      result.missing.push({ requirement: skill });
    }
  }

  return result;
}

function calculateYearsFromRepos(repos: any[]): number {
  if (repos.length === 0) return 0;

  const dates = repos.map((r) => new Date(r.created_at || r.updated_at).getTime());
  const earliest = Math.min(...dates);
  const latest = Math.max(...dates);

  return Math.max(1, Math.round((latest - earliest) / (365 * 24 * 60 * 60 * 1000)));
}

function hasPartialMatch(
  skill: string,
  workerSkills: Set<string>,
  githubLanguages: Set<string>
): boolean {
  const skillLower = skill.toLowerCase();

  // Check for related skills
  const relatedSkillsMap: Record<string, string[]> = {
    react: ['javascript', 'typescript', 'frontend', 'web'],
    node: ['javascript', 'typescript', 'backend', 'express'],
    python: ['django', 'flask', 'fastapi', 'data'],
    typescript: ['javascript', 'node', 'frontend'],
    aws: ['cloud', 'devops', 'infrastructure'],
    docker: ['kubernetes', 'devops', 'containers'],
    postgresql: ['sql', 'database', 'mysql'],
  };

  const related = relatedSkillsMap[skillLower] || [];
  return related.some((r) => workerSkills.has(r) || githubLanguages.has(r));
}
