BEGIN;

ALTER TABLE public.stakes
  ADD COLUMN IF NOT EXISTS amount_eth NUMERIC;

ALTER TABLE public.stakes
  ADD COLUMN IF NOT EXISTS transaction_id TEXT;

ALTER TABLE public.stakes
  ADD COLUMN IF NOT EXISTS withdrawal_transaction_id TEXT;

ALTER TABLE public.stakes
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'wallet_transfer';

UPDATE public.stakes
SET payment_method = COALESCE(NULLIF(payment_method, ''), 'wallet_transfer')
WHERE payment_method IS NULL OR payment_method = '';

ALTER TABLE public.stakes
  ALTER COLUMN payment_method SET DEFAULT 'wallet_transfer';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stakes'
      AND column_name = 'amount'
  ) THEN
    EXECUTE '
      UPDATE public.stakes
      SET amount_eth = amount::numeric
      WHERE amount_eth IS NULL
    ';
  END IF;
END $$;

ALTER TABLE public.stakes
  ALTER COLUMN amount_eth SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stakes'
      AND column_name = 'tx_hash'
  ) THEN
    EXECUTE '
      UPDATE public.stakes
      SET transaction_id = COALESCE(transaction_id, tx_hash)
      WHERE tx_hash IS NOT NULL
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stakes'
      AND column_name = 'withdrawal_tx_hash'
  ) THEN
    EXECUTE '
      UPDATE public.stakes
      SET withdrawal_transaction_id = COALESCE(withdrawal_transaction_id, withdrawal_tx_hash)
      WHERE withdrawal_tx_hash IS NOT NULL
    ';
  END IF;
END $$;

ALTER TABLE public.stakes
  DROP COLUMN IF EXISTS amount_wei,
  DROP COLUMN IF EXISTS tx_hash,
  DROP COLUMN IF EXISTS withdrawal_tx_hash,
  DROP COLUMN IF EXISTS amount;

COMMIT;
