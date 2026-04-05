export type WalletVerificationMethod = 'signature' | 'world_app_wallet_auth' | null;

export interface User {
  id: string;
  world_id_hash: string;
  display_name: string | null;
  roles: ('worker' | 'staker' | 'client')[];
  profession_category: string | null;
  wld_balance?: number; // deprecated — staking uses real ETH now
  wallet_address: string | null;
  wallet_verified_at: string | null;
  wallet_verification_method: WalletVerificationMethod;
  wallet_last_balance_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletInfo {
  wallet_address: string | null;
  wallet_verified_at: string | null;
  wallet_verification_method: WalletVerificationMethod;
  wallet_last_balance_sync_at: string | null;
}

export interface NativeBalance {
  symbol: string;
  decimals: number;
  raw_balance: string;
  formatted_balance: string;
}

export interface TokenBalance {
  token_address: string;
  symbol: string;
  name: string;
  decimals: number | null;
  is_valid: boolean;
  raw_balance: string | null;
  formatted_balance: string | null;
  error?: string;
}

export interface WalletBalancesResponse {
  wallet_address: string;
  chain_id: number;
  chain_name: string;
  native_balance: NativeBalance | null;
  tokens: TokenBalance[];
  fetched_at: string;
}

export interface WalletChallengeResponse {
  challenge: string;
  nonce: string;
  expires_at: string;
}

export interface WorldAppWalletAuthPrepareResponse {
  nonce: string;
  statement: string;
  expires_at: string;
  session_token: string;
}

export interface ScoreComponents {
  identity_assurance: number;
  evidence_depth: number;
  consistency: number;
  recency: number;
  employer_outcomes: number;
  staking: number;
  grouped_scores?: {
    evidence: number;
    employer: number;
    staking: number;
    veridex: number;
  };
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

export interface EvidenceUploadedFile {
  bucket: string;
  path: string;
  file_name: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
  kind: 'linkedin_pdf' | 'supporting_document';
}

export interface EvidenceExperience {
  title?: string;
  company?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  skills?: string[];
  technologies?: string[];
}

export interface EvidenceProject {
  title?: string;
  role?: string;
  description?: string;
  url?: string;
  proof_urls?: string[];
  start_date?: string;
  end_date?: string;
  updated_at?: string;
  skills?: string[];
  technologies?: string[];
  tags?: string[];
  source_file?: EvidenceUploadedFile;
}

export interface EvidenceUploadDraft {
  linkedin_data: {
    experiences?: EvidenceExperience[];
    skills?: string[];
    top_skills?: string[];
    specializations?: string[];
    source_type?: string;
    source_file?: EvidenceUploadedFile;
    uploaded_at?: string;
    raw_text_excerpt?: string;
    [key: string]: any;
  };
  projects: EvidenceProject[];
  other_platforms: {
    portfolio?: EvidenceProject[];
    work_samples?: EvidenceProject[];
    uploaded_files?: EvidenceUploadedFile[];
    [key: string]: any;
  };
  uploaded_files: EvidenceUploadedFile[];
  warnings: string[];
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
  contract_id: string | null;
  status: 'active' | 'flagged' | 'slashed';
  created_at: string;
  // joined fields
  reviewer?: User;
}

export interface Stake {
  id: string;
  staker_id: string;
  worker_id: string;
  amount_eth: number;
  transaction_id?: string | null;
  withdrawal_transaction_id?: string | null;
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

/** Shape returned by POST /api/contextual-score */
export interface ContextualScoreApiResponse {
  fit_score: number;
  breakdown: ContextualScoreBreakdown;
  worker_name?: string;
  overall_trust_score?: number;
}

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
  status: 'active' | 'suspended' | 'revoked';
  dispute_count: number;
  created_at: string;
  // joined fields
  parent?: User & { worker_profile?: WorkerProfile };
}

export type ContractStatus = 'draft' | 'active' | 'submitted' | 'completed' | 'closed';

export interface Contract {
  id: string;
  employer_id: string;
  worker_id: string;
  title: string;
  description: string | null;
  payment_amount: number;
  buy_in_amount: number | null;
  duration_days: number | null;
  status: ContractStatus;
  worker_payout: number | null;
  staker_payout_total: number | null;
  platform_fee: number | null;
  completed_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  has_review?: boolean;
  worker?: User & { worker_profiles?: WorkerProfile };
  employer?: User;
  review?: Review;
}

export interface ContractPayment {
  id: string;
  contract_id: string;
  recipient_id: string;
  amount: number;
  payment_type: 'worker_payout' | 'staker_share' | 'platform_fee';
  stake_id: string | null;
  created_at: string;
}

export interface RegisterAgentParams {
  name: string;
  identifier?: string;
  identifier_type?: string;
  inheritance_fraction?: number;
  authorized_domains?: string[];
  stake_amount?: number;
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
