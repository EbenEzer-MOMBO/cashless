
-- 1) Table d'affectations produit -> agent
CREATE TABLE IF NOT EXISTS public.product_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_assignments_unique UNIQUE (product_id, agent_id)
);

-- Index pour de bonnes perfs
CREATE INDEX IF NOT EXISTS idx_product_assignments_agent ON public.product_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_product_assignments_product ON public.product_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_assignments_event ON public.product_assignments(event_id);

-- 2) Trigger pour updated_at
DROP TRIGGER IF EXISTS trg_product_assignments_updated_at ON public.product_assignments;
CREATE TRIGGER trg_product_assignments_updated_at
BEFORE UPDATE ON public.product_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Validation de cohérence des événements (produit, agent, affectation)
CREATE OR REPLACE FUNCTION public.set_and_validate_product_assignment_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  p_event_id INTEGER;
  a_event_id INTEGER;
BEGIN
  SELECT event_id INTO p_event_id FROM public.products WHERE id = NEW.product_id;
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Product % not found', NEW.product_id;
  END IF;

  SELECT event_id INTO a_event_id FROM public.agents WHERE id = NEW.agent_id;
  IF a_event_id IS NULL THEN
    RAISE EXCEPTION 'Agent % not found', NEW.agent_id;
  END IF;

  -- Définir event_id automatiquement si non fourni
  IF NEW.event_id IS NULL THEN
    NEW.event_id := p_event_id;
  END IF;

  -- Vérifier la cohérence
  IF NEW.event_id <> p_event_id OR NEW.event_id <> a_event_id THEN
    RAISE EXCEPTION 'Assignment event_id % must match product.event_id % and agent.event_id %',
      NEW.event_id, p_event_id, a_event_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_assignments_validate ON public.product_assignments;
CREATE TRIGGER trg_product_assignments_validate
BEFORE INSERT OR UPDATE ON public.product_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_and_validate_product_assignment_event();

-- 4) Activer la RLS et politiques
ALTER TABLE public.product_assignments ENABLE ROW LEVEL SECURITY;

-- Admins: gérer tout
DROP POLICY IF EXISTS "Admins can manage all product assignments" ON public.product_assignments;
CREATE POLICY "Admins can manage all product assignments"
ON public.product_assignments
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Agents: voir uniquement leurs affectations
DROP POLICY IF EXISTS "Agents can view their own product assignments" ON public.product_assignments;
CREATE POLICY "Agents can view their own product assignments"
ON public.product_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = product_assignments.agent_id
      AND a.user_id = auth.uid()
      AND a.active = true
  )
);
