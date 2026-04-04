export interface User {
  id: string;
  world_id_hash: string;
  display_name: string | null;
  roles: ('worker' | 'staker' | 'client')[];
  profession_category: string | null;
  wld_balance: number;
  created_at: string;
  updated_at: string;
}

export interface ScoreComponents {
  developer_competence: number;
  collaboration: number;
  consistency: number;
  specialization_depth: number;
  activity_recency: number;
  peer_trust: number;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  github_username: string | null;
  github_data: Record<string, any>;
  linkedin_data: Record<string, any>;
  other_platforms: Record<string, any>;
  computed_skills: string[];
  specializations: string[];
  years_experience: number | null;
  overall_trust_score: number;
  score_components: ScoreComponents;
  ingestion_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  worker_id: string;
  rating: number;
  content: string | null;
  job_category: string | null;
  stake_amount: number;
  reviewer_trust_score_at_time: number | null;
  is_flagged: boolean;
  flag_reason: string | null;
  status: 'active' | 'flagged' | 'slashed';
  created_at: string;
  // joined fields
  reviewer?: User;
}

export interface Stake {
  id: string;
  staker_id: string;
  worker_id: string;
  amount: number;
  status: 'active' | 'withdrawn';
  created_at: string;
  // joined fields
  staker?: User;
  worker?: User & { worker_profile?: WorkerProfile };
}

export interface ContextualScoreBreakdown {
  met: { requirement: string; evidence: string }[];
  partial: { requirement: string; evidence: string; gap: string }[];
  missing: { requirement: string }[];
}

export interface ContextualScore {
  id: string;
  worker_id: string;
  requester_id: string | null;
  job_description: string;
  parsed_requirements: Record<string, any>;
  fit_score: number;
  score_breakdown: ContextualScoreBreakdown;
  created_at: string;
}

export interface Agent {
  id: string;
  parent_user_id: string;
  name: string;
  derived_score: number;
  created_at: string;
  // joined fields
  parent?: User & { worker_profile?: WorkerProfile };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  client_id: string;
  worker_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface QueryLogEntry {
  id: string;
  worker_id: string;
  querier_id: string | null;
  querier_info: string | null;
  query_type: 'profile_view' | 'api_query' | 'chat_query' | 'contextual_score';
  created_at: string;
}
