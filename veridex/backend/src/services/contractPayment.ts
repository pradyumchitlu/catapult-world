import supabase from '../lib/supabase';

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
  stakerBreakdown: { staker_id: string; stake_id: string; amount: number }[];
}

/**
 * Process payment when a contract is completed.
 * Records payment ledger entries for audit. Actual on-chain settlement is a future feature.
 */
export async function processCompletion(contractId: string): Promise<PaymentResult> {
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

  const workerPayout = contract.payment_amount;
  const stakerPool = contract.staker_payout_total || 0;
  const platformFee = contract.platform_fee || 0;

  // Fetch active stakes on this worker
  const { data: stakes } = await supabase
    .from('stakes')
    .select('id, staker_id, amount_eth')
    .eq('worker_id', contract.worker_id)
    .eq('status', 'active');

  const activeStakes = stakes || [];
  const totalStaked = activeStakes.reduce((sum, s) => sum + Number(s.amount_eth || 0), 0);

  const stakerBreakdown: PaymentResult['stakerBreakdown'] = [];

  if (totalStaked > 0 && activeStakes.length > 0 && stakerPool > 0) {
    let distributed = 0;
    for (let i = 0; i < activeStakes.length; i++) {
      const stake = activeStakes[i];
      const stakeAmountEth = Number(stake.amount_eth || 0);
      const isLast = i === activeStakes.length - 1;
      const share = isLast
        ? stakerPool - distributed
        : Math.floor(stakerPool * (stakeAmountEth / totalStaked));

      if (share > 0) {
        stakerBreakdown.push({
          staker_id: stake.staker_id,
          stake_id: stake.id,
          amount: share,
        });
        distributed += share;
      }
    }
  }

  const stakerPayoutTotal = stakerBreakdown.reduce((sum, s) => sum + s.amount, 0);
  const unclaimed = stakerPool - stakerPayoutTotal;
  const finalWorkerPayout = workerPayout + unclaimed;

  // Record worker payment
  await supabase.from('contract_payments').insert({
    contract_id: contractId,
    recipient_id: contract.worker_id,
    amount: finalWorkerPayout,
    payment_type: 'worker_payout',
  });

  // Record staker payments
  for (const entry of stakerBreakdown) {
    await supabase.from('contract_payments').insert({
      contract_id: contractId,
      recipient_id: entry.staker_id,
      amount: entry.amount,
      payment_type: 'staker_share',
      stake_id: entry.stake_id,
    });
  }

  // Record platform fee
  if (platformFee > 0) {
    await supabase.from('contract_payments').insert({
      contract_id: contractId,
      recipient_id: contract.employer_id,
      amount: platformFee,
      payment_type: 'platform_fee',
    });
  }

  // Update contract
  await supabase
    .from('contracts')
    .update({
      status: 'completed',
      worker_payout: finalWorkerPayout,
      completed_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  return { workerPayout: finalWorkerPayout, stakerPayoutTotal, platformFee, stakerBreakdown };
}
