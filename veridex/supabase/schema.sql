-- Veridex Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id_hash TEXT UNIQUE NOT NULL,
  display_name TEXT,
  roles TEXT[] DEFAULT '{}',            -- array of: 'worker', 'staker', 'client'
  profession_category TEXT,             -- 'software', 'writing', 'design', 'trades', 'other'
  wld_balance INTEGER DEFAULT 1000,     -- starting WLD credits
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
  --   developer_competence: number,    (0 if no GitHub connected)
  --   collaboration: number,
  --   consistency: number,
  --   specialization_depth: number,
  --   activity_recency: number,
  --   peer_trust: number               (from staked reviews)
  -- }
  ingestion_status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews (staked)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  job_category TEXT,                    -- 'software', 'gardening', 'writing', 'design', etc.
  stake_amount INTEGER NOT NULL DEFAULT 0,  -- WLD staked on this review
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
  amount INTEGER NOT NULL,
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

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  derived_score INTEGER DEFAULT 0,      -- 70% of parent's overall_trust_score
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

-- Indexes for performance
CREATE INDEX idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX idx_worker_profiles_trust_score ON worker_profiles(overall_trust_score DESC);
CREATE INDEX idx_worker_profiles_github_username ON worker_profiles(github_username);
CREATE INDEX idx_reviews_worker_id ON reviews(worker_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_stakes_staker_id ON stakes(staker_id);
CREATE INDEX idx_stakes_worker_id ON stakes(worker_id);
CREATE INDEX idx_stakes_status ON stakes(status);
CREATE INDEX idx_contextual_scores_worker_id ON contextual_scores(worker_id);
CREATE INDEX idx_agents_parent_user_id ON agents(parent_user_id);
CREATE INDEX idx_query_log_worker_id ON query_log(worker_id);
CREATE INDEX idx_query_log_created_at ON query_log(created_at DESC);
CREATE INDEX idx_chat_sessions_client_id ON chat_sessions(client_id);
CREATE INDEX idx_chat_sessions_worker_id ON chat_sessions(worker_id);
CREATE INDEX idx_users_world_id_hash ON users(world_id_hash);

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contextual_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can insert their own worker profile"
  ON worker_profiles FOR INSERT
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

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
