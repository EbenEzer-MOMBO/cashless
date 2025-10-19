
-- 1) PRODUCTS
CREATE TABLE public.products (
  id BIGSERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all products"
  ON public.products
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Agents can view products for their event"
  ON public.products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.user_id = auth.uid()
        AND a.active = true
        AND a.event_id = products.event_id
    )
  );

CREATE TRIGGER set_timestamp_products
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- 2) PARTICIPANTS
CREATE TABLE public.participants (
  id BIGSERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  qr_code TEXT NOT NULL UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  ticket_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all participants"
  ON public.participants
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Agents can view participants for their event"
  ON public.participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.user_id = auth.uid()
        AND a.active = true
        AND a.event_id = participants.event_id
    )
  );

CREATE TRIGGER set_timestamp_participants
BEFORE UPDATE ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_participants_event_id ON public.participants(event_id);


-- 3) TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('vente','recharge','refund')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  agent_id INTEGER NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  participant_id BIGINT NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all transactions"
  ON public.transactions
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Agents can select transactions for their event"
  ON public.transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.user_id = auth.uid()
        AND a.active = true
        AND a.event_id = transactions.event_id
    )
  );

CREATE POLICY "Agents can insert their own transactions (same event)"
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.agents a
      WHERE a.id = transactions.agent_id
        AND a.user_id = auth.uid()
        AND a.active = true
    )
    AND transactions.event_id = (
      SELECT a2.event_id FROM public.agents a2 WHERE a2.id = transactions.agent_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.participants p
      WHERE p.id = transactions.participant_id
        AND p.event_id = transactions.event_id
    )
  );

CREATE TRIGGER set_timestamp_transactions
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_products_event_id ON public.products(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON public.transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_agent_id ON public.transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_participant_id ON public.transactions(participant_id);
