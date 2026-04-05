import supabase from '../lib/supabase';
import { getPlatformAddress } from './platformWallet';

const PLATFORM_FEE_RATE = 0.03;        // 3% of salary
const MAX_STAKER_REWARD_RATE = 0.15;   // up to 15% of salary
const STAKER_SCALE_DENOMINATOR = 0.5;   // total ETH staked at which staker reward hits max

export interface BuyInBreakdown {
  salary: number;
  stakerReward: number;
  platformFee: number;
  totalBuyIn: number;
  totalStakedOnWorker: number;
  stakerRewardRate: number;
}

/**
 * Calculate the employer's total buy-in for a contract.
 *
 * buy_in = salary + staker_reward + platform_fee
 *   staker_reward = salary * min(total_staked / 10000, 0.15)
 *   platform_fee  = salary * 0.03
 */
export async function calculateBuyIn(workerId: string, salary: number): Promise<BuyInBreakdown> {
  const { data: stakes } = await supabase
    .from('stakes')
    .select('amount_eth')
    .eq('worker_id', workerId)
    .eq('status', 'active');

  const totalStakedOnWorker = (stakes || []).reduce((sum, s) => sum + Number(s.amount_eth || 0), 0);
  const stakerRewardRate = Math.min(totalStakedOnWorker / STAKER_SCALE_DENOMINATOR, 1) * MAX_STAKER_REWARD_RATE;
  const stakerReward = Math.floor(salary * stakerRewardRate);
  const platformFee = Math.floor(salary * PLATFORM_FEE_RATE);
  const totalBuyIn = salary + stakerReward + platformFee;

  return { salary, stakerReward, platformFee, totalBuyIn, totalStakedOnWorker, stakerRewardRate };
}

export interface PaymentResult {
  workerPayout: number;
  stakerPayoutTotal: number;
  platformFee: number;
  totalAmount: number;
  stakerBreakdown: { staker_id: string; stake_id: string; amount: number }[];
  transfers: ContractSettlementTransfer[];
}

/**
 * Wallet-to-wallet settlement instructions used by the World App payout flow.
 */
export interface ContractSettlementTransfer {
  recipient_id: string | null;
  wallet_address: string;
  amount: number;
  payment_type: 'worker_payout' | 'staker_share' | 'platform_fee';
  stake_id: string | null;
  label: string;
}

export interface ContractSettlementPlan {
  contract_id: string;
  worker_id: string;
  worker_wallet_address: string;
  platform_wallet_address: string | null;
  worker_payout: number;
  staker_payout_total: number;
  platform_fee: number;
  total_amount: number;
  unclaimed_staker_amount: number;
  transfers: ContractSettlementTransfer[];
}

/**
 * Prepare the contract payout plan using linked payout wallets.
 * Unclaimable staker rewards roll into the worker payout so the buy-in total stays conserved.
 */
export async function prepareCompletionSettlement(contractId: string): Promise<ContractSettlementPlan> {
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single();

  if (contractError || !contract) {
    throw new Error('Contract not found');
  }

  if (contract.status !== 'submitted') {
    throw new Error(`Contract is ${contract.status}, expected submitted`);
  }

  const workerPayout = Number(contract.payment_amount || 0);
  const stakerPool = Number(contract.staker_payout_total || 0);
  const platformFee = Number(contract.platform_fee || 0);

  const { data: worker, error: workerError } = await supabase
    .from('users')
    .select('id, wallet_address')
    .eq('id', contract.worker_id)
    .single();

  if (workerError || !worker?.wallet_address) {
    throw new Error('The worker has not linked a payout wallet yet');
  }

  const { data: stakes } = await supabase
    .from('stakes')
    .select('id, staker_id, amount_eth')
    .eq('worker_id', contract.worker_id)
    .eq('status', 'active');

  const activeStakes = stakes || [];
  const totalStaked = activeStakes.reduce((sum, s) => sum + Number(s.amount_eth || 0), 0);
  const stakerIds = Array.from(
    new Set(
      activeStakes
        .map((stake) => stake.staker_id as string | undefined)
        .filter((stakeId): stakeId is string => Boolean(stakeId))
    )
  );
  const stakerUsersResult = stakerIds.length > 0
    ? await supabase
        .from('users')
        .select('id, wallet_address')
        .in('id', stakerIds)
    : { data: [], error: null };

  if (stakerUsersResult.error) {
    throw stakerUsersResult.error;
  }

  const stakerWallets = new Map<string, string>();
  for (const staker of stakerUsersResult.data || []) {
    if (typeof staker?.id === 'string' && typeof staker?.wallet_address === 'string' && staker.wallet_address.trim()) {
      stakerWallets.set(staker.id, staker.wallet_address);
    }
  }

  const stakerBreakdown: PaymentResult['stakerBreakdown'] = [];
  const transfers: ContractSettlementTransfer[] = [];
  let unclaimedStakerAmount = 0;

  if (totalStaked > 0 && activeStakes.length > 0 && stakerPool > 0) {
    let distributed = 0;
    for (let i = 0; i < activeStakes.length; i++) {
      const stake = activeStakes[i];
      const stakeAmountEth = Number(stake.amount_eth || 0);
      const isLast = i === activeStakes.length - 1;
      const share = isLast
        ? stakerPool - distributed
        : Math.floor(stakerPool * (stakeAmountEth / totalStaked));

      if (share <= 0) continue;

      distributed += share;

      const stakerWalletAddress = stakerWallets.get(stake.staker_id);
      if (!stakerWalletAddress) {
        unclaimedStakerAmount += share;
        continue;
      }

      stakerBreakdown.push({
        staker_id: stake.staker_id,
        stake_id: stake.id,
        amount: share,
      });
      transfers.push({
        recipient_id: stake.staker_id,
        wallet_address: stakerWalletAddress,
        amount: share,
        payment_type: 'staker_share',
        stake_id: stake.id,
        label: 'Staker reward',
      });
    }
  }

  const stakerPayoutTotal = stakerBreakdown.reduce((sum, s) => sum + s.amount, 0);
  const finalWorkerPayout = workerPayout + unclaimedStakerAmount;

  transfers.unshift({
    recipient_id: contract.worker_id,
    wallet_address: worker.wallet_address,
    amount: finalWorkerPayout,
    payment_type: 'worker_payout',
    stake_id: null,
    label: 'Worker payout',
  });

  const platformWalletAddress = platformFee > 0 ? getPlatformAddress() : null;
  if (platformFee > 0 && !platformWalletAddress) {
    throw new Error('Platform wallet not configured');
  }

  if (platformFee > 0 && platformWalletAddress) {
    transfers.push({
      recipient_id: null,
      wallet_address: platformWalletAddress,
      amount: platformFee,
      payment_type: 'platform_fee',
      stake_id: null,
      label: 'Platform fee',
    });
  }

  const totalAmount = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);

  return {
    contract_id: contractId,
    worker_id: contract.worker_id,
    worker_wallet_address: worker.wallet_address,
    platform_wallet_address: platformWalletAddress,
    worker_payout: finalWorkerPayout,
    staker_payout_total: stakerPayoutTotal,
    platform_fee: platformFee,
    total_amount: totalAmount,
    unclaimed_staker_amount: unclaimedStakerAmount,
    transfers,
  };
}

/**
 * Finalize the contract after the employer's wallet transaction has already settled on-chain.
 * Records payout ledger entries for worker + stakers; the aggregate platform fee remains on the contract row.
 */
export async function processCompletion(
  contractId: string,
  settlementPlan?: ContractSettlementPlan
): Promise<PaymentResult> {
  const settlement = settlementPlan || await prepareCompletionSettlement(contractId);
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single();

  if (contractError || !contract) {
    throw new Error('Contract not found');
  }

  if (contract.status !== 'submitted') {
    throw new Error(`Contract is ${contract.status}, expected submitted`);
  }

  // Record worker payment
  await supabase.from('contract_payments').insert({
    contract_id: contractId,
    recipient_id: contract.worker_id,
    amount: settlement.worker_payout,
    payment_type: 'worker_payout',
  });

  // Record staker payments
  for (const entry of settlement.transfers.filter((transfer) => transfer.payment_type === 'staker_share')) {
    await supabase.from('contract_payments').insert({
      contract_id: contractId,
      recipient_id: entry.recipient_id,
      amount: entry.amount,
      payment_type: 'staker_share',
      stake_id: entry.stake_id,
    });
  }

  // Update contract
  await supabase
    .from('contracts')
    .update({
      status: 'completed',
      worker_payout: settlement.worker_payout,
      completed_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  return {
    workerPayout: settlement.worker_payout,
    stakerPayoutTotal: settlement.staker_payout_total,
    platformFee: settlement.platform_fee,
    totalAmount: settlement.total_amount,
    stakerBreakdown: settlement.transfers
      .filter((transfer) => transfer.payment_type === 'staker_share' && transfer.recipient_id && transfer.stake_id)
      .map((transfer) => ({
        staker_id: transfer.recipient_id as string,
        stake_id: transfer.stake_id as string,
        amount: transfer.amount,
      })),
    transfers: settlement.transfers,
  };
}
