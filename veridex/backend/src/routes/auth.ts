import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { signRequest } from '@worldcoin/idkit-server';
import supabase from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { syncWorkerReputation } from '../services/reputationIngestion';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'veridex-dev-secret';
const WORLD_APP_ID = process.env.WORLD_APP_ID || '';
const WORLD_RP_ID = process.env.WORLD_RP_ID || '';
const WORLD_ID_PRIVATE_KEY = process.env.WORLD_ID_PRIVATE_KEY || '';

/**
 * GET /api/auth/rp-context
 * Generate a signed RP context for the IDKit widget
 */
router.get('/rp-context', (req: Request, res: Response) => {
  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: WORLD_ID_PRIVATE_KEY,
      action: process.env.WORLD_ID_ACTION || 'verify-human',
    });

    return res.json({
      rp_id: WORLD_RP_ID,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
      signature: sig,
    });
  } catch (error) {
    console.error('rp-context error:', error);
    return res.status(500).json({ error: 'Failed to generate RP context' });
  }
});

// Legacy dev-mode format (mock button)
interface WorldIdProofLegacy {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}

// IDKit result format (real widget)
interface IDKitResult {
  protocol_version: string;
  nonce: string;
  action?: string;
  responses: Array<{
    identifier: string;
    nullifier: string;
    merkle_root?: string;
    proof?: string | string[];
    [key: string]: any;
  }>;
  environment?: string;
}

function generateToken(userId: string, worldIdHash: string): string {
  return jwt.sign({ userId, worldIdHash }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * POST /api/auth/verify
 * Accepts either the full IDKit result (real widget) or legacy mock format.
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Determine nullifier_hash (the unique user identifier) regardless of format
    let nullifier_hash: string;
    let idkitResult: IDKitResult | null = null;

    if (body.protocol_version && body.responses) {
      // Real IDKit result
      idkitResult = body as IDKitResult;
      nullifier_hash = idkitResult.responses[0]?.nullifier;
      if (!nullifier_hash) {
        return res.status(400).json({ error: 'Missing nullifier in proof' });
      }
    } else if (body.nullifier_hash) {
      // Dev mock format
      nullifier_hash = body.nullifier_hash;
      if (!body.merkle_root || !body.proof) {
        return res.status(400).json({ error: 'Invalid proof data' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid proof data' });
    }

    // Verify with World ID API (skip in dev mode)
    if (process.env.DEV_SKIP_WORLDID_VERIFY !== 'true') {
      // Forward the IDKit result directly — it already has the correct nonce, action, and responses
      const verifyBody = idkitResult
        ? { ...idkitResult, environment: 'production' }
        : {
            // Legacy format fallback
            protocol_version: '3.0',
            nonce: body.nullifier_hash,
            action: process.env.WORLD_ID_ACTION || 'verify-human',
            responses: [
              {
                identifier: 'orb',
                merkle_root: body.merkle_root,
                nullifier: body.nullifier_hash,
                proof: body.proof,
              },
            ],
            environment: 'production',
          };

      const verifyRes = await fetch(
        `https://developer.world.org/api/v4/verify/${WORLD_RP_ID}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verifyBody),
        }
      );

      const verifyData = (await verifyRes.json()) as { success: boolean; nullifier?: string; detail?: string; code?: string };
      console.log('World ID verify response:', JSON.stringify(verifyData));

      if (!verifyData.success) {
        return res.status(400).json({
          error: 'World ID verification failed',
          detail: verifyData.detail || verifyData.code,
        });
      }

      // Use the nullifier returned by World ID API as the canonical identifier
      if (verifyData.nullifier) nullifier_hash = verifyData.nullifier;
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('world_id_hash', nullifier_hash)
      .single();

    if (existingUser) {
      const token = generateToken(existingUser.id, nullifier_hash);
      return res.json({
        success: true,
        user: existingUser,
        isNewUser: false,
        token,
      });
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        world_id_hash: nullifier_hash,
        wld_balance: 1000,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const token = generateToken(newUser.id, nullifier_hash);

    return res.json({
      success: true,
      user: newUser,
      isNewUser: true,
      token,
    });
  } catch (error) {
    console.error('Auth verify error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

/**
 * PUT /api/auth/profile
 * Update user profile (display name, roles, profession)
 */
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { display_name, roles, profession_category } = req.body;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        display_name,
        roles,
        profession_category,
      })
      .eq('id', req.userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // If user selected 'worker' role, ensure a worker_profiles row exists
    if (roles && roles.includes('worker')) {
      const { data: existingProfile } = await supabase
        .from('worker_profiles')
        .select('id')
        .eq('user_id', req.userId)
        .single();

      if (!existingProfile) {
        await supabase
          .from('worker_profiles')
          .insert({ user_id: req.userId });
      }
    }

    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL || 'http://localhost:8000/api/auth/github/callback';
  const scope = 'read:user';
  const userToken = req.query.token as string | undefined;

  if (!clientId) {
    return res.status(500).json({ error: 'Missing GitHub OAuth configuration' });
  }

  if (!userToken) {
    return res.status(400).json({ error: 'Missing auth token' });
  }

  let userId: string;
  try {
    const decoded = jwt.verify(userToken, JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  // Sign a short-lived state token so GitHub never sees the user's app JWT.
  const state = jwt.sign({ userId, provider: 'github' }, JWT_SECRET, { expiresIn: '10m' });

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

  res.redirect(authUrl);
});

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!code) {
      return res.redirect(`${frontendUrl}/onboarding?github=error&reason=missing_code`);
    }

    // Decode the short-lived signed state token to get the Veridex user.
    let userId: string | null = null;
    if (typeof state === 'string') {
      try {
        const stateData = jwt.verify(state, JWT_SECRET) as { userId?: string; provider?: string };
        if (stateData.provider === 'github' && stateData.userId) {
          userId = stateData.userId;
        }
      } catch (e) {
        console.error('Failed to decode OAuth state:', e);
      }
    }

    if (!userId) {
      return res.redirect(`${frontendUrl}/onboarding?github=error&reason=missing_state`);
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as { error?: string; access_token?: string };

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange failed:', tokenData);
      return res.redirect(`${frontendUrl}/onboarding?github=error&reason=token_exchange`);
    }

    // Fetch GitHub user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const githubUser = (await userRes.json()) as Record<string, any>;

    if (!githubUser.login) {
      console.error('GitHub user fetch failed:', githubUser);
      return res.redirect(`${frontendUrl}/onboarding?github=error&reason=user_fetch`);
    }

    const { warning } = await syncWorkerReputation(userId, {
      presetGithubUsername: githubUser.login as string,
      presetGithubData: {
        username: githubUser.login,
        name: githubUser.name ?? null,
        bio: githubUser.bio ?? null,
        public_repos: githubUser.public_repos ?? 0,
        followers: githubUser.followers ?? 0,
        following: githubUser.following ?? 0,
        created_at: githubUser.created_at ?? '',
        oauth_connected_at: new Date().toISOString(),
        profile: {
          id: githubUser.id,
          name: githubUser.name ?? null,
          avatar_url: githubUser.avatar_url ?? null,
          bio: githubUser.bio ?? null,
          public_repos: githubUser.public_repos ?? 0,
          followers: githubUser.followers ?? 0,
          created_at: githubUser.created_at ?? '',
        },
      },
      githubAccessToken: tokenData.access_token,
    });

    if (warning) {
      console.warn('GitHub OAuth sync warning:', warning);
    }

    res.redirect(`${frontendUrl}/onboarding?github=connected`);
  } catch (error) {
    console.error('GitHub callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/onboarding?github=error`);
  }
});

export default router;
