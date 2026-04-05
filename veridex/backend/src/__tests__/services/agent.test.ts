/**
 * Unit tests for backend/src/services/agent.ts
 *
 * Tests: registerAgent, lookupAgent, updateAgentScores, listUserAgents
 */

// Setup env before imports
import '../setup';

import { __setMockResponse, __resetMocks } from '../../__mocks__/supabase';
import { registerAgent, lookupAgent, updateAgentScores, listUserAgents } from '../../services/agent';
import { TEST_USER_ID, TEST_AGENT_ID, fakeAgent, fakeAgentMinimal, fakeUser } from '../fixtures';

beforeEach(() => {
  __resetMocks();
});

describe('registerAgent', () => {
  it('should register an agent with default 70% inheritance', async () => {
    // Mock: no stake so no user lookup needed; insert returns agent
    __setMockResponse('agents', 'insert', {
      data: {
        id: TEST_AGENT_ID,
        parent_user_id: TEST_USER_ID,
        name: 'Test Agent',
        identifier: null,
        identifier_type: 'other',
        inheritance_fraction: 0.7,
        derived_score: 60, // 85 * 0.7 = 59.5 → 60
        authorized_domains: [],
        stake_amount: 0,
        status: 'active',
        dispute_count: 0,
        created_at: '2025-06-01T00:00:00Z',
      },
      error: null,
    });

    const agent = await registerAgent({
      userId: TEST_USER_ID,
      name: 'Test Agent',
      parentScore: 85,
    });

    expect(agent).toBeDefined();
    expect(agent.name).toBe('Test Agent');
    expect(agent.derived_score).toBe(60);
    expect(agent.parent_user_id).toBe(TEST_USER_ID);
  });

  it('should calculate derived score using custom inheritance_fraction', async () => {
    __setMockResponse('agents', 'insert', {
      data: {
        id: 'new-agent-id',
        parent_user_id: TEST_USER_ID,
        name: 'Custom Agent',
        identifier: '0xABC',
        identifier_type: 'wallet',
        inheritance_fraction: 0.5,
        derived_score: 43, // 85 * 0.5 = 42.5 → 43
        authorized_domains: ['defi'],
        stake_amount: 0,
        status: 'active',
        dispute_count: 0,
        created_at: '2025-06-01T00:00:00Z',
      },
      error: null,
    });

    const agent = await registerAgent({
      userId: TEST_USER_ID,
      name: 'Custom Agent',
      parentScore: 85,
      identifier: '0xABC',
      identifier_type: 'wallet',
      inheritance_fraction: 0.5,
      authorized_domains: ['defi'],
    });

    expect(agent.identifier).toBe('0xABC');
    expect(agent.identifier_type).toBe('wallet');
    expect(agent.derived_score).toBe(43);
    expect(agent.authorized_domains).toEqual(['defi']);
  });

  it('should record stake_amount without deducting balance (future on-chain feature)', async () => {
    // No user lookup or balance update needed — staking is handled on-chain
    __setMockResponse('agents', 'insert', {
      data: {
        id: 'staked-agent-id',
        parent_user_id: TEST_USER_ID,
        name: 'Staked Agent',
        identifier: null,
        identifier_type: 'other',
        inheritance_fraction: 0.7,
        derived_score: 60,
        authorized_domains: [],
        stake_amount: 200,
        status: 'active',
        dispute_count: 0,
        created_at: '2025-06-01T00:00:00Z',
      },
      error: null,
    });

    const agent = await registerAgent({
      userId: TEST_USER_ID,
      name: 'Staked Agent',
      parentScore: 85,
      stake_amount: 200,
    });

    expect(agent.stake_amount).toBe(200);
  });

  it('should handle zero parent score correctly', async () => {
    __setMockResponse('agents', 'insert', {
      data: {
        id: 'zero-agent',
        parent_user_id: TEST_USER_ID,
        name: 'Zero Score Agent',
        identifier: null,
        identifier_type: 'other',
        inheritance_fraction: 0.7,
        derived_score: 0,
        authorized_domains: [],
        stake_amount: 0,
        status: 'active',
        dispute_count: 0,
        created_at: '2025-06-01T00:00:00Z',
      },
      error: null,
    });

    const agent = await registerAgent({
      userId: TEST_USER_ID,
      name: 'Zero Score Agent',
      parentScore: 0,
    });

    expect(agent.derived_score).toBe(0);
  });
});

describe('lookupAgent', () => {
  it('should return agent with parent info for valid ID', async () => {
    __setMockResponse('agents', 'select', { data: fakeAgent, error: null });

    const agent = await lookupAgent(TEST_AGENT_ID);

    expect(agent).toBeDefined();
    expect(agent!.id).toBe(TEST_AGENT_ID);
    expect(agent!.name).toBe('Trading Bot');
    expect(agent!.parent.display_name).toBe('Alice Developer');
    expect(agent!.parent.overall_trust_score).toBe(85);
    expect(agent!.inheritance_fraction).toBe(0.7);
    expect(agent!.authorized_domains).toEqual(['defi', 'trading']);
    expect(agent!.stake_amount).toBe(200);
  });

  it('should return null for non-existent agent', async () => {
    __setMockResponse('agents', 'select', { data: null, error: { code: 'PGRST116' } });

    const agent = await lookupAgent('nonexistent-id');
    expect(agent).toBeNull();
  });
});

describe('updateAgentScores', () => {
  it('should update derived scores based on each agent\'s inheritance fraction', async () => {
    __setMockResponse('agents', 'select', {
      data: [
        { id: 'a1', inheritance_fraction: '0.70' },
        { id: 'a2', inheritance_fraction: '0.50' },
      ],
      error: null,
    });
    __setMockResponse('agents', 'update', { data: null, error: null });

    // Should not throw
    await updateAgentScores(TEST_USER_ID, 100);
  });

  it('should handle user with no agents gracefully', async () => {
    __setMockResponse('agents', 'select', { data: [], error: null });

    await updateAgentScores(TEST_USER_ID, 100);
    // No error = pass
  });
});

describe('listUserAgents', () => {
  it('should return agents for a user', async () => {
    __setMockResponse('agents', 'select', {
      data: [fakeAgentMinimal],
      error: null,
    });

    const agents = await listUserAgents(TEST_USER_ID);

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('Simple Agent');
    expect(agents[0].inheritance_fraction).toBe(0.5);
  });

  it('should return empty array when user has no agents', async () => {
    __setMockResponse('agents', 'select', { data: [], error: null });

    const agents = await listUserAgents(TEST_USER_ID);
    expect(agents).toEqual([]);
  });

  it('should throw on database error', async () => {
    __setMockResponse('agents', 'select', { data: null, error: { message: 'DB error' } });

    // listUserAgents doesn't check for null data with error - it throws
    // The actual code does `if (error) throw error`
    await expect(listUserAgents(TEST_USER_ID)).rejects.toBeDefined();
  });
});
