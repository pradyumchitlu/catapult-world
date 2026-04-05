/**
 * Integration tests for chat route (POST /api/chat)
 * Tests session creation, session persistence, message flow, auth.
 */

import '../setup';

import request from 'supertest';
import app from '../../index';
import { __setMockResponse, __resetMocks } from '../../__mocks__/supabase';
import {
  TEST_USER_ID,
  TEST_USER_ID_2,
  TEST_SESSION_ID,
  fakeUser,
  fakeUser2,
  fakeWorkerProfile,
  fakeReviews,
  fakeChatSession,
  makeTestToken,
} from '../fixtures';

// Token for user 2 (the client asking about user 1)
const clientToken = makeTestToken(TEST_USER_ID_2);

beforeEach(() => {
  __resetMocks();
  // Auth middleware user lookup — return user2 as the authenticated client
  __setMockResponse('users', 'select', { data: fakeUser2, error: null });
});

describe('POST /api/chat', () => {
  it('should create a new chat session and return AI response', async () => {
    // Worker profile lookup
    __setMockResponse('worker_profiles', 'select', { data: fakeWorkerProfile, error: null });
    // Reviews lookup
    __setMockResponse('reviews', 'select', { data: fakeReviews, error: null });
    // No existing session — create new
    __setMockResponse('chat_sessions', 'select', { data: null, error: { code: 'PGRST116' } });
    __setMockResponse('chat_sessions', 'insert', {
      data: {
        id: 'new-session-id',
        client_id: TEST_USER_ID_2,
        worker_id: TEST_USER_ID,
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    // Session update after adding messages
    __setMockResponse('chat_sessions', 'update', { data: null, error: null });
    // Query log
    __setMockResponse('query_log', 'insert', { data: null, error: null });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        worker_id: TEST_USER_ID,
        message: 'What are their strongest skills?',
      });

    expect(res.status).toBe(200);
    expect(res.body.session_id).toBeDefined();
    expect(res.body.message).toBeDefined();
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('should reuse an existing session when session_id is provided', async () => {
    __setMockResponse('worker_profiles', 'select', { data: fakeWorkerProfile, error: null });
    __setMockResponse('reviews', 'select', { data: fakeReviews, error: null });
    // Return existing session
    __setMockResponse('chat_sessions', 'select', { data: fakeChatSession, error: null });
    __setMockResponse('chat_sessions', 'update', { data: null, error: null });
    __setMockResponse('query_log', 'insert', { data: null, error: null });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        worker_id: TEST_USER_ID,
        message: 'Follow-up question about their React experience',
        session_id: TEST_SESSION_ID,
      });

    expect(res.status).toBe(200);
    expect(res.body.session_id).toBe(TEST_SESSION_ID);
    expect(res.body.message).toBeDefined();
  });

  it('should reject missing worker_id', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ message: 'Hello' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/worker_id|message/i);
  });

  it('should reject missing message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ worker_id: TEST_USER_ID });

    expect(res.status).toBe(400);
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        worker_id: TEST_USER_ID,
        message: 'Unauthenticated question',
      });

    expect(res.status).toBe(401);
  });

  it('should return 404 when worker profile not found', async () => {
    __setMockResponse('worker_profiles', 'select', { data: null, error: { code: 'PGRST116' } });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        worker_id: 'nonexistent-worker',
        message: 'Hello?',
      });

    expect(res.status).toBe(404);
  });
});
