import { Router, Response } from 'express';
import { AuthenticatedRequest, optionalAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { computeContextualScore } from '../services/contextual';

const router = Router();

/**
 * POST /api/contextual-score
 * Generate a contextual fit score for a worker against a job description
 */
router.post('/contextual-score', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { worker_id, job_description } = req.body;

    if (!worker_id || !job_description) {
      return res.status(400).json({ error: 'Missing worker_id or job_description' });
    }

    // Get worker profile
    const { data: profile, error: profileError } = await supabase
      .from('worker_profiles')
      .select('*, user:user_id(display_name)')
      .eq('user_id', worker_id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    // Get worker's reviews for additional context
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('worker_id', worker_id)
      .eq('status', 'active');

    // Compute contextual score
    const result = await computeContextualScore(
      {
        profile,
        reviews: reviews || [],
      },
      job_description
    );

    // Cache the result
    await supabase.from('contextual_scores').insert({
      worker_id,
      requester_id: req.userId || null,
      job_description,
      parsed_requirements: result.parsed_requirements,
      fit_score: result.fit_score,
      score_breakdown: result.breakdown,
    });

    // Log the query
    await supabase.from('query_log').insert({
      worker_id,
      querier_id: req.userId || null,
      querier_info: req.headers['x-api-client'] || 'web',
      query_type: 'contextual_score',
    });

    return res.json({
      fit_score: result.fit_score,
      breakdown: result.breakdown,
      worker_name: (profile as any).user?.display_name,
      overall_trust_score: profile.overall_trust_score,
    });
  } catch (error) {
    console.error('Contextual score error:', error);
    return res.status(500).json({ error: 'Failed to compute contextual score' });
  }
});

export default router;
