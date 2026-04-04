import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { fetchUserProfile, fetchContributionHistory, fetchCollaborationSignals } from '../services/github';
import { computeOverallScore } from '../services/scoring';

const router = Router();

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

    // Get worker profile
    const { data: profile, error: profileError } = await supabase
      .from('worker_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    if (!profile.github_username) {
      return res.status(400).json({ error: 'No GitHub username connected' });
    }

    // Update status to processing
    await supabase
      .from('worker_profiles')
      .update({ ingestion_status: 'processing' })
      .eq('id', profile.id);

    try {
      // Fetch GitHub data
      const [userProfile, contributions, collaboration] = await Promise.all([
        fetchUserProfile(profile.github_username),
        fetchContributionHistory(profile.github_username),
        fetchCollaborationSignals(profile.github_username),
      ]);

      const githubData = {
        ...userProfile,
        contributions,
        collaboration,
      };

      // Get reviews for this worker
      const { data: reviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('worker_id', userId)
        .eq('status', 'active');

      // Compute scores
      const scoreResult = await computeOverallScore(
        { githubData, linkedinData: profile.linkedin_data },
        reviews || []
      );

      // Update profile with new data and scores
      await supabase
        .from('worker_profiles')
        .update({
          github_data: githubData,
          computed_skills: scoreResult.computed_skills,
          overall_trust_score: scoreResult.overall,
          score_components: scoreResult.components,
          ingestion_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      return res.json({
        success: true,
        overall_trust_score: scoreResult.overall,
        score_components: scoreResult.components,
      });
    } catch (ingestionError) {
      // Mark as failed
      await supabase
        .from('worker_profiles')
        .update({ ingestion_status: 'failed' })
        .eq('id', profile.id);

      throw ingestionError;
    }
  } catch (error) {
    console.error('Reputation ingest error:', error);
    return res.status(500).json({ error: 'Ingestion failed' });
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
