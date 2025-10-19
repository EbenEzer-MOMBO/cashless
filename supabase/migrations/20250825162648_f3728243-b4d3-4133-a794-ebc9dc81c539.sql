-- Fix the foreign key constraint for agents table
ALTER TABLE public.agents 
ADD CONSTRAINT agents_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id);

-- Update RLS policies for agents table to fix admin visibility
DROP POLICY IF EXISTS "Admins can manage all agents" ON public.agents;
DROP POLICY IF EXISTS "Admins can view all agents" ON public.agents;

-- Create separate policies for better visibility
CREATE POLICY "Admins can view all agents" 
ON public.agents 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert agents" 
ON public.agents 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update all agents" 
ON public.agents 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete agents" 
ON public.agents 
FOR DELETE 
USING (is_admin(auth.uid()));