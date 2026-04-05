CREATE TABLE IF NOT EXISTS oauth_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  scopes TEXT[] NOT NULL DEFAULT ARRAY['openid', 'profile'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES oauth_apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT UNIQUE NOT NULL,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_apps_owner_user_id ON oauth_apps(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_apps_client_id ON oauth_apps(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_app_id ON oauth_authorization_codes(app_id);
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_user_id ON oauth_authorization_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_code_hash ON oauth_authorization_codes(code_hash);

ALTER TABLE oauth_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own oauth apps" ON oauth_apps;
CREATE POLICY "Users can manage their own oauth apps"
  ON oauth_apps
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can create oauth codes for themselves" ON oauth_authorization_codes;
CREATE POLICY "Users can create oauth codes for themselves"
  ON oauth_authorization_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view oauth codes they issued" ON oauth_authorization_codes;
CREATE POLICY "Users can view oauth codes they issued"
  ON oauth_authorization_codes FOR SELECT
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_oauth_apps_updated_at ON oauth_apps;
CREATE TRIGGER update_oauth_apps_updated_at
  BEFORE UPDATE ON oauth_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
