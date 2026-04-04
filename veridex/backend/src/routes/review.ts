import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { computeOverallScore } from '../services/scoring';
import { ensureWorkerProfile } from '../services/reputationProfile';

const router = Router();

/**
 * POST /api/review
 * Leave a staked review for a worker
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { worker_id, rating, content, job_category, stake_amount } = req.body;
    const reviewerId = req.userId!;

    // Validate input
    if (!worker_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid review data' });
    }

    const stakeAmount = stake_amount || 0;

    // Get reviewer's balance and trust score
    const { data: reviewer, error: reviewerError } = await supabase
      .from('users')
      .select('wld_balance, worker_profiles(overall_trust_score)')
      .eq('id', reviewerId)
      .single();

    if (reviewerError || !reviewer) {
      return res.status(404).json({ error: 'Reviewer not found' });
    }

    if (stakeAmount > 0 && reviewer.wld_balance < stakeAmount) {
      return res.status(400).json({ error: 'Insufficient WLD balance' });
    }

    // Verify worker exists
    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', worker_id)
      .single();

    if (workerError || !worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Check for existing review from this reviewer
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', reviewerId)
      .eq('worker_id', worker_id)
      .eq('status', 'active')
      .single();

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this worker' });
    }

    // Check for mutual review (integrity mechanism)
    const { data: mutualReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', worker_id)
      .eq('worker_id', reviewerId)
      .eq('status', 'active')
      .single();

    const isFlagged = !!mutualReview;
    const flagReason = mutualReview ? 'mutual_review_detected' : null;

    // Deduct stake from reviewer if applicable
    if (stakeAmount > 0) {
      await supabase
        .from('users')
        .update({ wld_balance: reviewer.wld_balance - stakeAmount })
        .eq('id', reviewerId);
    }

    // Get reviewer's trust score
    const reviewerProfile = (reviewer as any).worker_profiles;
    const reviewerTrustScore = reviewerProfile?.overall_trust_score || 0;

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        reviewer_id: reviewerId,
        worker_id,
        rating,
        content,
        job_category,
        stake_amount: stakeAmount,
        reviewer_trust_score_at_time: reviewerTrustScore,
        is_flagged: isFlagged,
        flag_reason: flagReason,
        status: 'active',
      })
      .select()
      .single();

    if (reviewError) {
      // Rollback stake deduction
      if (stakeAmount > 0) {
        await supabase
          .from('users')
          .update({ wld_balance: reviewer.wld_balance })
          .eq('id', reviewerId);
      }
      throw reviewError;
    }

    // Trigger score recomputation for the worker
    // TODO: This should be done asynchronously in production
    try {
      const workerProfile = await ensureWorkerProfile(worker_id);

      const { data: allReviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('worker_id', worker_id)
        .eq('status', 'active');

      if (workerProfile) {
        const scoreResult = await computeOverallScore(
          {
            githubData: workerProfile.github_data,
            linkedinData: workerProfile.linkedin_data,
            otherPlatforms: workerProfile.other_platforms,
          },
          allReviews || []
        );

        await supabase
          .from('worker_profiles')
          .update({
            computed_skills: scoreResult.computed_skills,
            specializations: scoreResult.specializations,
            years_experience: scoreResult.years_experience,
            overall_trust_score: scoreResult.overall,
            score_components: scoreResult.components,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', worker_id);
      }
    } catch (scoreError) {
      console.error('Score recomputation error:', scoreError);
      // Don't fail the review creation if score recomputation fails
    }

    return res.json({
      success: true,
      review,
      warning: isFlagged ? 'This review has been flagged for mutual reviewing' : null,
    });
  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({ error: 'Failed to create review' });
  }
});

/**
 * GET /api/review/:workerId
 * Get reviews for a worker
 */
router.get('/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id(id, display_name)
      `)
      .eq('worker_id', workerId)
      .eq('status', 'active')
      .order('stake_amount', { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({ reviews: reviews || [] });
  } catch (error) {
    console.error('Get reviews error:', error);
    return res.status(500).json({ error: 'Failed to get reviews' });
  }
});

export default router;
