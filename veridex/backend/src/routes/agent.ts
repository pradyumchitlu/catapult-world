import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { spawnAgent, lookupAgent } from '../services/agent';

const router = Router();

/**
 * POST /api/agent/spawn
 * Create a new agent tied to the user
 */
router.post('/spawn', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.userId!;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Agent name is required' });
    }

    // Get user's worker profile for trust score
    const { data: profile, error: profileError } = await supabase
      .from('worker_profiles')
      .select('overall_trust_score')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      // User might not have a worker profile yet, that's ok
      console.log('No worker profile found for user');
    }

    const parentScore = profile?.overall_trust_score || 0;
    const agent = await spawnAgent(userId, name, parentScore);

    return res.json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('Spawn agent error:', error);
    return res.status(500).json({ error: 'Failed to spawn agent' });
  }
});

/**
 * GET /api/agent/list/:userId
 * List agents for a user
 */
router.get('/list/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        *,
        parent:parent_user_id(
          id,
          display_name,
          worker_profiles(overall_trust_score)
        )
      `)
      .eq('parent_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({ agents: agents || [] });
  } catch (error) {
    console.error('List agents error:', error);
    return res.status(500).json({ error: 'Failed to list agents' });
  }
});

/**
 * GET /api/agent/:agentId
 * Lookup an agent (public endpoint, handled in query.ts)
 * This route is here for direct agent management if needed
 */
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await lookupAgent(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({ agent });
  } catch (error) {
    console.error('Lookup agent error:', error);
    return res.status(500).json({ error: 'Lookup failed' });
  }
});

export default router;
