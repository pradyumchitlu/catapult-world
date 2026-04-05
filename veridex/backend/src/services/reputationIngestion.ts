import supabase from '../lib/supabase';
import {
  fetchGitHubSignals,
} from './github';
import { computeOverallScore, type ScoreResult } from './scoring';
import { ensureWorkerProfile, type WorkerProfileRecord } from './reputationProfile';
import { loadReputationScoringInputs } from './reputationScoreInputs';

type JsonRecord = Record<string, any>;

export interface SyncWorkerReputationOptions {
  presetGithubUsername?: string | null;
  presetGithubData?: JsonRecord;
  githubAccessToken?: string;
  refreshGithub?: boolean;
}

export interface SyncWorkerReputationResult {
  profile: WorkerProfileRecord;
  scoreResult: ScoreResult;
  warning: string | null;
}

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeJson(existing: JsonRecord, incoming: JsonRecord): JsonRecord {
  const merged: JsonRecord = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      merged[key] = value;
      continue;
    }

    if (isPlainObject(value) && isPlainObject(existing[key])) {
      merged[key] = mergeJson(existing[key], value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function sanitizeGithubData(value: JsonRecord): JsonRecord {
  const sanitized = { ...value };
  delete sanitized.access_token;
  delete sanitized.refresh_token;
  delete sanitized.token;
  return sanitized;
}

function hasMeaningfulData(value: unknown): boolean {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasMeaningfulData);
  }

  return true;
}

export async function syncWorkerReputation(
  userId: string,
  options: SyncWorkerReputationOptions = {}
): Promise<SyncWorkerReputationResult> {
  const profile = await ensureWorkerProfile(userId);

  await supabase
    .from('worker_profiles')
    .update({
      ingestion_status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  try {
    const { reviews, stakes, employerReviews } = await loadReputationScoringInputs(userId);

    const githubUsername = options.presetGithubUsername !== undefined
      ? options.presetGithubUsername
      : profile.github_username;
    const shouldRefreshGithub = options.refreshGithub !== false;

    const hasManualEvidence =
      hasMeaningfulData(profile.linkedin_data) || hasMeaningfulData(profile.other_platforms);
    const hasReviewEvidence = reviews.length > 0;
    const hasStakeEvidence = stakes.length > 0;

    let githubData = sanitizeGithubData(
      mergeJson(profile.github_data || {}, options.presetGithubData || {})
    );
    let warning: string | null = null;

    if (githubUsername && shouldRefreshGithub) {
      try {
        const { userProfile, contributions, collaboration } = await fetchGitHubSignals(
          githubUsername,
          { accessToken: options.githubAccessToken }
        );

        githubData = sanitizeGithubData(mergeJson(githubData, {
          ...userProfile,
          contributions,
          collaboration,
        }));
      } catch (githubError) {
        if (!hasMeaningfulData(githubData) && !hasManualEvidence && !hasReviewEvidence) {
          throw githubError;
        }

        warning = 'GitHub refresh failed, but the score was recomputed from cached OAuth or manual evidence.';
        console.error('GitHub refresh warning:', githubError);
      }
    } else if (!hasMeaningfulData(githubData) && !hasManualEvidence && !hasReviewEvidence && !hasStakeEvidence) {
      throw new Error('No reputation evidence found. Connect GitHub or upload LinkedIn/project data first.');
    }

    const scoreResult = await computeOverallScore(
      {
        githubData,
        linkedinData: profile.linkedin_data,
        otherPlatforms: profile.other_platforms,
      },
      reviews,
      stakes,
      employerReviews
    );

    const { data: updatedProfile, error: updateError } = await supabase
      .from('worker_profiles')
      .update({
        github_username: githubUsername,
        github_data: githubData,
        computed_skills: scoreResult.computed_skills,
        specializations: scoreResult.specializations,
        years_experience: scoreResult.years_experience,
        overall_trust_score: scoreResult.overall,
        score_components: {
          ...scoreResult.components,
          grouped_scores: scoreResult.groupedScores,
        },
        ingestion_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (updateError || !updatedProfile) {
      throw updateError || new Error('Failed to update worker profile');
    }

    return {
      profile: updatedProfile as WorkerProfileRecord,
      scoreResult,
      warning,
    };
  } catch (error) {
    await supabase
      .from('worker_profiles')
      .update({
        ingestion_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    throw error;
  }
}
