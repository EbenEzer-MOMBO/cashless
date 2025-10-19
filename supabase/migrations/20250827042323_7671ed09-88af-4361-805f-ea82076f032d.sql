
-- 1) Créer la table de suivi des paiements mobiles
CREATE TABLE IF NOT EXISTS public.mobile_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id BIGINT NOT NULL,
  event_id INTEGER NOT NULL,
  msisdn TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  email TEXT NOT NULL,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  description TEXT NOT NULL,
  reference TEXT NOT NULL,
  payment_system TEXT NOT NULL, -- ex: 'airtel' ou 'moov'
  bill_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | failed
  transaction_id UUID NULL, -- lien vers public.transactions.id une fois confirmé
  raw_request JSONB,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ NULL
);

-- Contraintes d'unicité pour idempotence
CREATE UNIQUE INDEX IF NOT EXISTS mobile_payments_reference_key ON public.mobile_payments(reference);
CREATE UNIQUE INDEX IF NOT EXISTS mobile_payments_bill_id_key ON public.mobile_payments(bill_id);

-- Déclencheur pour updated_at
CREATE TRIGGER trg_mobile_payments_updated_at
BEFORE UPDATE ON public.mobile_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Activer RLS et politiques
ALTER TABLE public.mobile_payments ENABLE ROW LEVEL SECURITY;

-- Admins: gestion complète
DROP POLICY IF EXISTS "Admins can manage all mobile_payments" ON public.mobile_payments;
CREATE POLICY "Admins can manage all mobile_payments"
  ON public.mobile_payments
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Participants: lecture de leurs propres paiements (session active et valide)
DROP POLICY IF EXISTS "Participants can view their own mobile payments" ON public.mobile_payments;
CREATE POLICY "Participants can view their own mobile payments"
  ON public.mobile_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.participant_sessions ps
      WHERE ps.participant_id = mobile_payments.participant_id
        AND ps.is_active = true
        AND ps.expires_at > now()
    )
  );

-- 3) Rendre transactions.agent_id nullable pour supporter les recharges sans agent
ALTER TABLE public.transactions
  ALTER COLUMN agent_id DROP NOT NULL;

-- 4) Ajouter une colonne 'source' pour tracer l'origine des transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'agent';

-- Optionnel: index sur source si besoin d'analytique
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
