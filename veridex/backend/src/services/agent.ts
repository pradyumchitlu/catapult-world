import { v4 as uuidv4 } from 'uuid';
import supabase from '../lib/supabase';

export interface Agent {
  id: string;
  parent_user_id: string;
  name: string;
  derived_score: number;
  created_at: string;
}

export interface AgentWithParent extends Agent {
  parent: {
    id: string;
    display_name: string;
    overall_trust_score: number;
  };
}

/**
 * Spawn a new agent tied to a user
 * Agent's derived score = 70% of parent's overall trust score
 */
export async function spawnAgent(
  userId: string,
  name: string,
  parentScore: number
): Promise<Agent> {
  // Calculate derived score (70% of parent's score)
  const derivedScore = Math.round(parentScore * 0.7);

  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      parent_user_id: userId,
      name: name.trim(),
      derived_score: derivedScore,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return agent;
}

/**
 * Lookup an agent by ID, including parent information
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
    derived_score: agent.derived_score,
    created_at: agent.created_at,
    parent: {
      id: parent.id,
      display_name: parent.display_name,
      overall_trust_score: parentProfile?.overall_trust_score || 0,
    },
  };
}

/**
 * Update an agent's derived score based on parent's current score
 * Called when parent's score changes
 */
export async function updateAgentScores(userId: string, newParentScore: number): Promise<void> {
  const derivedScore = Math.round(newParentScore * 0.7);

  await supabase
    .from('agents')
    .update({ derived_score: derivedScore })
    .eq('parent_user_id', userId);
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

  return agents || [];
}
