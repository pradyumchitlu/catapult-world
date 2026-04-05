import '../setup';

jest.mock('@worldcoin/minikit-js/siwe', () => ({
  verifySiweMessage: jest.fn(),
}));

import jwt from 'jsonwebtoken';
import request from 'supertest';
import { getAddress } from 'ethers';
import app from '../../index';
import { __resetMocks, __setMockResponse } from '../../__mocks__/supabase';
import { TEST_USER_ID, fakeUser, makeTestToken } from '../fixtures';

const token = makeTestToken(TEST_USER_ID);
const { verifySiweMessage } = require('@worldcoin/minikit-js/siwe') as {
  verifySiweMessage: jest.Mock;
};
const mockVerifySiweMessage = verifySiweMessage as jest.MockedFunction<typeof verifySiweMessage>;

function makeSessionToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-jwt-secret', {
    expiresIn: '20m',
  });
}

beforeEach(() => {
  __resetMocks();
  mockVerifySiweMessage.mockReset();
  __setMockResponse('users', 'select', { data: fakeUser, error: null });
});

describe('World Wallet auth routes', () => {
  it('prepares a wallet auth session for the authenticated user', async () => {
    const res = await request(app)
      .post('/api/auth/world-wallet/prepare')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(typeof res.body.nonce).toBe('string');
    expect(res.body.nonce.length).toBeGreaterThan(0);
    expect(res.body.statement).toMatch(/World wallet/i);
    expect(typeof res.body.session_token).toBe('string');
  });

  it('verifies World wallet auth and persists the linked wallet', async () => {
    const walletAddress = '0xa7d9d1a7d9d1a7d9d1a7d9d1a7d9d1a7d9d1a7d9';
    const normalizedWalletAddress = getAddress(walletAddress);
    const verifiedAt = '2026-04-05T09:15:00.000Z';
    const sessionToken = makeSessionToken({
      purpose: 'world_wallet_auth',
      userId: TEST_USER_ID,
      nonce: 'nonce-123',
      statement: 'Link your World wallet to Veridex for Mini App staking on World Chain.',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });

    mockVerifySiweMessage.mockResolvedValue({
      isValid: true,
      siweMessageData: { address: walletAddress },
    } as Awaited<ReturnType<typeof verifySiweMessage>>);

    __setMockResponse('users', 'update', {
      data: {
        ...fakeUser,
        wallet_address: normalizedWalletAddress,
        wallet_verified_at: verifiedAt,
        wallet_verification_method: 'world_app_wallet_auth',
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/auth/world-wallet/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        payload: { signature: '0xsig' },
        nonce: 'nonce-123',
        session_token: sessionToken,
      });

    expect(res.status).toBe(200);
    expect(mockVerifySiweMessage).toHaveBeenCalledWith(
      { signature: '0xsig' },
      'nonce-123',
      'Link your World wallet to Veridex for Mini App staking on World Chain.'
    );
    expect(res.body.success).toBe(true);
    expect(res.body.wallet.wallet_verification_method).toBe('world_app_wallet_auth');
    expect(res.body.wallet_address).toBe(normalizedWalletAddress);
  });

  it('logs in with an existing World wallet user', async () => {
    const walletAddress = '0xb8c9d1a7d9d1a7d9d1a7d9d1a7d9d1a7d9d1a7d9';
    const normalizedWalletAddress = getAddress(walletAddress);
    const sessionToken = makeSessionToken({
      purpose: 'world_wallet_login',
      nonce: 'nonce-login',
      statement: 'Sign in to Veridex with your World wallet inside World App.',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });

    mockVerifySiweMessage.mockResolvedValue({
      isValid: true,
      siweMessageData: { address: walletAddress },
    } as Awaited<ReturnType<typeof verifySiweMessage>>);

    __setMockResponse('users', 'select', {
      data: {
        ...fakeUser,
        wallet_address: normalizedWalletAddress,
      },
      error: null,
    });
    __setMockResponse('users', 'update', {
      data: {
        ...fakeUser,
        wallet_address: normalizedWalletAddress,
        wallet_verified_at: '2026-04-05T09:20:00.000Z',
        wallet_verification_method: 'world_app_wallet_auth',
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/auth/world-wallet/login')
      .send({
        payload: { signature: '0xlogin' },
        nonce: 'nonce-login',
        session_token: sessionToken,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isNewUser).toBe(false);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.wallet_verification_method).toBe('world_app_wallet_auth');
  });
});
