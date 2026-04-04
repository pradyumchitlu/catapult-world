import { Router, Request, Response } from 'express';
import supabase from '../lib/supabase';

const router = Router();

interface WorldIdProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}

/**
 * POST /api/auth/verify
 * Verify World ID proof and create/update user
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const proof: WorldIdProof = req.body;

    if (!proof.merkle_root || !proof.nullifier_hash || !proof.proof) {
      return res.status(400).json({ error: 'Invalid proof data' });
    }

    // TODO: Verify the World ID proof with World ID API
    // const verifyRes = await fetch('https://developer.worldcoin.org/api/v1/verify', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     action: process.env.WORLD_ID_ACTION,
    //     signal: '',
    //     proof: proof.proof,
    //     merkle_root: proof.merkle_root,
    //     nullifier_hash: proof.nullifier_hash,
    //   }),
    // });

    // For now, simulate successful verification
    const isValid = true;

    if (!isValid) {
      return res.status(400).json({ error: 'World ID verification failed' });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('world_id_hash', proof.nullifier_hash)
      .single();

    if (existingUser) {
      // User exists, return session
      return res.json({
        success: true,
        user: existingUser,
        isNewUser: false,
      });
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        world_id_hash: proof.nullifier_hash,
        wld_balance: 1000, // Starting balance
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      user: newUser,
      isNewUser: true,
    });
  } catch (error) {
    console.error('Auth verify error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', (req: Request, res: Response) => {
  // TODO: Implement GitHub OAuth redirect
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const scope = 'read:user repo';

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

  res.redirect(authUrl);
});

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // TODO: Exchange code for access token
    // const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Accept: 'application/json',
    //   },
    //   body: JSON.stringify({
    //     client_id: process.env.GITHUB_CLIENT_ID,
    //     client_secret: process.env.GITHUB_CLIENT_SECRET,
    //     code,
    //   }),
    // });

    // TODO: Fetch user info and store in worker_profiles

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/onboarding?github=connected`);
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/onboarding?github=error`);
  }
});

export default router;
