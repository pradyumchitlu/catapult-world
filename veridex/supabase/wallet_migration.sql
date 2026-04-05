ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS wallet_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_verification_method TEXT DEFAULT 'signature',
  ADD COLUMN IF NOT EXISTS wallet_last_balance_sync_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS wallet_verification_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  nonce TEXT UNIQUE NOT NULL,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_verification_challenges_user_id ON wallet_verification_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_verification_challenges_nonce ON wallet_verification_challenges(nonce);

ALTER TABLE wallet_verification_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet verification challenges" ON wallet_verification_challenges;
CREATE POLICY "Users can view their own wallet verification challenges"
  ON wallet_verification_challenges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own wallet verification challenges" ON wallet_verification_challenges;
CREATE POLICY "Users can create their own wallet verification challenges"
  ON wallet_verification_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wallet verification challenges" ON wallet_verification_challenges;
CREATE POLICY "Users can update their own wallet verification challenges"
  ON wallet_verification_challenges FOR UPDATE
  USING (auth.uid() = user_id);
