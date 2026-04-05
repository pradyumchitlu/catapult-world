import '../setup';

import request from 'supertest';
import app from '../../index';
import { __resetMocks, __setMockResponse } from '../../__mocks__/supabase';
import { TEST_USER_ID, fakeUser, makeTestToken } from '../fixtures';
import { createPkceChallenge } from '../../services/oauth';

const token = makeTestToken(TEST_USER_ID);

const fakeOAuthApp = {
  id: 'oauth-app-1',
  owner_user_id: TEST_USER_ID,
  name: 'Acme Marketplace',
  client_id: 'vdx_cli_testapp',
  client_secret_hash: 'placeholder',
  redirect_uris: ['https://partner.example.com/auth/callback'],
  allowed_origins: ['https://partner.example.com'],
  scopes: ['openid', 'profile'],
  created_at: '2026-04-05T10:00:00.000Z',
  updated_at: '2026-04-05T10:00:00.000Z',
};

beforeEach(() => {
  __resetMocks();
  __setMockResponse('users', 'select', { data: fakeUser, error: null });
});

describe('OAuth routes', () => {
  it('lists OAuth apps for the authenticated developer', async () => {
    __setMockResponse('oauth_apps', 'select', { data: [fakeOAuthApp], error: null });

    const res = await request(app)
      .get('/api/oauth/apps')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.apps).toHaveLength(1);
    expect(res.body.apps[0].client_id).toBe(fakeOAuthApp.client_id);
    expect(res.body.apps[0].client_secret_hash).toBeUndefined();
  });

  it('validates an embedded login authorize request', async () => {
    __setMockResponse('oauth_apps', 'select', { data: fakeOAuthApp, error: null });

    const res = await request(app)
      .post('/api/oauth/authorize/validate')
      .send({
        client_id: fakeOAuthApp.client_id,
        redirect_uri: 'https://partner.example.com/auth/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state-123',
        code_challenge: 'challenge-123',
        code_challenge_method: 'S256',
        response_mode: 'web_message',
      });

    expect(res.status).toBe(200);
    expect(res.body.app.name).toBe(fakeOAuthApp.name);
    expect(res.body.response_mode).toBe('web_message');
    expect(res.body.scope).toBe('openid profile');
  });

  it('creates an authorization code without changing first-party auth', async () => {
    __setMockResponse('oauth_apps', 'select', { data: fakeOAuthApp, error: null });
    __setMockResponse('oauth_authorization_codes', 'insert', { data: null, error: null });

    const res = await request(app)
      .post('/api/oauth/authorize/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        client_id: fakeOAuthApp.client_id,
        redirect_uri: 'https://partner.example.com/auth/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state-123',
        code_challenge: 'challenge-123',
        code_challenge_method: 'S256',
        response_mode: 'web_message',
      });

    expect(res.status).toBe(200);
    expect(typeof res.body.code).toBe('string');
    expect(res.body.state).toBe('state-123');
    expect(res.body.response_mode).toBe('web_message');
  });

  it('exchanges an authorization code for partner tokens', async () => {
    const clientSecret = 'vdx_sec_live_secret';
    const code = 'vdx_code_live_code';
    const codeVerifier = 'pkce-verifier-123';
    const codeChallenge = createPkceChallenge(codeVerifier);

    const crypto = require('crypto');
    const clientSecretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');

    __setMockResponse('oauth_apps', 'select', {
      data: { ...fakeOAuthApp, client_secret_hash: clientSecretHash },
      error: null,
    });
    __setMockResponse('oauth_authorization_codes', 'select', {
      data: {
        id: 'oauth-code-1',
        app_id: fakeOAuthApp.id,
        user_id: TEST_USER_ID,
        code_hash: crypto.createHash('sha256').update(code).digest('hex'),
        redirect_uri: 'https://partner.example.com/auth/callback',
        scope: 'openid profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        expires_at: '2099-01-01T00:00:00.000Z',
        used_at: null,
        created_at: '2026-04-05T10:00:00.000Z',
      },
      error: null,
    });
    __setMockResponse('oauth_authorization_codes', 'update', { data: null, error: null });

    const res = await request(app)
      .post('/api/oauth/token')
      .send({
        grant_type: 'authorization_code',
        client_id: fakeOAuthApp.client_id,
        client_secret: clientSecret,
        code,
        redirect_uri: 'https://partner.example.com/auth/callback',
        code_verifier: codeVerifier,
      });

    expect(res.status).toBe(200);
    expect(res.body.token_type).toBe('Bearer');
    expect(typeof res.body.access_token).toBe('string');
    expect(typeof res.body.id_token).toBe('string');
    expect(res.body.veridex_user_id).toBe(TEST_USER_ID);
  });

  it('returns userinfo for a valid OAuth access token', async () => {
    const clientSecret = 'vdx_sec_live_secret';
    const code = 'vdx_code_live_code';
    const codeVerifier = 'pkce-verifier-123';
    const codeChallenge = createPkceChallenge(codeVerifier);

    const crypto = require('crypto');
    const clientSecretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');

    __setMockResponse('oauth_apps', 'select', {
      data: { ...fakeOAuthApp, client_secret_hash: clientSecretHash },
      error: null,
    });
    __setMockResponse('oauth_authorization_codes', 'select', {
      data: {
        id: 'oauth-code-2',
        app_id: fakeOAuthApp.id,
        user_id: TEST_USER_ID,
        code_hash: crypto.createHash('sha256').update(code).digest('hex'),
        redirect_uri: 'https://partner.example.com/auth/callback',
        scope: 'openid profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        expires_at: '2099-01-01T00:00:00.000Z',
        used_at: null,
        created_at: '2026-04-05T10:00:00.000Z',
      },
      error: null,
    });
    __setMockResponse('oauth_authorization_codes', 'update', { data: null, error: null });

    const tokenRes = await request(app)
      .post('/api/oauth/token')
      .send({
        grant_type: 'authorization_code',
        client_id: fakeOAuthApp.client_id,
        client_secret: clientSecret,
        code,
        redirect_uri: 'https://partner.example.com/auth/callback',
        code_verifier: codeVerifier,
      });

    expect(tokenRes.status).toBe(200);

    __setMockResponse('users', 'select', { data: fakeUser, error: null });

    const userInfoRes = await request(app)
      .get('/api/oauth/userinfo')
      .set('Authorization', `Bearer ${tokenRes.body.access_token}`);

    expect(userInfoRes.status).toBe(200);
    expect(userInfoRes.body.sub).toBe(TEST_USER_ID);
    expect(userInfoRes.body.veridex_user_id).toBe(TEST_USER_ID);
    expect(userInfoRes.body.display_name).toBe(fakeUser.display_name);
  });
});
