import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { registerAgent, lookupAgent } from '../services/agent';

const router = Router();

/**
 * POST /api/agent/spawn
 * Register a new Agent Credential tied to the authenticated user.
 */
router.post('/spawn', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, identifier, identifier_type, inheritance_fraction, authorized_domains, stake_amount } = req.body;
    const userId = req.userId!;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Agent name is required' });
    }

    // Validate inheritance_fraction if provided
    if (inheritance_fraction !== undefined) {
      const fraction = parseFloat(inheritance_fraction);
      if (isNaN(fraction) || fraction < 0 || fraction > 1) {
        return res.status(400).json({ error: 'inheritance_fraction must be between 0 and 1' });
      }
    }

    // Validate stake_amount if provided
    if (stake_amount !== undefined && stake_amount < 0) {
      return res.status(400).json({ error: 'stake_amount cannot be negative' });
    }

    // Get user's worker profile for trust score
    const { data: profile, error: profileError } = await supabase
      .from('worker_profiles')
      .select('overall_trust_score')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.log('No worker profile found for user');
    }

    const parentScore = profile?.overall_trust_score || 0;
    const agent = await registerAgent({
      userId,
      name,
      parentScore,
      identifier,
      identifier_type,
      inheritance_fraction: inheritance_fraction !== undefined ? parseFloat(inheritance_fraction) : undefined,
      authorized_domains,
      stake_amount: stake_amount !== undefined ? parseInt(stake_amount) : undefined,
    });

    return res.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    console.error('Register agent error:', error);
    const message = error.message || 'Failed to register agent';
    const status = message.includes('Insufficient') ? 400 : 500;
    return res.status(status).json({ error: message });
  }
});

/**
 * GET /api/agent/list/:userId
 * List agent credentials for a user
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
 * Public verification endpoint — counterparties call this to verify an agent credential.
 * Returns: is_verified, effective trust, authorized domains, stake backing.
 */
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await lookupAgent(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found', is_verified: false });
    }

    return res.json({
      is_verified: agent.status === 'active',
      agent: {
        id: agent.id,
        name: agent.name,
        identifier: agent.identifier,
        identifier_type: agent.identifier_type,
        effective_trust: agent.derived_score,
        inheritance_fraction: agent.inheritance_fraction,
        authorized_domains: agent.authorized_domains,
        stake_amount: agent.stake_amount,
        status: agent.status,
        dispute_count: agent.dispute_count,
        created_at: agent.created_at,
      },
      parent: {
        display_name: agent.parent.display_name,
        trust_score: agent.parent.overall_trust_score,
      },
    });
  } catch (error) {
    console.error('Lookup agent error:', error);
    return res.status(500).json({ error: 'Lookup failed' });
  }
});

export default router;
