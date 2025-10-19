-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.auto_assign_product_to_agents()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert product assignments for all active agents of the same event
  INSERT INTO public.product_assignments (product_id, agent_id, event_id)
  SELECT 
    NEW.id as product_id,
    a.id as agent_id,
    NEW.event_id as event_id
  FROM public.agents a
  WHERE a.event_id = NEW.event_id 
    AND a.active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.product_assignments pa 
      WHERE pa.product_id = NEW.id AND pa.agent_id = a.id
    );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_assign_unassigned_products(p_event_id INTEGER DEFAULT NULL)
RETURNS TABLE(assigned_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assignment_count INTEGER := 0;
BEGIN
  -- Insert missing product assignments
  INSERT INTO public.product_assignments (product_id, agent_id, event_id)
  SELECT DISTINCT
    p.id as product_id,
    a.id as agent_id,
    p.event_id as event_id
  FROM public.products p
  CROSS JOIN public.agents a
  WHERE p.event_id = a.event_id
    AND a.active = true
    AND p.active = true
    AND (p_event_id IS NULL OR p.event_id = p_event_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.product_assignments pa 
      WHERE pa.product_id = p.id AND pa.agent_id = a.id
    );
  
  GET DIAGNOSTICS assignment_count = ROW_COUNT;
  
  RETURN QUERY SELECT assignment_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_and_validate_product_assignment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = is_admin.user_id 
    AND profiles.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;