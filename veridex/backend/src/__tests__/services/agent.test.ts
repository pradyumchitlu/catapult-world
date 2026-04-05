/**
 * Unit tests for backend/src/services/agent.ts
 *
 * Tests: registerAgent, lookupAgent, updateAgentScores, listUserAgents,
 * getUserAgentDashboardData, applyAgentAction, resetAgentDemo
 */

import '../setup';

import { __setMockResponse, __resetMocks } from '../../__mocks__/supabase';
import {
  applyAgentAction,
  getUserAgentDashboardData,
  listUserAgents,
  lookupAgent,
  registerAgent,
  resetAgentDemo,
  updateAgentScores,
} from '../../services/agent';
import {
  TEST_AGENT_ID,
  TEST_USER_ID,
  fakeAgent,
  fakeAgentActionEvent,
  fakeAgentMinimal,
} from '../fixtures';

beforeEach(() => {
  __resetMocks();
});

describe('registerAgent', () => {
  it('should register an agent with demo defaults', async () => {
    __setMockResponse('agents', 'insert', {
      data: {
        ...fakeAgentMinimal,
        id: TEST_AGENT_ID,
        name: 'Test Agent',
        identifier: 'demo://test-agent',
        inheritance_fraction: 0.7,
        derived_score: 60,
        deployment_surface: 'custom',
      },
      error: null,
    });

    const agent = await registerAgent({
      userId: TEST_USER_ID,
      name: 'Test Agent',
      parentScore: 85,
      identifier: 'demo://test-agent',
    });

    expect(agent.name).toBe('Test Agent');
    expect(agent.agent_score).toBe(100);
    expect(agent.derived_score).toBe(60);
    expect(agent.current_penalty_points).toBe(0);
  });

  it('should calculate derived score using custom inheritance_fraction', async () => {
    __setMockResponse('agents', 'insert', {
      data: {
        ...fakeAgent,
        id: 'new-agent-id',
        name: 'Custom Agent',
        identifier: '0xABC',
        identifier_type: 'wallet',
        deployment_surface: 'wallet',
        inheritance_fraction: 0.5,
        derived_score: 43,
        authorized_domains: ['defi'],
      },
      error: null,
    });

    const agent = await registerAgent({
      userId: TEST_USER_ID,
      name: 'Custom Agent',
      parentScore: 85,
      identifier: '0xABC',
      identifier_type: 'wallet',
      deployment_surface: 'wallet',
      inheritance_fraction: 0.5,
      authorized_domains: ['defi'],
    });

    expect(agent.identifier_type).toBe('wallet');
    expect(agent.deployment_surface).toBe('wallet');
    expect(agent.derived_score).toBe(43);
    expect(agent.max_penalty_points).toBe(43);
  });
});

describe('lookupAgent', () => {
  it('should return agent with parent info and effective trust for valid ID', async () => {
    __setMockResponse('agents', 'select', [
      { data: fakeAgent, error: null },
      { data: [fakeAgent], error: null },
    ]);

    const agent = await lookupAgent(TEST_AGENT_ID);

    expect(agent).toBeDefined();
    expect(agent!.id).toBe(TEST_AGENT_ID);
    expect(agent!.name).toBe('Trading Bot');
    expect(agent!.parent.display_name).toBe('Alice Developer');
    expect(agent!.parent.base_overall_trust_score).toBe(85);
    expect(agent!.parent.effective_trust_score).toBe(85);
    expect(agent!.agent_score).toBe(100);
    expect(agent!.current_penalty_points).toBe(0);
  });

  it('should return null for non-existent agent', async () => {
    __setMockResponse('agents', 'select', { data: null, error: { code: 'PGRST116' } });

    const agent = await lookupAgent('nonexistent-id');
    expect(agent).toBeNull();
  });
});

describe('updateAgentScores', () => {
  it('should update derived scores based on each agent inheritance fraction and agent score', async () => {
    __setMockResponse('agents', 'select', {
      data: [
        { id: 'a1', inheritance_fraction: '0.70', agent_score: 100 },
        { id: 'a2', inheritance_fraction: '0.50', agent_score: 70 },
      ],
      error: null,
    });
    __setMockResponse('agents', 'update', { data: null, error: null });

    await updateAgentScores(TEST_USER_ID, 100);
  });

  it('should handle user with no agents gracefully', async () => {
    __setMockResponse('agents', 'select', { data: [], error: null });
    await updateAgentScores(TEST_USER_ID, 100);
  });
});

describe('listUserAgents', () => {
  it('should return agents for a user with computed penalty fields', async () => {
    __setMockResponse('agents', 'select', {
      data: [fakeAgentMinimal],
      error: null,
    });

    const agents = await listUserAgents(TEST_USER_ID, 85);

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('Simple Agent');
    expect(agents[0].inheritance_fraction).toBe(0.5);
    expect(agents[0].max_penalty_points).toBe(43);
  });
});

describe('getUserAgentDashboardData', () => {
  it('should return summary, agents, and recent actions', async () => {
    __setMockResponse('agents', 'select', { data: [fakeAgentMinimal], error: null });
    __setMockResponse('agent_action_events', 'select', {
      data: [fakeAgentActionEvent],
      error: null,
    });

    const data = await getUserAgentDashboardData(TEST_USER_ID, 85);

    expect(data.summary.base_user_score).toBe(85);
    expect(data.summary.effective_user_score).toBe(85);
    expect(data.summary.total_registered_agents).toBe(1);
    expect(data.recent_actions).toHaveLength(1);
  });
});

describe('applyAgentAction', () => {
  it('should reduce agent score and record an action', async () => {
    __setMockResponse('worker_profiles', 'select', {
      data: { overall_trust_score: 85 },
      error: null,
    });
    __setMockResponse('agents', 'select', { data: fakeAgent, error: null });
    __setMockResponse('agents', 'update', {
      data: {
        ...fakeAgent,
        agent_score: 85,
        action_count: 1,
        last_action_at: '2025-07-03T00:00:00Z',
        derived_score: 51,
      },
      error: null,
    });
    __setMockResponse('agent_action_events', 'insert', { data: null, error: null });

    const agent = await applyAgentAction({
      agentId: TEST_AGENT_ID,
      userId: TEST_USER_ID,
      actionType: 'failure',
    });

    expect(agent.agent_score).toBe(85);
    expect(agent.current_penalty_points).toBe(9);
    expect(agent.derived_score).toBe(51);
  });
});

describe('resetAgentDemo', () => {
  it('should restore the demo score back to 100', async () => {
    __setMockResponse('worker_profiles', 'select', {
      data: { overall_trust_score: 85 },
      error: null,
    });
    __setMockResponse('agents', 'select', {
      data: {
        ...fakeAgent,
        agent_score: 70,
        action_count: 2,
        last_action_at: '2025-07-03T00:00:00Z',
        derived_score: 42,
      },
      error: null,
    });
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

    const agent = await resetAgentDemo({
      agentId: TEST_AGENT_ID,
      userId: TEST_USER_ID,
    });

    expect(agent.agent_score).toBe(100);
    expect(agent.current_penalty_points).toBe(0);
    expect(agent.derived_score).toBe(60);
  });
});
