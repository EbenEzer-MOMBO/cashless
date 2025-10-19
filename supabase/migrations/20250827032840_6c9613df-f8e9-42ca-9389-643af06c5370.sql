
-- 1) Clés étrangères idempotentes pour public.transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_agent_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES public.agents(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_participant_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_participant_id_fkey
      FOREIGN KEY (participant_id) REFERENCES public.participants(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_product_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_event_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES public.events(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- 2) Index pour de meilleures performances (idempotents)
CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON public.transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_event_id
  ON public.transactions (event_id);

CREATE INDEX IF NOT EXISTS idx_transactions_agent_id
  ON public.transactions (agent_id);

CREATE INDEX IF NOT EXISTS idx_transactions_participant_id
  ON public.transactions (participant_id);

CREATE INDEX IF NOT EXISTS idx_transactions_product_id
  ON public.transactions (product_id);

-- 3) Realtime (sécurisé/idempotent)
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  EXCEPTION WHEN duplicate_object THEN
    -- La table est déjà dans la publication, on ignore
    NULL;
  END;
END $$;
