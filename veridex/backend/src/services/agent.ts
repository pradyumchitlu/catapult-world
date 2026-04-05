import supabase from '../lib/supabase';

export type AgentActionType =
  | 'no_issue'
  | 'warning'
  | 'failure'
  | 'severe_failure'
  | 'reset_demo';

export interface Agent {
  id: string;
  parent_user_id: string;
  name: string;
  identifier: string | null;
  identifier_type: string;
  deployment_surface: string;
  inheritance_fraction: number;
  derived_score: number;
  authorized_domains: string[];
  stake_amount: number;
  agent_score: number;
  action_count: number;
  last_action_at: string | null;
  status: string;
  dispute_count: number;
  created_at: string;
  updated_at: string | null;
  current_penalty_points: number;
  max_penalty_points: number;
}

export interface AgentWithParent extends Agent {
  parent: {
    id: string;
    display_name: string;
    effective_trust_score: number;
    base_overall_trust_score: number;
    agent_penalty_score: number;
    overall_trust_score: number;
  };
}

export interface AgentActionEvent {
  id: string;
  agent_id: string;
  parent_user_id: string;
  action_type: AgentActionType;
  score_delta: number;
  note: string | null;
  created_at: string;
  agent_name?: string;
}

export interface AgentSummary {
  base_user_score: number;
  effective_user_score: number;
  agent_penalty_score: number;
  total_registered_agents: number;
  active_agents_count: number;
  used_agents_count: number;
  allocated_fraction: number;
  remaining_fraction: number;
  recent_actions_count: number;
}

export interface RegisterAgentParams {
  userId: string;
  name: string;
  parentScore: number;
  identifier?: string;
  identifier_type?: string;
  deployment_surface?: string;
  inheritance_fraction?: number;
  authorized_domains?: string[];
  stake_amount?: number;
}

const DEFAULT_INHERITANCE_FRACTION = 0.7;
const DEFAULT_AGENT_SCORE = 100;
const OPTIONAL_AGENT_EXTENSION_COLUMNS = [
  'deployment_surface',
  'agent_score',
  'action_count',
  'last_action_at',
  'updated_at',
] as const;

export const AGENT_ACTION_SCORE_DELTAS: Record<Exclude<AgentActionType, 'reset_demo'>, number> = {
  no_issue: 0,
  warning: -5,
  failure: -15,
  severe_failure: -30,
};

function roundFraction(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampAgentScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseNumericValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isMissingTableError(error: any, tableName: string): boolean {
  const message = typeof error?.message === 'string' ? error.message : '';
  return error?.code === 'PGRST205' && message.includes(tableName);
}

function isMissingColumnError(error: any, columnName: string): boolean {
  const message = typeof error?.message === 'string' ? error.message : '';
  return (error?.code === '42703' || error?.code === 'PGRST204') && message.includes(columnName);
}

function isMissingOptionalAgentColumnError(error: any): boolean {
  return OPTIONAL_AGENT_EXTENSION_COLUMNS.some((columnName) => isMissingColumnError(error, columnName));
}

function getBaseUserScore(value: unknown): number {
  return Math.max(0, Math.round(parseNumericValue(value, 0)));
}

export function calculateAgentPenaltyMetrics(
  baseUserScore: number,
  inheritanceFraction: number,
  agentScore: number
): {
  agentScore: number;
  maxPenaltyPoints: number;
  currentPenaltyPoints: number;
  derivedScore: number;
} {
  const safeFraction = Math.max(0, Math.min(1, parseNumericValue(inheritanceFraction, DEFAULT_INHERITANCE_FRACTION)));
  const safeAgentScore = clampAgentScore(agentScore);
  const fractionBasisPoints = Math.round(safeFraction * 100);
  const maxPenaltyPoints = Math.round((baseUserScore * fractionBasisPoints) / 100);
  const currentPenaltyPoints = Math.round(maxPenaltyPoints * ((100 - safeAgentScore) / 100));
  const derivedScore = Math.max(0, maxPenaltyPoints - currentPenaltyPoints);

  return {
    agentScore: safeAgentScore,
    maxPenaltyPoints,
    currentPenaltyPoints,
    derivedScore,
  };
}

function inferAgentScore(agent: any, baseUserScore: number, inheritanceFraction: number): number {
  if (agent?.agent_score !== undefined && agent?.agent_score !== null) {
    return parseNumericValue(agent.agent_score, DEFAULT_AGENT_SCORE);
  }

  const safeFraction = Math.max(0, Math.min(1, parseNumericValue(inheritanceFraction, DEFAULT_INHERITANCE_FRACTION)));
  const fractionBasisPoints = Math.round(safeFraction * 100);
  const maxPenaltyPoints = Math.round((baseUserScore * fractionBasisPoints) / 100);

  if (maxPenaltyPoints <= 0) {
    return DEFAULT_AGENT_SCORE;
  }

  const storedDerivedScore = Math.max(0, parseNumericValue(agent?.derived_score, maxPenaltyPoints));
  const currentPenaltyPoints = Math.max(0, Math.min(maxPenaltyPoints, maxPenaltyPoints - storedDerivedScore));
  return clampAgentScore(100 - Math.round((currentPenaltyPoints / maxPenaltyPoints) * 100));
}

function mapAgentRecord(agent: any, baseUserScore: number): Agent {
  const inheritanceFraction = parseNumericValue(agent?.inheritance_fraction, DEFAULT_INHERITANCE_FRACTION);
  const effectiveAgentScore = inferAgentScore(agent, baseUserScore, inheritanceFraction);
  const metrics = calculateAgentPenaltyMetrics(
    baseUserScore,
    inheritanceFraction,
    effectiveAgentScore
  );

  return {
    id: agent.id,
    parent_user_id: agent.parent_user_id,
    name: agent.name,
    identifier: agent.identifier ?? null,
    identifier_type: agent.identifier_type || 'other',
    deployment_surface: agent.deployment_surface || 'custom',
    inheritance_fraction: roundFraction(inheritanceFraction),
    derived_score: metrics.derivedScore,
    authorized_domains: agent.authorized_domains || [],
    stake_amount: parseNumericValue(agent.stake_amount, 0),
    agent_score: metrics.agentScore,
    action_count: parseNumericValue(agent.action_count, 0),
    last_action_at: agent.last_action_at || null,
    status: agent.status || 'active',
    dispute_count: parseNumericValue(agent.dispute_count, 0),
    created_at: agent.created_at,
    updated_at: agent.updated_at || null,
    current_penalty_points: metrics.currentPenaltyPoints,
    max_penalty_points: metrics.maxPenaltyPoints,
  };
}

export function summarizeAgents(
  baseUserScore: number,
  agents: Agent[],
  recentActionsCount = 0
): AgentSummary {
  const activeAgents = agents.filter((agent) => agent.status === 'active');
  const allocatedFraction = activeAgents.reduce((sum, agent) => sum + agent.inheritance_fraction, 0);
  const totalPenaltyPoints = activeAgents.reduce((sum, agent) => sum + agent.current_penalty_points, 0);

  return {
    base_user_score: getBaseUserScore(baseUserScore),
    effective_user_score: Math.max(0, getBaseUserScore(baseUserScore) - totalPenaltyPoints),
    agent_penalty_score: totalPenaltyPoints,
    total_registered_agents: agents.length,
    active_agents_count: activeAgents.length,
    used_agents_count: agents.filter((agent) => agent.action_count > 0).length,
    allocated_fraction: roundFraction(allocatedFraction),
    remaining_fraction: roundFraction(Math.max(0, 1 - allocatedFraction)),
    recent_actions_count: recentActionsCount,
  };
}

export async function getUserBaseReputationScore(userId: string): Promise<number> {
  const { data: profile, error } = await supabase
    .from('worker_profiles')
    .select('overall_trust_score')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {
    return 0;
  }

  return getBaseUserScore(profile.overall_trust_score);
}

/**
 * Register a new Agent Credential tied to a verified human.
 * derived_score starts as the amount of reputation delegated to the agent.
 * stake_amount is recorded but not deducted here — on-chain ETH staking via MetaMask is a future feature.
 */
export async function registerAgent(params: RegisterAgentParams): Promise<Agent> {
  const {
    userId,
    name,
    parentScore,
    identifier,
    identifier_type = 'other',
    deployment_surface = 'custom',
    inheritance_fraction = DEFAULT_INHERITANCE_FRACTION,
    authorized_domains = [],
    stake_amount = 0,
  } = params;

  const metrics = calculateAgentPenaltyMetrics(parentScore, inheritance_fraction, DEFAULT_AGENT_SCORE);
  const timestamp = new Date().toISOString();

  let { data: agent, error } = await supabase
    .from('agents')
    .insert({
      parent_user_id: userId,
      name: name.trim(),
      identifier: identifier?.trim() || null,
      identifier_type,
      deployment_surface,
      inheritance_fraction,
      derived_score: metrics.derivedScore,
      authorized_domains,
      stake_amount,
      agent_score: DEFAULT_AGENT_SCORE,
      action_count: 0,
      last_action_at: null,
      updated_at: timestamp,
    })
    .select()
    .single();

  if (error && isMissingOptionalAgentColumnError(error)) {
    ({ data: agent, error } = await supabase
      .from('agents')
      .insert({
        parent_user_id: userId,
        name: name.trim(),
        identifier: identifier?.trim() || null,
        identifier_type,
        inheritance_fraction,
        derived_score: metrics.derivedScore,
        authorized_domains,
        stake_amount,
      })
      .select()
      .single());
  }

  if (error) {
    throw error;
  }

  return mapAgentRecord(agent, parentScore);
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
  const baseUserScore = getBaseUserScore(parentProfile?.overall_trust_score);
  const userAgents = await listUserAgents(parent.id, baseUserScore);
  const summary = summarizeAgents(baseUserScore, userAgents);
  const mappedAgent = mapAgentRecord(agent, baseUserScore);

  return {
    ...mappedAgent,
    parent: {
      id: parent.id,
      display_name: parent.display_name,
      effective_trust_score: summary.effective_user_score,
      base_overall_trust_score: baseUserScore,
      agent_penalty_score: summary.agent_penalty_score,
      overall_trust_score: summary.effective_user_score,
    },
  };
}

/**
 * Update all agents' derived scores when parent's score changes.
 * Each agent uses its own inheritance_fraction and current agent_score.
 */
export async function updateAgentScores(userId: string, newParentScore: number): Promise<void> {
  let agents: Agent[] = [];
  try {
    agents = await listUserAgents(userId, newParentScore);
  } catch (_error) {
    return;
  }

  for (const agent of agents) {
    const metrics = calculateAgentPenaltyMetrics(
      newParentScore,
      parseNumericValue(agent.inheritance_fraction, DEFAULT_INHERITANCE_FRACTION),
      parseNumericValue(agent.agent_score, DEFAULT_AGENT_SCORE)
    );
    let { error } = await supabase
      .from('agents')
      .update({
        derived_score: metrics.derivedScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent.id);

    if (error && isMissingColumnError(error, 'updated_at')) {
      ({ error } = await supabase
        .from('agents')
        .update({
          derived_score: metrics.derivedScore,
        })
        .eq('id', agent.id));
    }
  }
}

/**
 * List all agents for a user
 */
export async function listUserAgents(userId: string, baseUserScore = 0): Promise<Agent[]> {
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .eq('parent_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (agents || []).map((agent) => mapAgentRecord(agent, baseUserScore));
}

export async function listRecentAgentActions(userId: string): Promise<AgentActionEvent[]> {
  const { data: events, error } = await supabase
    .from('agent_action_events')
    .select(`
      *,
      agent:agent_id(
        id,
        name
      )
    `)
    .eq('parent_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    if (isMissingTableError(error, 'agent_action_events')) {
      return [];
    }
    throw error;
  }

  return (events || []).map((event: any) => ({
    id: event.id,
    agent_id: event.agent_id,
    parent_user_id: event.parent_user_id,
    action_type: event.action_type,
    score_delta: parseNumericValue(event.score_delta, 0),
    note: event.note || null,
    created_at: event.created_at,
    agent_name: event.agent?.name || 'Agent',
  }));
}

export async function getOwnedAgent(agentId: string, userId: string): Promise<Agent | null> {
  const baseUserScore = await getUserBaseReputationScore(userId);
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .eq('parent_user_id', userId)
    .single();

  if (error || !agent) {
    return null;
  }

  return mapAgentRecord(agent, baseUserScore);
}

export async function getUserAgentDashboardData(
  userId: string,
  baseUserScore?: number
): Promise<{
  summary: AgentSummary;
  agents: Agent[];
  recent_actions: AgentActionEvent[];
}> {
  const resolvedBaseUserScore = baseUserScore ?? await getUserBaseReputationScore(userId);
  const [agents, recentActions] = await Promise.all([
    listUserAgents(userId, resolvedBaseUserScore),
    listRecentAgentActions(userId),
  ]);

  return {
    summary: summarizeAgents(resolvedBaseUserScore, agents, recentActions.length),
    agents,
    recent_actions: recentActions,
  };
}

export async function getActiveAllocationFraction(userId: string): Promise<number> {
  const agents = await listUserAgents(userId, 0);
  return roundFraction(
    agents
      .filter((agent) => agent.status === 'active')
      .reduce((sum, agent) => sum + agent.inheritance_fraction, 0)
  );
}

export function getActionScoreDelta(actionType: Exclude<AgentActionType, 'reset_demo'>): number {
  return AGENT_ACTION_SCORE_DELTAS[actionType];
}

export async function applyAgentAction(params: {
  agentId: string;
  userId: string;
  actionType: Exclude<AgentActionType, 'reset_demo'>;
  note?: string | null;
  baseUserScore?: number;
}): Promise<Agent> {
  const {
    agentId,
    userId,
    actionType,
    note = null,
    baseUserScore,
  } = params;
  const resolvedBaseUserScore = baseUserScore ?? await getUserBaseReputationScore(userId);
  const ownedAgent = await getOwnedAgent(agentId, userId);

  if (!ownedAgent) {
    throw new Error('Agent not found');
  }

  const nextAgentScore = clampAgentScore(ownedAgent.agent_score + getActionScoreDelta(actionType));
  const metrics = calculateAgentPenaltyMetrics(
    resolvedBaseUserScore,
    ownedAgent.inheritance_fraction,
    nextAgentScore
  );
  const timestamp = new Date().toISOString();

  let { data: updatedAgent, error: updateError } = await supabase
    .from('agents')
    .update({
      agent_score: nextAgentScore,
      action_count: ownedAgent.action_count + 1,
      last_action_at: timestamp,
      derived_score: metrics.derivedScore,
      updated_at: timestamp,
    })
    .eq('id', agentId)
    .select()
    .single();

  if (updateError && isMissingOptionalAgentColumnError(updateError)) {
    ({ data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        derived_score: metrics.derivedScore,
      })
      .eq('id', agentId)
      .select()
      .single());
  }

  if (updateError || !updatedAgent) {
    throw updateError || new Error('Failed to update agent');
  }

  const { error: eventError } = await supabase
    .from('agent_action_events')
    .insert({
      agent_id: agentId,
      parent_user_id: userId,
      action_type: actionType,
      score_delta: nextAgentScore - ownedAgent.agent_score,
      note,
      created_at: timestamp,
    });

  if (eventError && !isMissingTableError(eventError, 'agent_action_events')) {
    throw eventError;
  }

  return mapAgentRecord(updatedAgent, resolvedBaseUserScore);
}

export async function resetAgentDemo(params: {
  agentId: string;
  userId: string;
  note?: string | null;
  baseUserScore?: number;
}): Promise<Agent> {
  const {
    agentId,
    userId,
    note = null,
    baseUserScore,
  } = params;
  const resolvedBaseUserScore = baseUserScore ?? await getUserBaseReputationScore(userId);
  const ownedAgent = await getOwnedAgent(agentId, userId);

  if (!ownedAgent) {
    throw new Error('Agent not found');
  }

  const metrics = calculateAgentPenaltyMetrics(
    resolvedBaseUserScore,
    ownedAgent.inheritance_fraction,
    DEFAULT_AGENT_SCORE
  );
  const timestamp = new Date().toISOString();

  let { data: updatedAgent, error: updateError } = await supabase
    .from('agents')
    .update({
      agent_score: DEFAULT_AGENT_SCORE,
      derived_score: metrics.derivedScore,
      updated_at: timestamp,
    })
    .eq('id', agentId)
    .select()
    .single();

  if (updateError && isMissingOptionalAgentColumnError(updateError)) {
    ({ data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        derived_score: metrics.derivedScore,
      })
      .eq('id', agentId)
      .select()
      .single());
  }

  if (updateError || !updatedAgent) {
    throw updateError || new Error('Failed to reset agent');
  }

  const { error: eventError } = await supabase
    .from('agent_action_events')
    .insert({
      agent_id: agentId,
      parent_user_id: userId,
      action_type: 'reset_demo',
      score_delta: DEFAULT_AGENT_SCORE - ownedAgent.agent_score,
      note,
      created_at: timestamp,
    });

  if (eventError && !isMissingTableError(eventError, 'agent_action_events')) {
    throw eventError;
  }

  return mapAgentRecord(updatedAgent, resolvedBaseUserScore);
}
