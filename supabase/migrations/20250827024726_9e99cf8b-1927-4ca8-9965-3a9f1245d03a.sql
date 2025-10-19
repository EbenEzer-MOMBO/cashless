-- Add foreign key constraints to establish proper relationships between tables

-- Add foreign key from transactions.agent_id to agents.id
ALTER TABLE public.transactions 
ADD CONSTRAINT fk_transactions_agent_id 
FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE RESTRICT;

-- Add foreign key from transactions.participant_id to participants.id
ALTER TABLE public.transactions 
ADD CONSTRAINT fk_transactions_participant_id 
FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE RESTRICT;

-- Add foreign key from transactions.product_id to products.id
ALTER TABLE public.transactions 
ADD CONSTRAINT fk_transactions_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;