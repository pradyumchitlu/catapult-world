import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import supabase from '../lib/supabase';

const OAUTH_SECRET = process.env.OAUTH_TOKEN_SECRET || process.env.JWT_SECRET || 'veridex-dev-secret';
const OAUTH_ISSUER = process.env.VERIDEX_PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const ID_TOKEN_TTL_SECONDS = 10 * 60;
const DEFAULT_SCOPES = ['openid', 'profile'] as const;
const SUPPORTED_SCOPES = new Set(DEFAULT_SCOPES);
const SUPPORTED_RESPONSE_MODE = new Set(['query', 'web_message']);

export interface OAuthApp {
  id: string;
  owner_user_id: string;
  name: string;
  client_id: string;
  client_secret_hash: string;
  redirect_uris: string[];
  allowed_origins: string[];
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface PublicOAuthApp {
  id: string;
  name: string;
  client_id: string;
  redirect_uris: string[];
  allowed_origins: string[];
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface CreatedOAuthApp extends PublicOAuthApp {
  client_secret: string;
}

export interface AuthorizeRequest {
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state: string;
  response_type: string;
  code_challenge: string;
  code_challenge_method: string;
  response_mode?: string;
}

export interface ValidatedAuthorizationRequest {
  app: OAuthApp;
  redirectUri: string;
  scopes: string[];
  responseMode: 'query' | 'web_message';
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

interface OAuthCodeRecord {
  id: string;
  app_id: string;
  user_id: string;
  code_hash: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface TokenClaims {
  sub: string;
  veridex_user_id: string;
  client_id: string;
  scope: string;
  token_use: 'access_token' | 'id_token';
  name?: string | null;
}

function randomToken(size = 24): string {
  return crypto.randomBytes(size).toString('base64url');
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeAbsoluteUrl(value: string): string {
  const raw = value.trim();
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported');
  }
  return parsed.toString();
}

function normalizeStringArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return [...new Set(input.map((item) => String(item).trim()).filter(Boolean))];
  }

  if (typeof input === 'string') {
    return [...new Set(
      input
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )];
  }

  return [];
}

function normalizeUriArray(input: unknown): string[] {
  return normalizeStringArray(input).map(normalizeAbsoluteUrl);
}

function normalizeScopes(scope: string | undefined, allowedScopes: string[] = [...DEFAULT_SCOPES]): string[] {
  const requestedScopes = normalizeStringArray(scope || allowedScopes.join(' ')).flatMap((entry) => entry.split(/\s+/));
  const uniqueScopes = [...new Set(requestedScopes.filter(Boolean))];

  if (uniqueScopes.length === 0) {
    return [...DEFAULT_SCOPES];
  }

  if (!uniqueScopes.includes('openid')) {
    throw new Error('scope must include openid');
  }

  for (const item of uniqueScopes) {
    if (!SUPPORTED_SCOPES.has(item as (typeof DEFAULT_SCOPES)[number])) {
      throw new Error(`Unsupported scope: ${item}`);
    }

    if (!allowedScopes.includes(item)) {
      throw new Error(`App is not allowed to request scope: ${item}`);
    }
  }

  return uniqueScopes.sort();
}

function serializeScope(scopes: string[]): string {
  return [...new Set(scopes)].sort().join(' ');
}

function sanitizeApp(app: OAuthApp): PublicOAuthApp {
  return {
    id: app.id,
    name: app.name,
    client_id: app.client_id,
    redirect_uris: app.redirect_uris || [],
    allowed_origins: app.allowed_origins || [],
    scopes: app.scopes || [...DEFAULT_SCOPES],
    created_at: app.created_at,
    updated_at: app.updated_at,
  };
}

function ensureCodeChallengeMethod(value: string): 'S256' {
  if (value !== 'S256') {
    throw new Error('code_challenge_method must be S256');
  }

  return value;
}

function verifySecret(secret: string, secretHash: string): boolean {
  const provided = Buffer.from(hashValue(secret), 'hex');
  const expected = Buffer.from(secretHash, 'hex');

  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

export function createPkceChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

export async function listOAuthApps(userId: string): Promise<PublicOAuthApp[]> {
  const { data, error } = await supabase
    .from('oauth_apps')
    .select('*')
    .eq('owner_user_id', userId);

  if (error) {
    throw error;
  }

  return (data || []).map((app: OAuthApp) => sanitizeApp(app));
}

export async function createOAuthApp(params: {
  userId: string;
  name: string;
  redirectUris: unknown;
  allowedOrigins?: unknown;
  scopes?: unknown;
}): Promise<CreatedOAuthApp> {
  const redirectUris = normalizeUriArray(params.redirectUris);
  const allowedOrigins = normalizeUriArray(params.allowedOrigins).map((url) => new URL(url).origin);
  const scopes = normalizeScopes(
    Array.isArray(params.scopes) ? (params.scopes as string[]).join(' ') : String(params.scopes || '')
  );

  if (!params.name.trim()) {
    throw new Error('App name is required');
  }

  if (redirectUris.length === 0) {
    throw new Error('At least one redirect URI is required');
  }

  const clientId = `vdx_cli_${randomToken(12)}`;
  const clientSecret = `vdx_sec_${randomToken(24)}`;
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from('oauth_apps')
    .insert({
      owner_user_id: params.userId,
      name: params.name.trim(),
      client_id: clientId,
      client_secret_hash: hashValue(clientSecret),
      redirect_uris: redirectUris,
      allowed_origins: allowedOrigins,
      scopes,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create OAuth app');
  }

  return {
    ...sanitizeApp(data as OAuthApp),
    client_secret: clientSecret,
  };
}

export async function updateOAuthApp(params: {
  userId: string;
  appId: string;
  name: string;
  redirectUris: unknown;
  allowedOrigins?: unknown;
  scopes?: unknown;
}): Promise<PublicOAuthApp> {
  const redirectUris = normalizeUriArray(params.redirectUris);
  const allowedOrigins = normalizeUriArray(params.allowedOrigins).map((url) => new URL(url).origin);
  const scopes = normalizeScopes(
    Array.isArray(params.scopes) ? (params.scopes as string[]).join(' ') : String(params.scopes || '')
  );

  if (!params.name.trim()) {
    throw new Error('App name is required');
  }

  if (redirectUris.length === 0) {
    throw new Error('At least one redirect URI is required');
  }

  const { data, error } = await supabase
    .from('oauth_apps')
    .update({
      name: params.name.trim(),
      redirect_uris: redirectUris,
      allowed_origins: allowedOrigins,
      scopes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.appId)
    .eq('owner_user_id', params.userId)
    .select('*')
    .single();

  if (error || !data) {
    throw error || new Error('Failed to update OAuth app');
  }

  return sanitizeApp(data as OAuthApp);
}

export async function getOAuthAppByClientId(clientId: string): Promise<OAuthApp | null> {
  const { data, error } = await supabase
    .from('oauth_apps')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OAuthApp | null) || null;
}

export async function validateAuthorizeRequest(input: AuthorizeRequest): Promise<ValidatedAuthorizationRequest> {
  if (input.response_type !== 'code') {
    throw new Error('response_type must be code');
  }

  if (!input.client_id || !input.redirect_uri || !input.state || !input.code_challenge) {
    throw new Error('client_id, redirect_uri, state, and code_challenge are required');
  }

  const app = await getOAuthAppByClientId(input.client_id);
  if (!app) {
    throw new Error('Unknown client_id');
  }

  const redirectUri = normalizeAbsoluteUrl(input.redirect_uri);
  if (!(app.redirect_uris || []).includes(redirectUri)) {
    throw new Error('redirect_uri is not registered for this app');
  }

  const responseMode = (input.response_mode || 'web_message') as 'query' | 'web_message';
  if (!SUPPORTED_RESPONSE_MODE.has(responseMode)) {
    throw new Error('Unsupported response_mode');
  }

  return {
    app,
    redirectUri,
    scopes: normalizeScopes(input.scope, app.scopes || [...DEFAULT_SCOPES]),
    responseMode,
    state: input.state,
    codeChallenge: input.code_challenge,
    codeChallengeMethod: ensureCodeChallengeMethod(input.code_challenge_method),
  };
}

export async function createAuthorizationCode(params: {
  userId: string;
  authorization: ValidatedAuthorizationRequest;
}): Promise<string> {
  const rawCode = `vdx_code_${randomToken(24)}`;
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();

  const { error } = await supabase
    .from('oauth_authorization_codes')
    .insert({
      app_id: params.authorization.app.id,
      user_id: params.userId,
      code_hash: hashValue(rawCode),
      redirect_uri: params.authorization.redirectUri,
      scope: serializeScope(params.authorization.scopes),
      code_challenge: params.authorization.codeChallenge,
      code_challenge_method: params.authorization.codeChallengeMethod,
      expires_at: expiresAt,
    });

  if (error) {
    throw error;
  }

  return rawCode;
}

async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw error || new Error('User not found');
  }

  return data as {
    id: string;
    display_name: string | null;
    roles?: string[];
  };
}

export async function exchangeAuthorizationCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const app = await getOAuthAppByClientId(params.clientId);
  if (!app) {
    throw new Error('Unknown client_id');
  }

  if (!params.clientSecret || !verifySecret(params.clientSecret, app.client_secret_hash)) {
    throw new Error('Invalid client_secret');
  }

  const normalizedRedirectUri = normalizeAbsoluteUrl(params.redirectUri);
  const { data, error } = await supabase
    .from('oauth_authorization_codes')
    .select('*')
    .eq('code_hash', hashValue(params.code))
    .maybeSingle();

  if (error) {
    throw error;
  }

  const authCode = data as OAuthCodeRecord | null;
  if (!authCode) {
    throw new Error('Invalid authorization code');
  }

  if (authCode.app_id !== app.id) {
    throw new Error('Authorization code was not issued to this client');
  }

  if (authCode.redirect_uri !== normalizedRedirectUri) {
    throw new Error('redirect_uri does not match the original request');
  }

  if (authCode.used_at) {
    throw new Error('Authorization code has already been used');
  }

  if (new Date(authCode.expires_at).getTime() <= Date.now()) {
    throw new Error('Authorization code has expired');
  }

  if (createPkceChallenge(params.codeVerifier) !== authCode.code_challenge) {
    throw new Error('PKCE verification failed');
  }

  const user = await getUserById(authCode.user_id);

  const scope = authCode.scope || 'openid profile';
  const accessToken = jwt.sign(
    {
      sub: user.id,
      veridex_user_id: user.id,
      client_id: app.client_id,
      scope,
      token_use: 'access_token',
    } satisfies TokenClaims,
    OAUTH_SECRET,
    {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: OAUTH_ISSUER,
      audience: app.client_id,
    }
  );

  const idToken = jwt.sign(
    {
      sub: user.id,
      veridex_user_id: user.id,
      client_id: app.client_id,
      scope,
      token_use: 'id_token',
      name: scope.includes('profile') ? user.display_name : undefined,
    } satisfies TokenClaims,
    OAUTH_SECRET,
    {
      expiresIn: ID_TOKEN_TTL_SECONDS,
      issuer: OAUTH_ISSUER,
      audience: app.client_id,
    }
  );

  const { error: updateError } = await supabase
    .from('oauth_authorization_codes')
    .update({
      used_at: new Date().toISOString(),
    })
    .eq('id', authCode.id);

  if (updateError) {
    throw updateError;
  }

  return {
    access_token: accessToken,
    id_token: idToken,
    token_type: 'Bearer' as const,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope,
    veridex_user_id: user.id,
  };
}

export async function getUserInfoFromAccessToken(token: string) {
  const payload = jwt.verify(token, OAUTH_SECRET, {
    issuer: OAUTH_ISSUER,
  }) as jwt.JwtPayload & TokenClaims;

  if (payload.token_use !== 'access_token') {
    throw new Error('Token is not an access token');
  }

  const user = await getUserById(payload.sub);
  const scopes = normalizeStringArray(payload.scope).flatMap((entry) => entry.split(/\s+/));
  const hasProfile = scopes.includes('profile');

  return {
    sub: user.id,
    veridex_user_id: user.id,
    ...(hasProfile ? { name: user.display_name, display_name: user.display_name } : {}),
  };
}

export function getOAuthIssuer(): string {
  return OAUTH_ISSUER;
}
