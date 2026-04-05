import { Router, Response } from 'express';
import supabase from '../lib/supabase';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { getUserAgentDashboardData } from '../services/agent';

const router = Router();

/**
 * GET /api/trust/:veridexId
 * External API to query a user's trust score
 */
router.get('/trust/:veridexId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { veridexId } = req.params;

    // Get user and worker profile
    const { data: user, error } = await supabase
      .from('users')
      .select('id, world_id_hash, display_name, roles, profession_category, worker_profiles(*)')
      .eq('id', veridexId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = (user as any).worker_profiles;
    const baseOverallTrustScore = Number(profile?.overall_trust_score || 0);
    const agentData = await getUserAgentDashboardData(veridexId, baseOverallTrustScore);
    const groupedScores = profile?.score_components?.grouped_scores || {
      evidence: 0,
      employer: 0,
      staking: 0,
      veridex: agentData.summary.effective_user_score,
    };

    // Get total stakes
    const { data: stakes } = await supabase
      .from('stakes')
      .select('amount_eth')
      .eq('worker_id', veridexId)
      .eq('status', 'active');

    // Get review stats
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('worker_id', veridexId)
      .eq('status', 'active');

    const totalStaked = stakes?.reduce((sum, s) => sum + Number(s.amount_eth || 0), 0) || 0;
    const safeReviews = reviews || [];
    const reviewCount = safeReviews.length || 0;
    const avgRating = reviewCount > 0
      ? safeReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

    // Log the query
    await supabase.from('query_log').insert({
      worker_id: veridexId,
      querier_id: req.userId || null,
      querier_info: req.headers['x-api-client'] || 'unknown',
      query_type: 'api_query',
    });

    return res.json({
      veridex_id: veridexId,
      display_name: user.display_name,
      is_verified_human: true, // Always true if they have an account
      veridex_score: agentData.summary.effective_user_score,
      overall_trust_score: agentData.summary.effective_user_score,
      base_overall_trust_score: baseOverallTrustScore,
      agent_penalty_score: agentData.summary.agent_penalty_score,
      score_summary: groupedScores,
      score_components: profile?.score_components || {},
      total_staked: totalStaked,
      review_count: reviewCount,
      avg_rating: avgRating,
      profession_category: user.profession_category,
      skills: profile?.computed_skills || [],
      specializations: profile?.specializations || [],
      years_experience: profile?.years_experience ?? null,
    });
  } catch (error) {
    console.error('Trust query error:', error);
    return res.status(500).json({ error: 'Query failed' });
  }
});

export default router;
