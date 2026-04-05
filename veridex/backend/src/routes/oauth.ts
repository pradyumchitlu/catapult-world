import { Request, Response, Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import {
  createAuthorizationCode,
  createOAuthApp,
  exchangeAuthorizationCode,
  getOAuthIssuer,
  getUserInfoFromAccessToken,
  listOAuthApps,
  updateOAuthApp,
  validateAuthorizeRequest,
} from '../services/oauth';

const router = Router();

router.get('/apps', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apps = await listOAuthApps(req.userId!);
    return res.json({ apps });
  } catch (error) {
    console.error('List OAuth apps error:', error);
    return res.status(500).json({ error: 'Failed to list OAuth apps' });
  }
});

router.post('/apps', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const app = await createOAuthApp({
      userId: req.userId!,
      name: String(req.body?.name || ''),
      redirectUris: req.body?.redirect_uris,
      allowedOrigins: req.body?.allowed_origins,
      scopes: req.body?.scopes,
    });

    return res.status(201).json({ app });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create OAuth app';
    const status = /required|Unsupported|Only http/i.test(message) ? 400 : 500;
    console.error('Create OAuth app error:', error);
    return res.status(status).json({ error: message });
  }
});

router.put('/apps/:appId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const app = await updateOAuthApp({
      userId: req.userId!,
      appId: req.params.appId,
      name: String(req.body?.name || ''),
      redirectUris: req.body?.redirect_uris,
      allowedOrigins: req.body?.allowed_origins,
      scopes: req.body?.scopes,
    });

    return res.json({ app });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update OAuth app';
    const status = /required|Unsupported|Only http/i.test(message) ? 400 : 500;
    console.error('Update OAuth app error:', error);
    return res.status(status).json({ error: message });
  }
});

router.post('/authorize/validate', async (req: Request, res: Response) => {
  try {
    const authorization = await validateAuthorizeRequest({
      client_id: String(req.body?.client_id || ''),
      redirect_uri: String(req.body?.redirect_uri || ''),
      scope: typeof req.body?.scope === 'string' ? req.body.scope : undefined,
      state: String(req.body?.state || ''),
      response_type: String(req.body?.response_type || ''),
      code_challenge: String(req.body?.code_challenge || ''),
      code_challenge_method: String(req.body?.code_challenge_method || ''),
      response_mode: typeof req.body?.response_mode === 'string' ? req.body.response_mode : undefined,
    });

    return res.json({
      app: {
        name: authorization.app.name,
        client_id: authorization.app.client_id,
      },
      redirect_uri: authorization.redirectUri,
      scope: authorization.scopes.join(' '),
      state: authorization.state,
      response_mode: authorization.responseMode,
      issuer: getOAuthIssuer(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authorize validation failed';
    return res.status(400).json({ error: message });
  }
});

router.post('/authorize/complete', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorization = await validateAuthorizeRequest({
      client_id: String(req.body?.client_id || ''),
      redirect_uri: String(req.body?.redirect_uri || ''),
      scope: typeof req.body?.scope === 'string' ? req.body.scope : undefined,
      state: String(req.body?.state || ''),
      response_type: String(req.body?.response_type || ''),
      code_challenge: String(req.body?.code_challenge || ''),
      code_challenge_method: String(req.body?.code_challenge_method || ''),
      response_mode: typeof req.body?.response_mode === 'string' ? req.body.response_mode : undefined,
    });

    const code = await createAuthorizationCode({
      userId: req.userId!,
      authorization,
    });

    return res.json({
      code,
      state: authorization.state,
      redirect_uri: authorization.redirectUri,
      response_mode: authorization.responseMode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authorize failed';
    return res.status(400).json({ error: message });
  }
});

router.post('/token', async (req: Request, res: Response) => {
  try {
    const grantType = String(req.body?.grant_type || '');
    if (grantType !== 'authorization_code') {
      return res.status(400).json({ error: 'grant_type must be authorization_code' });
    }

    const response = await exchangeAuthorizationCode({
      clientId: String(req.body?.client_id || ''),
      clientSecret: String(req.body?.client_secret || ''),
      code: String(req.body?.code || ''),
      redirectUri: String(req.body?.redirect_uri || ''),
      codeVerifier: String(req.body?.code_verifier || ''),
    });

    return res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token exchange failed';
    return res.status(400).json({ error: message });
  }
});

router.get('/userinfo', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const userInfo = await getUserInfoFromAccessToken(authHeader.substring(7));
    return res.json(userInfo);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'User info lookup failed';
    return res.status(401).json({ error: message });
  }
});

export default router;
