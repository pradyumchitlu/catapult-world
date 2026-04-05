import { Router, Response } from 'express';
import { JsonRpcProvider, formatEther, parseEther } from 'ethers';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { syncWorkerReputation } from '../services/reputationIngestion';
import { getPlatformAddress, sendETH } from '../services/platformWallet';

const router = Router();

const DEFAULT_RPC_URL = 'https://worldchain-mainnet.g.alchemy.com/public';

function getRpcUrl(): string {
  return process.env.WORLDCHAIN_RPC_URL || process.env.WORLD_CHAIN_RPC_URL || DEFAULT_RPC_URL;
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
 * then submits the tx_hash here for on-chain verification.
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId, amount, tx_hash } = req.body;
    const stakerId = req.userId!;

    if (!workerId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid stake data' });
    }

    if (!tx_hash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    // Verify staker has a connected wallet
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

    // Verify worker exists
    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', workerId)
      .single();

    if (workerError || !worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Verify the transaction on-chain
    const provider = new JsonRpcProvider(getRpcUrl());
    const receipt = await provider.getTransactionReceipt(tx_hash);

    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ error: 'Transaction not confirmed or failed' });
    }

    const tx = await provider.getTransaction(tx_hash);
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

    const amountWei = parseEther(amount.toString());
    if (tx.value < amountWei) {
      return res.status(400).json({ error: 'Transaction value is less than the stated stake amount' });
    }

    // Check for duplicate tx_hash
    const { data: existing } = await supabase
      .from('stakes')
      .select('id')
      .eq('tx_hash', tx_hash)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'This transaction has already been used for a stake' });
    }

    // Create stake record
    const { data: stake, error: stakeError } = await supabase
      .from('stakes')
      .insert({
        staker_id: stakerId,
        worker_id: workerId,
        amount: Math.round(amount),
        amount_wei: amountWei.toString(),
        amount_eth: amount,
        tx_hash,
        status: 'active',
      })
      .select()
      .single();

    if (stakeError) {
      throw stakeError;
    }

    try {
      await syncWorkerReputation(workerId, { refreshGithub: false });
    } catch (scoreError) {
      console.error('Score recomputation after stake failed:', scoreError);
    }

    return res.json({ success: true, stake });
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
 * Withdraw a stake — sends ETH back to the staker's wallet
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

    // Get staker's wallet address
    const { data: staker } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', stakerId)
      .single();

    if (!staker?.wallet_address) {
      return res.status(400).json({ error: 'No wallet address on file' });
    }

    // Send ETH back to staker via platform wallet
    const amountWei = stake.amount_wei ? BigInt(stake.amount_wei) : parseEther(stake.amount.toString());
    const withdrawalTxHash = await sendETH(staker.wallet_address, amountWei);

    // Mark stake as withdrawn
    await supabase
      .from('stakes')
      .update({ status: 'withdrawn', withdrawal_tx_hash: withdrawalTxHash })
      .eq('id', stakeId);

    try {
      await syncWorkerReputation(stake.worker_id, { refreshGithub: false });
    } catch (scoreError) {
      console.error('Score recomputation after withdrawal failed:', scoreError);
    }

    return res.json({
      success: true,
      returned_amount: stake.amount_eth || stake.amount,
      withdrawal_tx_hash: withdrawalTxHash,
    });
  } catch (error) {
    console.error('Withdraw stake error:', error);
    return res.status(500).json({ error: 'Withdrawal failed' });
  }
});

export default router;
