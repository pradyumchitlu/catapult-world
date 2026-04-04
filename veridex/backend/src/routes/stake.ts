import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';

const router = Router();

/**
 * POST /api/stake
 * Stake WLD on a worker
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId, amount } = req.body;
    const stakerId = req.userId!;

    if (!workerId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid stake data' });
    }

    // Get staker's balance
    const { data: staker, error: stakerError } = await supabase
      .from('users')
      .select('wld_balance')
      .eq('id', stakerId)
      .single();

    if (stakerError || !staker) {
      return res.status(404).json({ error: 'Staker not found' });
    }

    if (staker.wld_balance < amount) {
      return res.status(400).json({ error: 'Insufficient WLD balance' });
    }

    // Verify worker exists
    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', workerId)
      .single();

    if (workerError || !worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Create stake and deduct balance in a transaction
    // Note: Supabase doesn't support transactions directly, so we do sequential updates
    // In production, use a stored procedure for atomicity

    // Deduct from staker balance
    const { error: deductError } = await supabase
      .from('users')
      .update({ wld_balance: staker.wld_balance - amount })
      .eq('id', stakerId);

    if (deductError) {
      throw deductError;
    }

    // Create stake record
    const { data: stake, error: stakeError } = await supabase
      .from('stakes')
      .insert({
        staker_id: stakerId,
        worker_id: workerId,
        amount,
        status: 'active',
      })
      .select()
      .single();

    if (stakeError) {
      // Rollback balance deduction
      await supabase
        .from('users')
        .update({ wld_balance: staker.wld_balance })
        .eq('id', stakerId);
      throw stakeError;
    }

    return res.json({
      success: true,
      stake,
      new_balance: staker.wld_balance - amount,
    });
  } catch (error) {
    console.error('Stake error:', error);
    return res.status(500).json({ error: 'Staking failed' });
  }
});

/**
 * GET /api/stake/:userId
 * Get stakes for a user (as staker)
 */
router.get('/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Get stakes with worker info
    const { data: stakes, error } = await supabase
      .from('stakes')
      .select(`
        *,
        worker:worker_id(
          id,
          display_name,
          worker_profiles(overall_trust_score, score_components)
        )
      `)
      .eq('staker_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate yields (placeholder - in production this would be based on score changes)
    const stakesWithYield = (stakes || []).map((stake) => ({
      ...stake,
      yield_earned: 0, // TODO: Calculate based on score change since stake
      score_trend: 'stable', // TODO: Calculate based on recent score history
    }));

    return res.json({ stakes: stakesWithYield });
  } catch (error) {
    console.error('Get stakes error:', error);
    return res.status(500).json({ error: 'Failed to get stakes' });
  }
});

/**
 * POST /api/stake/withdraw
 * Withdraw a stake
 */
router.post('/withdraw', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stakeId } = req.body;
    const stakerId = req.userId!;

    if (!stakeId) {
      return res.status(400).json({ error: 'Missing stakeId' });
    }

    // Get stake
    const { data: stake, error: stakeError } = await supabase
      .from('stakes')
      .select('*')
      .eq('id', stakeId)
      .eq('staker_id', stakerId)
      .eq('status', 'active')
      .single();

    if (stakeError || !stake) {
      return res.status(404).json({ error: 'Stake not found' });
    }

    // TODO: Check lock period (7 days from creation)
    // const lockEnd = new Date(stake.created_at);
    // lockEnd.setDate(lockEnd.getDate() + 7);
    // if (new Date() < lockEnd) {
    //   return res.status(400).json({ error: 'Stake is still locked' });
    // }

    // Get staker's current balance
    const { data: staker } = await supabase
      .from('users')
      .select('wld_balance')
      .eq('id', stakerId)
      .single();

    // Mark stake as withdrawn and return balance
    await supabase
      .from('stakes')
      .update({ status: 'withdrawn' })
      .eq('id', stakeId);

    await supabase
      .from('users')
      .update({ wld_balance: (staker?.wld_balance || 0) + stake.amount })
      .eq('id', stakerId);

    return res.json({
      success: true,
      returned_amount: stake.amount,
    });
  } catch (error) {
    console.error('Withdraw stake error:', error);
    return res.status(500).json({ error: 'Withdrawal failed' });
  }
});

export default router;
