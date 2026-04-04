/**
 * Integration tests for contextual score route (POST /api/contextual-score)
 * Tests scoring pipeline, caching, optional auth.
 */

import '../setup';

import request from 'supertest';
import app from '../../index';
import { __setMockResponse, __resetMocks } from '../../__mocks__/supabase';
import {
  TEST_USER_ID,
  TEST_USER_ID_2,
  fakeUser2,
  fakeWorkerProfile,
  fakeReviews,
  makeTestToken,
} from '../fixtures';

const clientToken = makeTestToken(TEST_USER_ID_2);

beforeEach(() => {
  __resetMocks();
  // Auth middleware might be called (optional auth)
  __setMockResponse('users', 'select', { data: fakeUser2, error: null });
});

describe('POST /api/contextual-score', () => {
  it('should compute contextual score for a valid worker and JD', async () => {
    __setMockResponse('worker_profiles', 'select', { data: fakeWorkerProfile, error: null });
    __setMockResponse('reviews', 'select', { data: fakeReviews, error: null });
    // Cache insert
    __setMockResponse('contextual_scores', 'insert', { data: null, error: null });
    // Query log
    __setMockResponse('query_log', 'insert', { data: null, error: null });

    const res = await request(app)
      .post('/api/contextual-score')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        worker_id: TEST_USER_ID,
        job_description: 'Senior TypeScript developer with React experience needed for DeFi project.',
      });

    expect(res.status).toBe(200);
    expect(res.body.fit_score).toBeDefined();
    expect(typeof res.body.fit_score).toBe('number');
    expect(res.body.fit_score).toBeGreaterThanOrEqual(0);
    expect(res.body.fit_score).toBeLessThanOrEqual(100);
    expect(res.body.breakdown).toBeDefined();
    expect(res.body.breakdown.met).toBeDefined();
    expect(res.body.breakdown.partial).toBeDefined();
    expect(res.body.breakdown.missing).toBeDefined();
    expect(res.body.worker_name).toBe('Alice Developer');
    expect(res.body.overall_trust_score).toBe(85);
  });

  it('should work without authentication (optional auth)', async () => {
    __setMockResponse('worker_profiles', 'select', { data: fakeWorkerProfile, error: null });
    __setMockResponse('reviews', 'select', { data: fakeReviews, error: null });
    __setMockResponse('contextual_scores', 'insert', { data: null, error: null });
    __setMockResponse('query_log', 'insert', { data: null, error: null });

    const res = await request(app)
      .post('/api/contextual-score')
      // No Authorization header
      .send({
        worker_id: TEST_USER_ID,
        job_description: 'Frontend developer needed.',
      });

    expect(res.status).toBe(200);
    expect(res.body.fit_score).toBeDefined();
  });

  it('should reject missing worker_id', async () => {
    const res = await request(app)
      .post('/api/contextual-score')
      .send({ job_description: 'Some job' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/worker_id|job_description/i);
  });

  it('should reject missing job_description', async () => {
    const res = await request(app)
      .post('/api/contextual-score')
      .send({ worker_id: TEST_USER_ID });

    expect(res.status).toBe(400);
  });

  it('should return 404 when worker not found', async () => {
    __setMockResponse('worker_profiles', 'select', { data: null, error: { code: 'PGRST116' } });

    const res = await request(app)
      .post('/api/contextual-score')
      .send({
        worker_id: 'nonexistent',
        job_description: 'Any job',
      });

    expect(res.status).toBe(404);
  });

  it('should return met requirements for TypeScript when worker has it', async () => {
    __setMockResponse('worker_profiles', 'select', { data: fakeWorkerProfile, error: null });
    __setMockResponse('reviews', 'select', { data: [], error: null });
    __setMockResponse('contextual_scores', 'insert', { data: null, error: null });
    __setMockResponse('query_log', 'insert', { data: null, error: null });

    const res = await request(app)
      .post('/api/contextual-score')
      .send({
        worker_id: TEST_USER_ID,
        job_description: 'TypeScript developer needed',
      });

    expect(res.status).toBe(200);
    const metNames = res.body.breakdown.met.map((m: any) => m.requirement);
    expect(metNames).toContain('TypeScript');
  });

  it('should include worker reviews in scoring context', async () => {
    __setMockResponse('worker_profiles', 'select', { data: fakeWorkerProfile, error: null });
    __setMockResponse('reviews', 'select', { data: fakeReviews, error: null });
    __setMockResponse('contextual_scores', 'insert', { data: null, error: null });
    __setMockResponse('query_log', 'insert', { data: null, error: null });

    const res = await request(app)
      .post('/api/contextual-score')
      .send({
        worker_id: TEST_USER_ID,
        job_description: 'Looking for someone with great reviews',
      });

    // The score should be computed — reviews are passed to the LLM
    expect(res.status).toBe(200);
    expect(res.body.fit_score).toBeGreaterThanOrEqual(0);
  });
});
