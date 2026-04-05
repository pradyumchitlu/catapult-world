import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import {
  applyAgentAction,
  getActionScoreDelta,
  getActiveAllocationFraction,
  getUserAgentDashboardData,
  lookupAgent,
  registerAgent,
  resetAgentDemo,
} from '../services/agent';

const router = Router();

const ALLOWED_ACTION_TYPES = ['no_issue', 'warning', 'failure', 'severe_failure'] as const;
const ALLOWED_IDENTIFIER_TYPES = ['signing_key', 'api_endpoint', 'wallet', 'other'] as const;

function parseAuthorizedDomains(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

/**
 * POST /api/agent/spawn
 * Register a new Agent Credential tied to the authenticated user.
 */
router.post('/spawn', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      identifier,
      identifier_type,
      deployment_surface,
      inheritance_fraction,
      authorized_domains,
      stake_amount,
    } = req.body;
    const userId = req.userId!;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Agent name is required' });
    }

    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      return res.status(400).json({ error: 'Agent identifier is required' });
    }

    if (identifier_type !== undefined && !ALLOWED_IDENTIFIER_TYPES.includes(identifier_type)) {
      return res.status(400).json({
        error: `identifier_type must be one of ${ALLOWED_IDENTIFIER_TYPES.join(', ')}`,
      });
    }

    // Validate inheritance_fraction if provided
    const requestedFraction = inheritance_fraction !== undefined
      ? parseFloat(inheritance_fraction)
      : 0.7;

    if (inheritance_fraction !== undefined) {
      if (isNaN(requestedFraction) || requestedFraction < 0 || requestedFraction > 1) {
        return res.status(400).json({ error: 'inheritance_fraction must be between 0 and 1' });
      }
    }

    const currentAllocation = await getActiveAllocationFraction(userId);
    if (currentAllocation + requestedFraction > 1.0001) {
      return res.status(400).json({
        error: `Total active agent reputation cannot exceed 100%. You have ${(currentAllocation * 100).toFixed(0)}% already allocated.`,
      });
    }

    const normalizedDomains = parseAuthorizedDomains(authorized_domains);
    const requestedStakeAmount = stake_amount !== undefined
      ? Number(stake_amount)
      : 0;

    if (!Number.isFinite(requestedStakeAmount) || requestedStakeAmount < 0) {
      return res.status(400).json({ error: 'stake_amount must be a non-negative number' });
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
      deployment_surface,
      inheritance_fraction: requestedFraction,
      authorized_domains: normalizedDomains,
      stake_amount: requestedStakeAmount,
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
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'You can only view your own agents' });
    }

    const data = await getUserAgentDashboardData(userId);
    return res.json(data);
  } catch (error) {
    console.error('List agents error:', error);
    return res.status(500).json({ error: 'Failed to list agents' });
  }
});

/**
 * POST /api/agent/:agentId/action
 * Owner-only demo action endpoint that degrades the agent score.
 */
router.post('/:agentId/action', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const { action_type, note } = req.body;
    const userId = req.userId!;

    if (!ALLOWED_ACTION_TYPES.includes(action_type)) {
      return res.status(400).json({
        error: `action_type must be one of ${ALLOWED_ACTION_TYPES.join(', ')}`,
      });
    }

    const agent = await applyAgentAction({
      agentId,
      userId,
      actionType: action_type,
      note,
    });
    const dashboard = await getUserAgentDashboardData(userId);

    return res.json({
      success: true,
      agent,
      action: {
        action_type,
        score_delta: getActionScoreDelta(action_type),
        note: note || null,
      },
      summary: dashboard.summary,
    });
  } catch (error) {
    console.error('Apply agent action error:', error);
    const message = error instanceof Error ? error.message : 'Failed to apply action';
    const status = /not found/i.test(message) ? 404 : 500;
    return res.status(status).json({ error: message });
  }
});

/**
 * POST /api/agent/:agentId/reset-demo
 * Owner-only reset endpoint for hackathon demos.
 */
router.post('/:agentId/reset-demo', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const { note } = req.body;
    const userId = req.userId!;
    const agent = await resetAgentDemo({ agentId, userId, note });
    const dashboard = await getUserAgentDashboardData(userId);

    return res.json({
      success: true,
      agent,
      summary: dashboard.summary,
    });
  } catch (error) {
    console.error('Reset agent demo error:', error);
    const message = error instanceof Error ? error.message : 'Failed to reset agent';
    const status = /not found/i.test(message) ? 404 : 500;
    return res.status(status).json({ error: message });
  }
});

/**
 * GET /api/agent/:agentId
 * Public verification endpoint — counterparties call this to verify an agent credential.
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
        deployment_surface: agent.deployment_surface,
        agent_score: agent.agent_score,
        derived_score: agent.derived_score,
        current_penalty_points: agent.current_penalty_points,
        max_penalty_points: agent.max_penalty_points,
        inheritance_fraction: agent.inheritance_fraction,
        authorized_domains: agent.authorized_domains,
        stake_amount: agent.stake_amount,
        status: agent.status,
        dispute_count: agent.dispute_count,
        created_at: agent.created_at,
      },
      parent: {
        display_name: agent.parent.display_name,
        base_overall_trust_score: agent.parent.base_overall_trust_score,
        agent_penalty_score: agent.parent.agent_penalty_score,
        trust_score: agent.parent.effective_trust_score,
      },
    });
  } catch (error) {
    console.error('Lookup agent error:', error);
    return res.status(500).json({ error: 'Lookup failed' });
  }
});

export default router;
