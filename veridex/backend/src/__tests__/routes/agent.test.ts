/**
 * Integration tests for agent routes (POST /spawn, GET /list, GET /:agentId)
 * Uses supertest against the Express app with mocked Supabase.
 */

import '../setup';

import request from 'supertest';
import app from '../../index';
import { __setMockResponse, __resetMocks } from '../../__mocks__/supabase';
import {
  TEST_USER_ID,
  TEST_AGENT_ID,
  fakeUser,
  fakeWorkerProfile,
  fakeAgent,
  fakeAgentMinimal,
  makeTestToken,
} from '../fixtures';

const token = makeTestToken(TEST_USER_ID);

beforeEach(() => {
  __resetMocks();
  // Default: auth middleware looks up user
  __setMockResponse('users', 'select', { data: fakeUser, error: null });
});

describe('POST /api/agent/spawn', () => {
  it('should register an agent with minimal fields', async () => {
    __setMockResponse('worker_profiles', 'select', {
      data: { overall_trust_score: 85 },
      error: null,
    });
    __setMockResponse('agents', 'insert', {
      data: {
        id: 'new-id',
        parent_user_id: TEST_USER_ID,
        name: 'My Bot',
        identifier: null,
        identifier_type: 'other',
        inheritance_fraction: 0.7,
        derived_score: 60,
        authorized_domains: [],
        stake_amount: 0,
        status: 'active',
        dispute_count: 0,
        created_at: '2025-06-01T00:00:00Z',
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Bot' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agent).toBeDefined();
    expect(res.body.agent.name).toBe('My Bot');
  });

  it('should register an agent with full credential fields', async () => {
    __setMockResponse('worker_profiles', 'select', {
      data: { overall_trust_score: 85 },
      error: null,
    });
    __setMockResponse('agents', 'insert', {
      data: {
        id: 'full-id',
        parent_user_id: TEST_USER_ID,
        name: 'DeFi Trader',
        identifier: '0xABC123',
        identifier_type: 'wallet',
        inheritance_fraction: 0.8,
        derived_score: 68,
        authorized_domains: ['defi', 'trading'],
        stake_amount: 100,
        status: 'active',
        dispute_count: 0,
        created_at: '2025-06-01T00:00:00Z',
      },
      error: null,
    });
    // No balance check needed — staking is handled on-chain

    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'DeFi Trader',
        identifier: '0xABC123',
        identifier_type: 'wallet',
        inheritance_fraction: 0.8,
        authorized_domains: ['defi', 'trading'],
        stake_amount: 100,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agent.identifier).toBe('0xABC123');
  });

  it('should reject empty name', async () => {
    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('should reject missing name', async () => {
    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should reject inheritance_fraction > 1', async () => {
    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Agent', inheritance_fraction: 1.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inheritance_fraction/);
  });

  it('should reject inheritance_fraction < 0', async () => {
    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Agent', inheritance_fraction: -0.5 });

    expect(res.status).toBe(400);
  });

  it('should reject negative stake_amount', async () => {
    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Agent', stake_amount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stake_amount/);
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .post('/api/agent/spawn')
      .send({ name: 'Unauthed Agent' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/agent/list/:userId', () => {
  it('should list agents for a user', async () => {
    __setMockResponse('agents', 'select', {
      data: [fakeAgent, { ...fakeAgentMinimal, parent: fakeAgent.parent }],
      error: null,
    });

    const res = await request(app)
      .get(`/api/agent/list/${TEST_USER_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.agents).toBeDefined();
    expect(res.body.agents).toHaveLength(2);
  });

  it('should return empty array when no agents', async () => {
    __setMockResponse('agents', 'select', { data: [], error: null });

    const res = await request(app)
      .get(`/api/agent/list/${TEST_USER_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.agents).toEqual([]);
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .get(`/api/agent/list/${TEST_USER_ID}`);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/agent/:agentId (public lookup)', () => {
  // Note: GET /api/agent/:agentId is handled by query.ts (mounted at /api first)
  // The response shape is { agent_id, agent_name, derived_score, parent: {...} }

  it('should return agent data for a valid agent', async () => {
    __setMockResponse('agents', 'select', { data: fakeAgent, error: null });

    const res = await request(app)
      .get(`/api/agent/${TEST_AGENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.agent_id).toBe(TEST_AGENT_ID);
    expect(res.body.agent_name).toBe('Trading Bot');
    expect(res.body.derived_score).toBe(60);
    expect(res.body.parent).toBeDefined();
    expect(res.body.parent.display_name).toBe('Alice Developer');
    expect(res.body.parent.is_verified_human).toBe(true);
  });

  it('should return 404 for non-existent agent', async () => {
    __setMockResponse('agents', 'select', { data: null, error: { code: 'PGRST116' } });

    const res = await request(app)
      .get('/api/agent/nonexistent-id');

    expect(res.status).toBe(404);
  });

  it('should not require authentication (public endpoint)', async () => {
    __setMockResponse('agents', 'select', { data: fakeAgent, error: null });

    const res = await request(app)
      .get(`/api/agent/${TEST_AGENT_ID}`);
    // No auth header — should still work

    expect(res.status).toBe(200);
  });
});
