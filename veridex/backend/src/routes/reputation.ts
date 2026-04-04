import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { computeOverallScore } from '../services/scoring';
import {
  ensureWorkerProfile,
  mergeLinkedInData,
  mergeOtherPlatforms,
} from '../services/reputationProfile';
import { syncWorkerReputation } from '../services/reputationIngestion';

const router = Router();

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

function normalizeGithubUsername(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * POST /api/reputation/evidence
 * Save manual reputation evidence that the scoring engine can use immediately.
 */
router.post('/evidence', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      userId,
      github_username,
      linkedin_data,
      projects,
      other_platforms,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const nextGithubUsername = normalizeGithubUsername(github_username);
    const hasPayload =
      nextGithubUsername !== undefined ||
      linkedin_data !== undefined ||
      projects !== undefined ||
      other_platforms !== undefined;

    if (!hasPayload) {
      return res.status(400).json({ error: 'No evidence payload provided' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await ensureWorkerProfile(userId);

    const mergedLinkedInData = linkedin_data !== undefined
      ? mergeLinkedInData(profile.linkedin_data, linkedin_data)
      : (profile.linkedin_data || {});

    const mergedOtherPlatforms = mergeOtherPlatforms(
      profile.other_platforms,
      {
        ...(other_platforms || {}),
        ...(projects !== undefined ? { projects } : {}),
      }
    );

    const githubUsernameToStore = nextGithubUsername !== undefined
      ? nextGithubUsername
      : profile.github_username;

    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('worker_id', userId)
      .eq('status', 'active');

    const scoreResult = await computeOverallScore(
      {
        githubData: profile.github_data,
        linkedinData: mergedLinkedInData,
        otherPlatforms: mergedOtherPlatforms,
      },
      reviews || []
    );

    const { data: updatedProfile, error: updateError } = await supabase
      .from('worker_profiles')
      .update({
        github_username: githubUsernameToStore,
        linkedin_data: mergedLinkedInData,
        other_platforms: mergedOtherPlatforms,
        computed_skills: scoreResult.computed_skills,
        specializations: scoreResult.specializations,
        years_experience: scoreResult.years_experience,
        overall_trust_score: scoreResult.overall,
        score_components: scoreResult.components,
        ingestion_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (updateError || !updatedProfile) {
      throw updateError || new Error('Failed to update worker profile');
    }

    return res.json({
      success: true,
      profile: updatedProfile,
      warning: githubUsernameToStore && !hasMeaningfulData(profile.github_data)
        ? 'GitHub username saved. Trigger /api/reputation/ingest after OAuth completes to sync repository data.'
        : null,
    });
  } catch (error) {
    console.error('Reputation evidence error:', error);
    return res.status(500).json({ error: 'Failed to save reputation evidence' });
  }
});

/**
 * POST /api/reputation/ingest
 * Trigger GitHub data ingestion and score computation for a user
 */
router.post('/ingest', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const { scoreResult, warning } = await syncWorkerReputation(userId);

    return res.json({
      success: true,
      overall_trust_score: scoreResult.overall,
      score_components: scoreResult.components,
      computed_skills: scoreResult.computed_skills,
      specializations: scoreResult.specializations,
      years_experience: scoreResult.years_experience,
      warning,
    });
  } catch (error) {
    console.error('Reputation ingest error:', error);
    const message = error instanceof Error ? error.message : 'Ingestion failed';
    const statusCode = /No reputation evidence found/i.test(message) ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }
});

/**
 * GET /api/reputation/:userId
 * Get computed reputation profile for a user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user and worker profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*, worker_profiles(*)')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, reviewer:reviewer_id(id, display_name, world_id_hash)')
      .eq('worker_id', userId)
      .eq('status', 'active')
      .order('stake_amount', { ascending: false });

    // Get total stakes
    const { data: stakes } = await supabase
      .from('stakes')
      .select('amount')
      .eq('worker_id', userId)
      .eq('status', 'active');

    const totalStaked = stakes?.reduce((sum, s) => sum + s.amount, 0) || 0;
    const stakerCount = stakes?.length || 0;

    return res.json({
      user,
      profile: user.worker_profiles,
      reviews: reviews || [],
      totalStaked,
      stakerCount,
    });
  } catch (error) {
    console.error('Get reputation error:', error);
    return res.status(500).json({ error: 'Failed to get reputation' });
  }
});

export default router;
