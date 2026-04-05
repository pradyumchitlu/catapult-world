/**
 * Integration tests for agent routes.
 */

import '../setup';

import request from 'supertest';
import app from '../../index';
import { __setMockResponse, __resetMocks } from '../../__mocks__/supabase';
import {
  TEST_AGENT_ID,
  TEST_USER_ID,
  TEST_USER_ID_2,
  fakeAgent,
  fakeAgentActionEvent,
  fakeAgentMinimal,
  fakeUser,
  makeTestToken,
} from '../fixtures';

const token = makeTestToken(TEST_USER_ID);

beforeEach(() => {
  __resetMocks();
  __setMockResponse('users', 'select', { data: fakeUser, error: null });
});

describe('POST /api/agent/spawn', () => {
  it('should register an agent with lightweight demo fields', async () => {
    __setMockResponse('agents', 'select', { data: [], error: null });
    __setMockResponse('worker_profiles', 'select', {
      data: { overall_trust_score: 85 },
      error: null,
    });
    __setMockResponse('agents', 'insert', {
      data: {
        ...fakeAgentMinimal,
        id: 'new-id',
        name: 'My Bot',
        identifier: 'demo://my-bot',
        deployment_surface: 'api',
        derived_score: 26,
        inheritance_fraction: 0.3,
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'My Bot',
        identifier: 'demo://my-bot',
        deployment_surface: 'api',
        inheritance_fraction: 0.3,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agent.name).toBe('My Bot');
    expect(res.body.agent.agent_score).toBe(100);
    expect(res.body.agent.max_penalty_points).toBe(26);
  });

  it('should reject missing identifier', async () => {
    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No Identifier Bot' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/identifier/i);
  });

  it('should reject allocations above 100%', async () => {
    __setMockResponse('agents', 'select', {
      data: [{ ...fakeAgent, inheritance_fraction: '0.80' }],
      error: null,
    });

    const res = await request(app)
      .post('/api/agent/spawn')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Overflow Bot',
        identifier: 'demo://overflow',
        inheritance_fraction: 0.3,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/100%/);
  });
});

describe('GET /api/agent/list/:userId', () => {
  it('should list agents with summary and recent actions for the authenticated user', async () => {
    __setMockResponse('worker_profiles', 'select', {
      data: { overall_trust_score: 85 },
      error: null,
    });
    __setMockResponse('agents', 'select', {
      data: [fakeAgent, fakeAgentMinimal],
      error: null,
    });
    __setMockResponse('agent_action_events', 'select', {
      data: [fakeAgentActionEvent],
      error: null,
    });

    const res = await request(app)
      .get(`/api/agent/list/${TEST_USER_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.agents).toHaveLength(2);
    expect(res.body.recent_actions).toHaveLength(1);
  });

  it('should reject listing another user agents', async () => {
    const res = await request(app)
      .get(`/api/agent/list/${TEST_USER_ID_2}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/agent/:agentId/action', () => {
  it('should apply a demo action and return refreshed summary', async () => {
    __setMockResponse('worker_profiles', 'select', [
      { data: { overall_trust_score: 85 }, error: null },
      { data: { overall_trust_score: 85 }, error: null },
    ]);
    __setMockResponse('agents', 'select', [
      { data: fakeAgent, error: null },
      { data: [fakeAgent], error: null },
    ]);
    __setMockResponse('agents', 'update', {
      data: {
        ...fakeAgent,
        agent_score: 95,
        action_count: 1,
        last_action_at: '2025-07-03T00:00:00Z',
        derived_score: 57,
      },
      error: null,
    });
    __setMockResponse('agent_action_events', 'insert', { data: null, error: null });
    __setMockResponse('agent_action_events', 'select', {
      data: [fakeAgentActionEvent],
      error: null,
    });

    const res = await request(app)
      .post(`/api/agent/${TEST_AGENT_ID}/action`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action_type: 'warning' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agent.agent_score).toBe(95);
    expect(res.body.summary).toBeDefined();
  });
});

describe('POST /api/agent/:agentId/reset-demo', () => {
  it('should reset an agent for demo use', async () => {
    __setMockResponse('worker_profiles', 'select', [
      { data: { overall_trust_score: 85 }, error: null },
      { data: { overall_trust_score: 85 }, error: null },
    ]);
    __setMockResponse('agents', 'select', [
      {
        data: {
          ...fakeAgent,
          agent_score: 70,
          action_count: 2,
          last_action_at: '2025-07-03T00:00:00Z',
          derived_score: 42,
        },
        error: null,
      },
      { data: [fakeAgent], error: null },
    ]);
    __setMockResponse('agents', 'update', {
      data: {
        ...fakeAgent,
        agent_score: 100,
        action_count: 2,
        last_action_at: '2025-07-03T00:00:00Z',
        derived_score: 60,
      },
      error: null,
    });
    __setMockResponse('agent_action_events', 'insert', { data: null, error: null });
    __setMockResponse('agent_action_events', 'select', {
      data: [fakeAgentActionEvent],
      error: null,
    });

    const res = await request(app)
      .post(`/api/agent/${TEST_AGENT_ID}/reset-demo`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.agent.agent_score).toBe(100);
  });
});

describe('GET /api/agent/:agentId', () => {
  it('should return public agent verification data', async () => {
    __setMockResponse('agents', 'select', [
      { data: fakeAgent, error: null },
      { data: [fakeAgent], error: null },
    ]);

    const res = await request(app)
      .get(`/api/agent/${TEST_AGENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.is_verified).toBe(true);
    expect(res.body.agent.agent_score).toBe(100);
    expect(res.body.parent.base_overall_trust_score).toBe(85);
  });
});
