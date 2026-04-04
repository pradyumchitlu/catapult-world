import supabase from '../lib/supabase';

export interface Agent {
  id: string;
  parent_user_id: string;
  name: string;
  identifier: string | null;
  identifier_type: string;
  inheritance_fraction: number;
  derived_score: number;
  authorized_domains: string[];
  stake_amount: number;
  status: string;
  dispute_count: number;
  created_at: string;
}

export interface AgentWithParent extends Agent {
  parent: {
    id: string;
    display_name: string;
    overall_trust_score: number;
  };
}

export interface RegisterAgentParams {
  userId: string;
  name: string;
  parentScore: number;
  identifier?: string;
  identifier_type?: string;
  inheritance_fraction?: number;
  authorized_domains?: string[];
  stake_amount?: number;
}

/**
 * Register a new Agent Credential tied to a verified human.
 * derived_score = inheritance_fraction × parent's trust score.
 * If stake_amount > 0, deducts from user's wld_balance.
 */
export async function registerAgent(params: RegisterAgentParams): Promise<Agent> {
  const {
    userId,
    name,
    parentScore,
    identifier,
    identifier_type = 'other',
    inheritance_fraction = 0.7,
    authorized_domains = [],
    stake_amount = 0,
  } = params;

  const derivedScore = Math.round(parentScore * inheritance_fraction);

  // Deduct stake from user's balance if > 0
  if (stake_amount > 0) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wld_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    if (user.wld_balance < stake_amount) {
      throw new Error('Insufficient WLD balance for agent stake');
    }

    const { error: balanceError } = await supabase
      .from('users')
      .update({ wld_balance: user.wld_balance - stake_amount })
      .eq('id', userId);

    if (balanceError) {
      throw new Error('Failed to deduct stake from balance');
    }
  }

  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      parent_user_id: userId,
      name: name.trim(),
      identifier: identifier?.trim() || null,
      identifier_type,
      inheritance_fraction,
      derived_score: derivedScore,
      authorized_domains,
      stake_amount,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return agent;
}

// Keep spawnAgent as alias for backwards compatibility with existing route name
export const spawnAgent = registerAgent;

/**
 * Lookup an agent by ID — verification endpoint for counterparties.
 * Returns credential details including domains, stake, and parent info.
 */
export async function lookupAgent(agentId: string): Promise<AgentWithParent | null> {
  const { data: agent, error } = await supabase
    .from('agents')
    .select(`
      *,
      parent:parent_user_id(
        id,
        display_name,
        worker_profiles(overall_trust_score)
      )
    `)
    .eq('id', agentId)
    .single();

  if (error || !agent) {
    return null;
  }

  const parent = agent.parent as any;
  const parentProfile = parent?.worker_profiles;

  return {
    id: agent.id,
    parent_user_id: agent.parent_user_id,
    name: agent.name,
    identifier: agent.identifier,
    identifier_type: agent.identifier_type,
    inheritance_fraction: parseFloat(agent.inheritance_fraction),
    derived_score: agent.derived_score,
    authorized_domains: agent.authorized_domains || [],
    stake_amount: agent.stake_amount,
    status: agent.status,
    dispute_count: agent.dispute_count,
    created_at: agent.created_at,
    parent: {
      id: parent.id,
      display_name: parent.display_name,
      overall_trust_score: parentProfile?.overall_trust_score || 0,
    },
  };
}

/**
 * Update all agents' derived scores when parent's score changes.
 * Each agent uses its own inheritance_fraction.
 */
export async function updateAgentScores(userId: string, newParentScore: number): Promise<void> {
  // Fetch all agents for user to get individual inheritance fractions
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, inheritance_fraction')
    .eq('parent_user_id', userId);

  if (error || !agents) return;

  for (const agent of agents) {
    const fraction = parseFloat(agent.inheritance_fraction) || 0.7;
    const derivedScore = Math.round(newParentScore * fraction);
    await supabase
      .from('agents')
      .update({ derived_score: derivedScore })
      .eq('id', agent.id);
  }
}

/**
 * List all agents for a user
 */
export async function listUserAgents(userId: string): Promise<Agent[]> {
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .eq('parent_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (agents || []).map((a) => ({
    ...a,
    inheritance_fraction: parseFloat(a.inheritance_fraction),
    authorized_domains: a.authorized_domains || [],
  }));
}
