import { Router, Response } from 'express';
import { JsonRpcProvider, parseEther } from 'ethers';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { getChainConfig } from '../lib/chainConfig';
import { syncWorkerReputation } from '../services/reputationIngestion';
import { getPlatformAddress, sendETH } from '../services/platformWallet';

const router = Router();

function getStakeAmountEth(stake: Record<string, any>): number {
  return Number(stake.amount_eth || 0);
}

function isMissingColumnError(error: any, column: string): boolean {
  const message = typeof error?.message === 'string' ? error.message : '';
  return (error?.code === '42703' || error?.code === 'PGRST204') && message.includes(column);
}

/**
 * GET /api/stake/platform-address
 * Returns the platform wallet address that users send ETH to when staking.
 */
router.get('/platform-address', (_req, res: Response) => {
  try {
    const address = getPlatformAddress();
    return res.json({ address });
  } catch (error) {
    console.error('Platform address error:', error);
    return res.status(500).json({ error: 'Platform wallet not configured' });
  }
});

/**
 * POST /api/stake
 * Stake ETH on a worker. User sends ETH to platform wallet via MetaMask,
 * then submits the transaction_id here for on-chain verification.
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId, amount_eth, transaction_id } = req.body;
    const stakerId = req.userId!;
    const amountEth = Number(amount_eth);

    if (!workerId || !Number.isFinite(amountEth) || amountEth <= 0) {
      return res.status(400).json({ error: 'Invalid stake data' });
    }

    if (!transaction_id) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    const { data: staker, error: stakerError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', stakerId)
      .single();

    if (stakerError || !staker) {
      return res.status(404).json({ error: 'Staker not found' });
    }

    if (!staker.wallet_address) {
      return res.status(400).json({ error: 'You must connect a wallet before staking' });
    }

    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', workerId)
      .single();

    if (workerError || !worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const chain = getChainConfig();
    const provider = new JsonRpcProvider(chain.rpcUrl);
    const receipt = await provider.getTransactionReceipt(transaction_id);

    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ error: 'Transaction not confirmed or failed' });
    }

    const tx = await provider.getTransaction(transaction_id);
    if (!tx) {
      return res.status(400).json({ error: 'Transaction not found' });
    }

    const platformAddress = getPlatformAddress().toLowerCase();
    if (tx.to?.toLowerCase() !== platformAddress) {
      return res.status(400).json({ error: 'Transaction recipient is not the platform wallet' });
    }

    if (tx.from.toLowerCase() !== staker.wallet_address.toLowerCase()) {
      return res.status(400).json({ error: 'Transaction sender does not match your wallet' });
    }

    if (tx.value < parseEther(amountEth.toString())) {
      return res.status(400).json({ error: 'Transaction value is less than the stated stake amount' });
    }

    const { data: existing, error: duplicateError } = await supabase
      .from('stakes')
      .select('id')
      .eq('transaction_id', transaction_id)
      .maybeSingle();

    if (duplicateError) {
      throw duplicateError;
    }

    if (existing) {
      return res.status(400).json({ error: 'This transaction has already been used for a stake' });
    }

    const baseInsert = {
      staker_id: stakerId,
      worker_id: workerId,
      amount_eth: amountEth,
      transaction_id,
      payment_method: 'wallet_transfer',
      status: 'active',
    };

    let { data: stake, error: stakeError } = await supabase
      .from('stakes')
      .insert(baseInsert)
      .select()
      .single();

    // Compatibility fallback for the current remote schema until the amount column is dropped.
    if (stakeError && /null value in column "amount"/i.test(stakeError.message || '')) {
      ({ data: stake, error: stakeError } = await supabase
        .from('stakes')
        .insert({
          ...baseInsert,
          amount: 0,
        })
        .select()
        .single());
    }

    if (stakeError) {
      throw stakeError;
    }

    try {
      await syncWorkerReputation(workerId, { refreshGithub: false });
    } catch (scoreError) {
      console.error('Score recomputation after stake failed:', scoreError);
    }

    return res.json({
      success: true,
      stake: {
        ...stake,
        amount_eth: getStakeAmountEth(stake),
        transaction_id: stake?.transaction_id || transaction_id,
      },
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

    const stakesWithYield = (stakes || []).map((stake) => ({
      ...stake,
      amount_eth: getStakeAmountEth(stake),
      yield_earned: 0,
      score_trend: 'stable',
    }));

    return res.json({ stakes: stakesWithYield });
  } catch (error) {
    console.error('Get stakes error:', error);
    return res.status(500).json({ error: 'Failed to get stakes' });
  }
});

/**
 * POST /api/stake/withdraw
 * Withdraw a stake — sends ETH back to the staker's wallet.
 */
router.post('/withdraw', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stakeId } = req.body;
    const stakerId = req.userId!;

    if (!stakeId) {
      return res.status(400).json({ error: 'Missing stakeId' });
    }

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

    const amountEth = getStakeAmountEth(stake);
    if (!Number.isFinite(amountEth) || amountEth <= 0) {
      return res.status(400).json({ error: 'Stake amount is invalid' });
    }

    const { data: staker } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', stakerId)
      .single();

    if (!staker?.wallet_address) {
      return res.status(400).json({ error: 'No wallet address on file' });
    }

    const withdrawalTransactionId = await sendETH(
      staker.wallet_address,
      parseEther(amountEth.toString())
    );

    let updateError = (
      await supabase
        .from('stakes')
        .update({
          status: 'withdrawn',
          withdrawal_transaction_id: withdrawalTransactionId,
        })
        .eq('id', stakeId)
    ).error;

    // Compatibility fallback while the remote schema is missing the new column.
    if (updateError && isMissingColumnError(updateError, 'withdrawal_transaction_id')) {
      updateError = (
        await supabase
          .from('stakes')
          .update({ status: 'withdrawn' })
          .eq('id', stakeId)
      ).error;
    }

    if (updateError) {
      throw updateError;
    }

    try {
      await syncWorkerReputation(stake.worker_id, { refreshGithub: false });
    } catch (scoreError) {
      console.error('Score recomputation after withdrawal failed:', scoreError);
    }

    return res.json({
      success: true,
      returned_amount: amountEth,
      withdrawal_transaction_id: withdrawalTransactionId,
    });
  } catch (error) {
    console.error('Withdraw stake error:', error);
    return res.status(500).json({ error: 'Withdrawal failed' });
  }
});

export default router;
