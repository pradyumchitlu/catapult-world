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
    const { worker_id, rating, content, job_category, stake_amount, contract_id } = req.body;
    const reviewerId = req.userId!;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid review data' });
    }

    let resolvedWorkerId = worker_id;
    let isFlagged = false;
    let flagReason: string | null = null;
    const stakeAmount = stake_amount || 0;

    // Contract-based review: validate contract ownership and state
    if (contract_id) {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contract_id)
        .single();

      if (contractError || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      if (contract.employer_id !== reviewerId) {
        return res.status(403).json({ error: 'Only the employer can review this contract' });
      }

      if (contract.status !== 'completed') {
        return res.status(400).json({ error: `Contract is ${contract.status}, expected completed` });
      }

      // Check if already reviewed
      const { data: existingContractReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('contract_id', contract_id)
        .single();

      if (existingContractReview) {
        return res.status(400).json({ error: 'This contract has already been reviewed' });
      }

      resolvedWorkerId = contract.worker_id;
    }

    if (!resolvedWorkerId) {
      return res.status(400).json({ error: 'Missing worker_id or contract_id' });
    }

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
      .eq('id', resolvedWorkerId)
      .single();

    if (workerError || !worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // For non-contract reviews, check for duplicates and mutual reviews
    if (!contract_id) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', reviewerId)
        .eq('worker_id', resolvedWorkerId)
        .eq('status', 'active')
        .single();

      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this worker' });
      }

      const { data: mutualReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', resolvedWorkerId)
        .eq('worker_id', reviewerId)
        .eq('status', 'active')
        .single();

      isFlagged = !!mutualReview;
      flagReason = mutualReview ? 'mutual_review_detected' : null;
    }

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
        worker_id: resolvedWorkerId,
        rating,
        content,
        job_category,
        stake_amount: stakeAmount,
        reviewer_trust_score_at_time: reviewerTrustScore,
        is_flagged: isFlagged,
        flag_reason: flagReason,
        status: 'active',
        contract_id: contract_id || null,
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

    // Auto-close contract after review
    if (contract_id) {
      await supabase
        .from('contracts')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', contract_id);
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
