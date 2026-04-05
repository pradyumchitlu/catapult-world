-- Migration: Add Agent Credential columns to agents table
-- Run this in Supabase SQL Editor if you already have the agents table created.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS identifier TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS identifier_type TEXT DEFAULT 'other';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS deployment_surface TEXT DEFAULT 'custom';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS inheritance_fraction NUMERIC(3,2) DEFAULT 0.70;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS authorized_domains TEXT[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS stake_amount INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_score INTEGER DEFAULT 100;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS action_count INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add check constraint for inheritance_fraction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agents_inheritance_fraction_range'
  ) THEN
    ALTER TABLE agents
      ADD CONSTRAINT agents_inheritance_fraction_range
      CHECK (inheritance_fraction >= 0 AND inheritance_fraction <= 1);
  END IF;
END $$;

UPDATE agents
SET
  deployment_surface = COALESCE(deployment_surface, 'custom'),
  agent_score = COALESCE(agent_score, 100),
  action_count = COALESCE(action_count, 0),
  updated_at = COALESCE(updated_at, created_at, now());

CREATE TABLE IF NOT EXISTS agent_action_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  score_delta INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_action_events_parent_user_id
  ON agent_action_events(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_events_agent_id
  ON agent_action_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_events_created_at
  ON agent_action_events(created_at DESC);

ALTER TABLE agent_action_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_action_events'
      AND policyname = 'Users can view their own agent action events'
  ) THEN
    CREATE POLICY "Users can view their own agent action events"
      ON agent_action_events FOR SELECT
      USING (auth.uid() = parent_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_action_events'
      AND policyname = 'Users can create their own agent action events'
  ) THEN
    CREATE POLICY "Users can create their own agent action events"
      ON agent_action_events FOR INSERT
      WITH CHECK (auth.uid() = parent_user_id);
  END IF;
END $$;
