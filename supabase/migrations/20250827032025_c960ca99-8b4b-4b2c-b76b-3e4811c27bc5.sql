
-- 1) Ajouter les clés étrangères pour permettre les jointures PostgREST depuis transactions

-- Vérifier d'abord qu'il n'existe pas déjà des contraintes avec ces noms.
-- Si elles existent sous d'autres noms, on peut les conserver. Sinon, on ajoute celles-ci.

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT transactions_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES public.participants(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT transactions_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT transactions_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- 2) Index pour de meilleures performances des filtres et ordres courants

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
