-- Function to automatically assign a product to all active agents of the same event
CREATE OR REPLACE FUNCTION public.auto_assign_product_to_agents()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger that fires after product insertion
CREATE TRIGGER trigger_auto_assign_product_to_agents
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_product_to_agents();

-- Function to bulk assign existing unassigned products to agents
CREATE OR REPLACE FUNCTION public.bulk_assign_unassigned_products(p_event_id INTEGER DEFAULT NULL)
RETURNS TABLE(assigned_count INTEGER) AS $$
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
$$ LANGUAGE plpgsql;