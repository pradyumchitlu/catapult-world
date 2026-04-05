-- Normalized evidence storage for uploaded files, URLs, and extracted items.
-- Additive migration for existing Supabase projects.

CREATE TABLE IF NOT EXISTS evidence_extraction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_source TEXT NOT NULL DEFAULT 'manual_save' CHECK (
    trigger_source IN (
      'manual_save',
      'pipeline_rerun',
      'github_ingest',
      'legacy_backfill'
    )
  ),
  extraction_method TEXT NOT NULL DEFAULT 'deterministic' CHECK (
    extraction_method IN (
      'gemini',
      'deterministic',
      'hybrid',
      'backfill'
    )
  ),
  parser_version TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'processing',
      'completed',
      'failed'
    )
  ),
  warning_message TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extraction_run_id UUID NOT NULL REFERENCES evidence_extraction_runs(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK (
    source_kind IN (
      'linkedin_file',
      'supporting_file',
      'portfolio_url',
      'project_url',
      'legacy_json'
    )
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

CREATE TABLE IF NOT EXISTS evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extraction_run_id UUID NOT NULL REFERENCES evidence_extraction_runs(id) ON DELETE CASCADE,
  primary_source_id UUID REFERENCES evidence_sources(id) ON DELETE SET NULL,
  item_kind TEXT NOT NULL CHECK (
    item_kind IN (
      'experience',
      'project',
      'portfolio',
      'work_sample'
    )
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  title TEXT,
  company TEXT,
  role TEXT,
  description TEXT,
  url TEXT,
  proof_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  start_date TEXT,
  end_date TEXT,
  evidence_updated_at TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}'::text[],
  technologies TEXT[] NOT NULL DEFAULT '{}'::text[],
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  raw_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_runs_worker_profile_created_at
  ON evidence_extraction_runs(worker_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_runs_user_created_at
  ON evidence_extraction_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_runs_status_created_at
  ON evidence_extraction_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_sources_worker_profile_active
  ON evidence_sources(worker_profile_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_sources_user_active
  ON evidence_sources(user_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_sources_run
  ON evidence_sources(extraction_run_id);

CREATE INDEX IF NOT EXISTS idx_evidence_items_worker_profile_kind_active
  ON evidence_items(worker_profile_id, item_kind, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_evidence_items_run
  ON evidence_items(extraction_run_id);

CREATE INDEX IF NOT EXISTS idx_evidence_items_primary_source
  ON evidence_items(primary_source_id);

ALTER TABLE evidence_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evidence_extraction_runs'
      AND policyname = 'Users can manage their own evidence extraction runs'
  ) THEN
    CREATE POLICY "Users can manage their own evidence extraction runs"
      ON evidence_extraction_runs
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evidence_sources'
      AND policyname = 'Users can manage their own evidence sources'
  ) THEN
    CREATE POLICY "Users can manage their own evidence sources"
      ON evidence_sources
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evidence_items'
      AND policyname = 'Users can manage their own evidence items'
  ) THEN
    CREATE POLICY "Users can manage their own evidence items"
      ON evidence_items
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
