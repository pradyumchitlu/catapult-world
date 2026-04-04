/**
 * Shared test fixtures — fake users, workers, agents, reviews.
 */

export const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
export const TEST_USER_ID_2 = '22222222-2222-2222-2222-222222222222';
export const TEST_AGENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const TEST_SESSION_ID = 'ssssssss-ssss-ssss-ssss-ssssssssssss';

export const fakeUser = {
  id: TEST_USER_ID,
  world_id_hash: 'test-nullifier-hash-1',
  display_name: 'Alice Developer',
  roles: ['worker'],
  profession_category: 'software',
  wld_balance: 1000,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const fakeUser2 = {
  id: TEST_USER_ID_2,
  world_id_hash: 'test-nullifier-hash-2',
  display_name: 'Bob Client',
  roles: ['client'],
  profession_category: null,
  wld_balance: 500,
  created_at: '2025-01-02T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
};

export const fakeWorkerProfile = {
  id: 'wp-1',
  user_id: TEST_USER_ID,
  github_username: 'alice',
  github_data: {
    repos: [
      { name: 'react-app', language: 'TypeScript', stars: 45, created_at: '2023-01-01', updated_at: '2025-01-01', topics: ['react', 'frontend'] },
      { name: 'node-api', language: 'TypeScript', stars: 20, created_at: '2022-06-01', updated_at: '2024-12-01', topics: ['node', 'api'] },
    ],
    languages: ['TypeScript', 'JavaScript', 'Python'],
    totalCommits: 2341,
  },
  linkedin_data: {},
  other_platforms: {},
  computed_skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'GraphQL'],
  specializations: ['Full-stack', 'Web3', 'APIs'],
  years_experience: 5,
  overall_trust_score: 85,
  score_components: {
    developer_competence: 90,
    collaboration: 82,
    consistency: 85,
    specialization_depth: 88,
    activity_recency: 92,
    peer_trust: 78,
  },
  ingestion_status: 'completed',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
  user: { display_name: 'Alice Developer' },
};

export const fakeReviews = [
  {
    id: 'rev-1',
    reviewer_id: TEST_USER_ID_2,
    worker_id: TEST_USER_ID,
    rating: 5,
    content: 'Excellent work on our React dashboard. Delivered ahead of schedule.',
    job_category: 'software',
    stake_amount: 500,
    reviewer_trust_score_at_time: 72,
    is_flagged: false,
    flag_reason: null,
    status: 'active',
    created_at: '2025-05-01T00:00:00Z',
    reviewer: { display_name: 'Bob Client' },
  },
  {
    id: 'rev-2',
    reviewer_id: TEST_USER_ID_2,
    worker_id: TEST_USER_ID,
    rating: 4,
    content: 'Good communication, solid backend work.',
    job_category: 'software',
    stake_amount: 100,
    reviewer_trust_score_at_time: 72,
    is_flagged: false,
    flag_reason: null,
    status: 'active',
    created_at: '2025-04-01T00:00:00Z',
    reviewer: { display_name: 'Bob Client' },
  },
];

export const fakeAgent = {
  id: TEST_AGENT_ID,
  parent_user_id: TEST_USER_ID,
  name: 'Trading Bot',
  identifier: '0xABCDEF1234567890',
  identifier_type: 'wallet',
  inheritance_fraction: '0.70', // Supabase returns NUMERIC as string
  derived_score: 60,
  authorized_domains: ['defi', 'trading'],
  stake_amount: 200,
  status: 'active',
  dispute_count: 0,
  created_at: '2025-06-01T00:00:00Z',
  parent: {
    id: TEST_USER_ID,
    display_name: 'Alice Developer',
    worker_profiles: { overall_trust_score: 85 },
  },
};

export const fakeAgentMinimal = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  parent_user_id: TEST_USER_ID,
  name: 'Simple Agent',
  identifier: null,
  identifier_type: 'other',
  inheritance_fraction: '0.50',
  derived_score: 43,
  authorized_domains: [],
  stake_amount: 0,
  status: 'active',
  dispute_count: 0,
  created_at: '2025-07-01T00:00:00Z',
};

export const fakeChatSession = {
  id: TEST_SESSION_ID,
  client_id: TEST_USER_ID_2,
  worker_id: TEST_USER_ID,
  messages: [
    { role: 'user', content: 'What are their skills?', timestamp: '2025-06-01T10:00:00Z' },
    { role: 'assistant', content: 'They specialize in TypeScript and React.', timestamp: '2025-06-01T10:00:01Z' },
  ],
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T10:00:01Z',
};

/**
 * Generate a valid JWT for testing authenticated routes.
 */
export function makeTestToken(userId: string = TEST_USER_ID): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, worldIdHash: 'test-hash' },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
}
