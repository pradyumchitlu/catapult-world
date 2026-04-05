import '../setup';

jest.mock('../../services/worldUserOperation', () => ({
  getWorldUserOperationStatus: jest.fn(),
}));

import request from 'supertest';
import app from '../../index';
import { __resetMocks, __setMockResponse } from '../../__mocks__/supabase';
import { TEST_USER_ID, TEST_USER_ID_2, makeTestToken, fakeUser, fakeUser2 } from '../fixtures';
import { getWorldUserOperationStatus } from '../../services/worldUserOperation';

const employerToken = makeTestToken(TEST_USER_ID_2);
const mockGetWorldUserOperationStatus = getWorldUserOperationStatus as jest.MockedFunction<typeof getWorldUserOperationStatus>;

const EMPLOYER_WALLET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const WORKER_WALLET = '0x1111111111111111111111111111111111111111';
const STAKER_WALLET = '0x3333333333333333333333333333333333333333';
const STAKER_ID = '33333333-3333-3333-3333-333333333333';
const CONTRACT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const employerUser = {
  ...fakeUser2,
  wallet_address: EMPLOYER_WALLET,
  wallet_verification_method: 'world_app_wallet_auth',
};

const workerUser = {
  ...fakeUser,
  wallet_address: WORKER_WALLET,
};

const submittedContract = {
  id: CONTRACT_ID,
  employer_id: TEST_USER_ID_2,
  worker_id: TEST_USER_ID,
  title: 'Build the payout flow',
  description: 'Implement the contract payment path',
  payment_amount: 100,
  buy_in_amount: 118,
  duration_days: 14,
  status: 'submitted',
  worker_payout: null,
  staker_payout_total: 15,
  platform_fee: 3,
  completed_at: null,
  closed_at: null,
  created_at: '2026-04-05T10:30:00.000Z',
  updated_at: '2026-04-05T10:30:00.000Z',
};

beforeEach(() => {
  __resetMocks();
  mockGetWorldUserOperationStatus.mockReset();
  process.env.PLATFORM_WALLET_ADDRESS = '0xF64026F81937c3c9a19910348d8fbDee4fc56D56';
});

describe('Contract payout routes', () => {
  it('builds a wallet-address settlement plan for submitted contracts', async () => {
    __setMockResponse('users', 'select', [
      { data: employerUser, error: null },
      { data: workerUser, error: null },
      { data: [{ id: STAKER_ID, wallet_address: STAKER_WALLET }], error: null },
    ]);
    __setMockResponse('contracts', 'select', [
      { data: submittedContract, error: null },
      { data: submittedContract, error: null },
    ]);
    __setMockResponse('stakes', 'select', {
      data: [{ id: 'stake-1', staker_id: STAKER_ID, amount_eth: 0.25 }],
      error: null,
    });

    const res = await request(app)
      .get(`/api/contract/${CONTRACT_ID}/settlement`)
      .set('Authorization', `Bearer ${employerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.settlement.total_amount).toBe(118);
    expect(res.body.settlement.worker_payout).toBe(100);
    expect(res.body.settlement.staker_payout_total).toBe(15);
    expect(res.body.settlement.platform_fee).toBe(3);
    expect(res.body.settlement.transfers).toEqual([
      expect.objectContaining({
        payment_type: 'worker_payout',
        wallet_address: WORKER_WALLET,
        amount: 100,
      }),
      expect.objectContaining({
        payment_type: 'staker_share',
        wallet_address: STAKER_WALLET,
        amount: 15,
      }),
      expect.objectContaining({
        payment_type: 'platform_fee',
        wallet_address: process.env.PLATFORM_WALLET_ADDRESS,
        amount: 3,
      }),
    ]);
  });

  it('requires mined World App payout proof before completing a contract', async () => {
    __setMockResponse('users', 'select', [{ data: employerUser, error: null }]);
    __setMockResponse('contracts', 'select', [{ data: submittedContract, error: null }]);

    const res = await request(app)
      .put(`/api/contract/${CONTRACT_ID}/complete`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user_op_hash and from_wallet_address/i);
  });

  it('completes a submitted contract after verifying the mined World App payout', async () => {
    mockGetWorldUserOperationStatus.mockResolvedValue({
      userOpHash: '0xuserop',
      transactionHash: '0xtxhash',
      transactionStatus: 'mined',
      sender: EMPLOYER_WALLET,
    });

    __setMockResponse('users', 'select', [
      { data: employerUser, error: null },
      { data: workerUser, error: null },
      { data: [{ id: STAKER_ID, wallet_address: STAKER_WALLET }], error: null },
    ]);
    __setMockResponse('contracts', 'select', [
      { data: submittedContract, error: null },
      { data: submittedContract, error: null },
      { data: submittedContract, error: null },
      {
        data: {
          ...submittedContract,
          status: 'completed',
          worker_payout: 100,
          completed_at: '2026-04-05T10:35:00.000Z',
        },
        error: null,
      },
    ]);
    __setMockResponse('stakes', 'select', {
      data: [{ id: 'stake-1', staker_id: STAKER_ID, amount_eth: 0.25 }],
      error: null,
    });

    const res = await request(app)
      .put(`/api/contract/${CONTRACT_ID}/complete`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        user_op_hash: '0xuserop',
        transaction_hash: '0xtxhash',
        from_wallet_address: EMPLOYER_WALLET,
      });

    expect(res.status).toBe(200);
    expect(mockGetWorldUserOperationStatus).toHaveBeenCalledWith('0xuserop');
    expect(res.body.success).toBe(true);
    expect(res.body.payment.totalAmount).toBe(118);
    expect(res.body.proof.transaction_hash).toBe('0xtxhash');
    expect(res.body.contract.status).toBe('completed');
  });
});
