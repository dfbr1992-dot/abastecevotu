-- Constraint parcial para impedir duplicidade de device_id anônimos.
-- (UNIQUE NULLS DISTINCT ... WHERE) não é suportado em batch; aplicada aqui separadamente.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_subscriptions_anon_device_unique'
  ) THEN
    CREATE UNIQUE INDEX user_subscriptions_anon_device_unique
    ON public.user_subscriptions (device_id)
    WHERE user_id IS NULL;
  END IF;
END $$;
