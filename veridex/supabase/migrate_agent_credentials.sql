-- Migration: Add Agent Credential columns to agents table
-- Run this in Supabase SQL Editor if you already have the agents table created.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS identifier TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS identifier_type TEXT DEFAULT 'other';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS inheritance_fraction NUMERIC(3,2) DEFAULT 0.70;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS authorized_domains TEXT[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS stake_amount INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0;

-- Add check constraint for inheritance_fraction
ALTER TABLE agents ADD CONSTRAINT agents_inheritance_fraction_range
  CHECK (inheritance_fraction >= 0 AND inheritance_fraction <= 1);
