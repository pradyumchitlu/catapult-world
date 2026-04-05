-- Veridex Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id_hash TEXT UNIQUE NOT NULL,
  display_name TEXT,
  roles TEXT[] DEFAULT '{}',            -- array of: 'worker', 'staker', 'client'
  -- A user cannot be both a worker and a client (employer)
  CONSTRAINT roles_worker_client_exclusive CHECK (
    NOT ('worker' = ANY(roles) AND 'client' = ANY(roles))
  ),
  profession_category TEXT,             -- 'software', 'writing', 'design', 'trades', 'other'
  -- wld_balance removed: staking now uses real ETH via MetaMask
  wallet_address TEXT,
  wallet_verified_at TIMESTAMPTZ,
  wallet_verification_method TEXT DEFAULT 'signature',
  wallet_last_balance_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Worker profiles
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  github_username TEXT,
  github_data JSONB DEFAULT '{}',
  linkedin_data JSONB DEFAULT '{}',
  other_platforms JSONB DEFAULT '{}',
  computed_skills TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  overall_trust_score INTEGER DEFAULT 0,
  score_components JSONB DEFAULT '{}',
  -- score_components shape: {
  --   identity_assurance: number,
  --   evidence_depth: number,
  --   consistency: number,
  --   recency: number,
  --   employer_outcomes: number,
  --   staking: number,
  --   grouped_scores: {
  --     evidence: number,
  --     employer: number,
  --     staking: number,
  --     veridex: number
  --   }
  -- }
  ingestion_status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Normalized evidence extraction runs
CREATE TABLE evidence_extraction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_source TEXT NOT NULL DEFAULT 'manual_save' CHECK (
    trigger_source IN ('manual_save', 'pipeline_rerun', 'github_ingest', 'legacy_backfill')
  ),
  extraction_method TEXT NOT NULL DEFAULT 'deterministic' CHECK (
    extraction_method IN ('gemini', 'deterministic', 'hybrid', 'backfill')
  ),
  parser_version TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  warning_message TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Canonical uploaded files and URL sources that feed extraction
CREATE TABLE evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extraction_run_id UUID NOT NULL REFERENCES evidence_extraction_runs(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK (
    source_kind IN ('linkedin_file', 'supporting_file', 'portfolio_url', 'project_url', 'legacy_json')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  source_url TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  file_name TEXT,
  original_name TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  content_sha256 TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalized extracted evidence items
CREATE TABLE evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extraction_run_id UUID NOT NULL REFERENCES evidence_extraction_runs(id) ON DELETE CASCADE,
  primary_source_id UUID REFERENCES evidence_sources(id) ON DELETE SET NULL,
  item_kind TEXT NOT NULL CHECK (
    item_kind IN ('experience', 'project', 'portfolio', 'work_sample')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  title TEXT,
  company TEXT,
  role TEXT,
  description TEXT,
  url TEXT,
  proof_urls TEXT[] NOT NULL DEFAULT '{}',
  start_date TEXT,
  end_date TEXT,
  evidence_updated_at TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  technologies TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  raw_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews (staked)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  job_category TEXT,                    -- 'software', 'gardening', 'writing', 'design', etc.
  stake_amount INTEGER NOT NULL DEFAULT 0,  -- amount staked on this review
  reviewer_trust_score_at_time INTEGER, -- snapshot of reviewer's score when review was left
  is_flagged BOOLEAN DEFAULT false,     -- flagged by integrity checks
  flag_reason TEXT,                     -- e.g. 'mutual_review_detected'
  status TEXT DEFAULT 'active',         -- active, flagged, slashed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stakes
CREATE TABLE stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_eth NUMERIC NOT NULL,          -- canonical ETH stake amount
  transaction_id TEXT,                  -- on-chain deposit transaction hash
  payment_method TEXT DEFAULT 'wallet_transfer',
  withdrawal_transaction_id TEXT,       -- on-chain withdrawal transaction hash
  status TEXT DEFAULT 'active',         -- active, withdrawn
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contextual scores (cached)
CREATE TABLE contextual_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES users(id),
  job_description TEXT NOT NULL,
  parsed_requirements JSONB DEFAULT '{}',
  fit_score INTEGER,
  score_breakdown JSONB DEFAULT '{}',
  -- breakdown shape: {
  --   met: [{ requirement: string, evidence: string }],
  --   partial: [{ requirement: string, evidence: string, gap: string }],
  --   missing: [{ requirement: string }]
  -- }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Credentials
-- Each agent is a registered credential tied to a verified human (World ID).
-- Humans set identifier, inheritance fraction, authorized domains, and optional stake.
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  identifier TEXT,                        -- signing key, API endpoint, wallet address, etc.
  identifier_type TEXT DEFAULT 'other',   -- 'signing_key', 'api_endpoint', 'wallet', 'other'
  inheritance_fraction NUMERIC(3,2) DEFAULT 0.70 CHECK (inheritance_fraction >= 0 AND inheritance_fraction <= 1),
  derived_score INTEGER DEFAULT 0,        -- inheritance_fraction × parent's overall_trust_score
  authorized_domains TEXT[] DEFAULT '{}', -- e.g. {'defi','content','negotiation'}
  stake_amount INTEGER DEFAULT 0,         -- collateral for this agent
  status TEXT DEFAULT 'active',           -- 'active', 'suspended', 'revoked'
  dispute_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Query log
CREATE TABLE query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  querier_id UUID REFERENCES users(id),
  querier_info TEXT,
  query_type TEXT DEFAULT 'profile_view',  -- profile_view, api_query, chat_query, contextual_score
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  -- messages shape: [{ role: 'user' | 'assistant', content: string, timestamp: string }]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  payment_amount INTEGER NOT NULL,          -- salary (what the worker receives)
  buy_in_amount INTEGER,                    -- total escrowed from employer (salary + staker reward + fee)
  duration_days INTEGER,                    -- estimated duration
  status TEXT DEFAULT 'draft',              -- draft, active, submitted, completed, closed
  worker_payout INTEGER,                    -- amount paid to worker (set on completion)
  staker_payout_total INTEGER,              -- total distributed to stakers (calculated at activation)
  platform_fee INTEGER DEFAULT 0,           -- platform fee (calculated at activation)
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contract payment ledger (audit trail)
CREATE TABLE contract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_type TEXT NOT NULL,               -- 'worker_payout', 'staker_share', 'platform_fee'
  stake_id UUID REFERENCES stakes(id),      -- set only for staker_share rows
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wallet verification challenges
CREATE TABLE wallet_verification_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  nonce TEXT UNIQUE NOT NULL,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add contract reference to reviews
ALTER TABLE reviews ADD COLUMN contract_id UUID REFERENCES contracts(id);

-- Indexes for performance
CREATE INDEX idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX idx_worker_profiles_trust_score ON worker_profiles(overall_trust_score DESC);
CREATE INDEX idx_worker_profiles_github_username ON worker_profiles(github_username);
CREATE INDEX idx_evidence_runs_worker_profile_created_at ON evidence_extraction_runs(worker_profile_id, created_at DESC);
CREATE INDEX idx_evidence_runs_user_created_at ON evidence_extraction_runs(user_id, created_at DESC);
CREATE INDEX idx_evidence_runs_status_created_at ON evidence_extraction_runs(status, created_at DESC);
CREATE INDEX idx_evidence_sources_worker_profile_active ON evidence_sources(worker_profile_id, is_active, created_at DESC);
CREATE INDEX idx_evidence_sources_user_active ON evidence_sources(user_id, is_active, created_at DESC);
CREATE INDEX idx_evidence_sources_run ON evidence_sources(extraction_run_id);
CREATE INDEX idx_evidence_items_worker_profile_kind_active ON evidence_items(worker_profile_id, item_kind, is_active, sort_order);
CREATE INDEX idx_evidence_items_run ON evidence_items(extraction_run_id);
CREATE INDEX idx_evidence_items_primary_source ON evidence_items(primary_source_id);
CREATE INDEX idx_reviews_worker_id ON reviews(worker_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_stakes_staker_id ON stakes(staker_id);
CREATE INDEX idx_stakes_worker_id ON stakes(worker_id);
CREATE INDEX idx_stakes_status ON stakes(status);
CREATE INDEX idx_contextual_scores_worker_id ON contextual_scores(worker_id);
CREATE INDEX idx_agents_parent_user_id ON agents(parent_user_id);
CREATE INDEX idx_contracts_employer_id ON contracts(employer_id);
CREATE INDEX idx_contracts_worker_id ON contracts(worker_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contract_payments_contract_id ON contract_payments(contract_id);
CREATE INDEX idx_contract_payments_recipient_id ON contract_payments(recipient_id);
CREATE INDEX idx_reviews_contract_id ON reviews(contract_id);
CREATE INDEX idx_query_log_worker_id ON query_log(worker_id);
CREATE INDEX idx_query_log_created_at ON query_log(created_at DESC);
CREATE INDEX idx_chat_sessions_client_id ON chat_sessions(client_id);
CREATE INDEX idx_chat_sessions_worker_id ON chat_sessions(worker_id);
CREATE INDEX idx_users_world_id_hash ON users(world_id_hash);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_wallet_verification_challenges_user_id ON wallet_verification_challenges(user_id);
CREATE INDEX idx_wallet_verification_challenges_nonce ON wallet_verification_challenges(nonce);

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contextual_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_verification_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contracts viewable by participants"
  ON contracts FOR SELECT
  USING (true);

CREATE POLICY "Employers can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update own contracts"
  ON contracts FOR UPDATE
  USING (auth.uid() = employer_id);

CREATE POLICY "Payment records viewable by everyone"
  ON contract_payments FOR SELECT
  USING (true);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contracts viewable by participants"
  ON contracts FOR SELECT
  USING (true);

CREATE POLICY "Employers can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update own contracts"
  ON contracts FOR UPDATE
  USING (auth.uid() = employer_id);

CREATE POLICY "Payment records viewable by everyone"
  ON contract_payments FOR SELECT
  USING (true);

-- Public read policies (for profiles and reviews)
CREATE POLICY "Public profiles are viewable by everyone"
  ON worker_profiles FOR SELECT
  USING (true);

CREATE POLICY "Public reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (status = 'active');

CREATE POLICY "Public users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Public agents are viewable by everyone"
  ON agents FOR SELECT
  USING (true);

-- Authenticated user policies (for creating/updating own data)
-- Note: These policies assume Supabase Auth with auth.uid() = user.id mapping
-- For the hackathon with service role key, these may need adjustment

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own wallet verification challenges"
  ON wallet_verification_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet verification challenges"
  ON wallet_verification_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet verification challenges"
  ON wallet_verification_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own worker profile"
  ON worker_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own evidence extraction runs"
  ON evidence_extraction_runs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own evidence sources"
  ON evidence_sources
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own evidence items"
  ON evidence_items
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own worker profile"
  ON worker_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Authenticated users can create stakes"
  ON stakes FOR INSERT
  WITH CHECK (auth.uid() = staker_id);

CREATE POLICY "Users can view their own stakes"
  ON stakes FOR SELECT
  USING (auth.uid() = staker_id);

CREATE POLICY "Users can create their own agents"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = client_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_profiles_updated_at
  BEFORE UPDATE ON worker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
