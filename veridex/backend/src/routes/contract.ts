import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { calculateBuyIn, prepareCompletionSettlement, processCompletion } from '../services/contractPayment';
import { getWorldUserOperationStatus } from '../services/worldUserOperation';

const router = Router();

/**
 * GET /api/contract/estimate
 * Preview buy-in cost for hiring a worker at a given salary.
 * Query params: worker_id, salary
 */
router.get('/estimate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.query.worker_id as string;
    const salary = parseInt(req.query.salary as string);

    if (!workerId || !salary || salary <= 0) {
      return res.status(400).json({ error: 'Missing worker_id or salary' });
    }

    const breakdown = await calculateBuyIn(workerId, salary);
    return res.json(breakdown);
  } catch (error) {
    console.error('Estimate error:', error);
    return res.status(500).json({ error: 'Failed to estimate buy-in' });
  }
});

/**
 * POST /api/contract
 * Create a new contract (draft). payment_amount = salary the worker will receive.
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { worker_id, title, description, payment_amount, duration_days } = req.body;
    const employerId = req.userId!;

    if (!worker_id || !title || !payment_amount || payment_amount <= 0) {
      return res.status(400).json({ error: 'Missing required fields: worker_id, title, payment_amount' });
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

    // Calculate buy-in so employer can see cost before activating
    const buyIn = await calculateBuyIn(worker_id, payment_amount);

    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        employer_id: employerId,
        worker_id,
        title,
        description: description || null,
        payment_amount,
        duration_days: duration_days || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, contract, buyIn });
  } catch (error) {
    console.error('Create contract error:', error);
    return res.status(500).json({ error: 'Failed to create contract' });
  }
});

/**
 * PUT /api/contract/:id/activate
 * Activate a draft contract — calculates the payout breakdown and starts the work period.
 * buy_in = salary + staker_reward + platform_fee
 */
router.put('/:id/activate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employerId = req.userId!;

    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .eq('employer_id', employerId)
      .single();

    if (fetchError || !contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status !== 'draft') {
      return res.status(400).json({ error: `Contract is ${contract.status}, expected draft` });
    }

    // Calculate payout totals at activation time so both parties see the expected economics.
    const buyIn = await calculateBuyIn(contract.worker_id, contract.payment_amount);

    const { data: updated, error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'active',
        buy_in_amount: buyIn.totalBuyIn,
        staker_payout_total: buyIn.stakerReward,
        platform_fee: buyIn.platformFee,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({
      success: true,
      contract: updated,
      buyIn,
    });
  } catch (error) {
    console.error('Activate contract error:', error);
    return res.status(500).json({ error: 'Failed to activate contract' });
  }
});

/**
 * PUT /api/contract/:id/submit
 * Worker marks their work as done — moves contract to 'submitted'
 */
router.put('/:id/submit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const workerId = req.userId!;

    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .eq('worker_id', workerId)
      .single();

    if (fetchError || !contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status !== 'active') {
      return res.status(400).json({ error: `Contract is ${contract.status}, expected active` });
    }

    const { data: updated, error: updateError } = await supabase
      .from('contracts')
      .update({ status: 'submitted' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({ success: true, contract: updated });
  } catch (error) {
    console.error('Submit contract error:', error);
    return res.status(500).json({ error: 'Failed to submit contract' });
  }
});

/**
 * GET /api/contract/:id/settlement
 * Build the current payout plan for a submitted contract.
 */
router.get('/:id/settlement', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employerId = req.userId!;

    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .eq('employer_id', employerId)
      .single();

    if (fetchError || !contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status !== 'submitted') {
      return res.status(400).json({ error: `Contract is ${contract.status}, expected submitted` });
    }

    const settlement = await prepareCompletionSettlement(id);

    return res.json({ settlement });
  } catch (error) {
    console.error('Get contract settlement error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to prepare settlement' });
  }
});

/**
 * PUT /api/contract/:id/complete
 * Employer approves submitted work after an on-chain World App payout.
 */
router.put('/:id/complete', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employerId = req.userId!;
    const userWalletAddress = typeof req.user?.wallet_address === 'string' ? req.user.wallet_address.trim() : '';
    const userOpHash = typeof req.body?.user_op_hash === 'string' ? req.body.user_op_hash.trim() : '';
    const fromWalletAddress = typeof req.body?.from_wallet_address === 'string'
      ? req.body.from_wallet_address.trim()
      : '';
    const transactionHash = typeof req.body?.transaction_hash === 'string'
      ? req.body.transaction_hash.trim()
      : '';

    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .eq('employer_id', employerId)
      .single();

    if (fetchError || !contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status !== 'submitted') {
      return res.status(400).json({ error: `Contract is ${contract.status}, expected submitted` });
    }

    if (!userWalletAddress) {
      return res.status(400).json({ error: 'Link your payout wallet before completing a contract' });
    }

    if (!userOpHash || !fromWalletAddress) {
      return res.status(400).json({
        error: 'user_op_hash and from_wallet_address are required to finalize an on-chain contract payout',
      });
    }

    if (fromWalletAddress.toLowerCase() !== userWalletAddress.toLowerCase()) {
      return res.status(400).json({ error: 'The payout wallet does not match the employer wallet linked to this account' });
    }

    const userOpStatus = await getWorldUserOperationStatus(userOpHash);
    if (userOpStatus.transactionStatus !== 'mined' || !userOpStatus.transactionHash) {
      return res.status(400).json({ error: 'The World App payout has not been mined yet' });
    }

    if (transactionHash && userOpStatus.transactionHash.toLowerCase() !== transactionHash.toLowerCase()) {
      return res.status(400).json({ error: 'The supplied transaction hash does not match the mined user operation' });
    }

    if (userOpStatus.sender && userOpStatus.sender.toLowerCase() !== userWalletAddress.toLowerCase()) {
      return res.status(400).json({ error: 'The mined user operation was sent from a different wallet' });
    }

    const settlement = await prepareCompletionSettlement(id);
    const paymentResult = await processCompletion(id, settlement);

    const { data: updated } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    return res.json({
      success: true,
      contract: updated,
      payment: paymentResult,
      settlement,
      proof: {
        user_op_hash: userOpHash,
        transaction_hash: userOpStatus.transactionHash,
        from_wallet_address: fromWalletAddress,
      },
    });
  } catch (error) {
    console.error('Complete contract error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to complete contract' });
  }
});

/**
 * PUT /api/contract/:id/close
 * Close a completed contract (after review or if employer skips review)
 */
router.put('/:id/close', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employerId = req.userId!;

    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .eq('employer_id', employerId)
      .single();

    if (fetchError || !contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status !== 'completed') {
      return res.status(400).json({ error: `Contract is ${contract.status}, expected completed` });
    }

    const { data: updated, error } = await supabase
      .from('contracts')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, contract: updated });
  } catch (error) {
    console.error('Close contract error:', error);
    return res.status(500).json({ error: 'Failed to close contract' });
  }
});

/**
 * GET /api/contract/employer
 * Get all contracts for the authenticated user as employer
 */
router.get('/employer', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employerId = req.userId!;

    const { data: contracts, error } = await supabase
      .from('contracts')
      .select(`
        *,
        worker:worker_id(id, display_name, profession_category,
          worker_profiles(overall_trust_score)
        )
      `)
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Check which contracts have reviews
    const contractIds = (contracts || []).map((c) => c.id);
    const { data: reviews } = await supabase
      .from('reviews')
      .select('contract_id')
      .in('contract_id', contractIds.length > 0 ? contractIds : ['none']);

    const reviewedIds = new Set((reviews || []).map((r) => r.contract_id));

    const enriched = (contracts || []).map((c) => ({
      ...c,
      has_review: reviewedIds.has(c.id),
    }));

    return res.json({ contracts: enriched });
  } catch (error) {
    console.error('Get employer contracts error:', error);
    return res.status(500).json({ error: 'Failed to get contracts' });
  }
});

/**
 * GET /api/contract/worker
 * Get all contracts for the authenticated user as worker
 */
router.get('/worker', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.userId!;

    const { data: contracts, error } = await supabase
      .from('contracts')
      .select(`
        *,
        employer:employer_id(id, display_name)
      `)
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ contracts: contracts || [] });
  } catch (error) {
    console.error('Get worker contracts error:', error);
    return res.status(500).json({ error: 'Failed to get contracts' });
  }
});

/**
 * GET /api/contract/:id
 * Get a single contract with payment details
 */
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        *,
        worker:worker_id(id, display_name, profession_category),
        employer:employer_id(id, display_name)
      `)
      .eq('id', id)
      .single();

    if (error || !contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.employer_id !== userId && contract.worker_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this contract' });
    }

    let payments: any[] = [];
    if (contract.status === 'completed' || contract.status === 'closed') {
      const { data } = await supabase
        .from('contract_payments')
        .select('*')
        .eq('contract_id', id);
      payments = data || [];
    }

    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('contract_id', id)
      .single();

    return res.json({ contract, payments, review: review || null });
  } catch (error) {
    console.error('Get contract error:', error);
    return res.status(500).json({ error: 'Failed to get contract' });
  }
});

export default router;
