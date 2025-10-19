-- Create eventime_events table for syncing external events
CREATE TABLE public.eventime_events (
  id SERIAL PRIMARY KEY,
  external_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',
  organizer_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_connections table for tracking client connections
CREATE TABLE public.client_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  event_id INTEGER NOT NULL,
  balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_wallet_transactions table for tracking client transactions
CREATE TABLE public.client_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_connection_id UUID NOT NULL REFERENCES public.client_connections(id),
  transaction_type TEXT NOT NULL, -- 'recharge', 'payment', 'refund'
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  external_transaction_id TEXT,
  agent_id INTEGER,
  product_id BIGINT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.eventime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for eventime_events
CREATE POLICY "Admins can manage all eventime events" 
ON public.eventime_events 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Agents can view eventime events" 
ON public.eventime_events 
FOR SELECT 
USING (true);

-- RLS policies for client_connections  
CREATE POLICY "Admins can manage all client connections" 
ON public.client_connections 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Agents can view client connections for their event" 
ON public.client_connections 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM agents a 
  WHERE a.user_id = auth.uid() 
  AND a.active = true 
  AND a.event_id = client_connections.event_id
));

-- RLS policies for client_wallet_transactions
CREATE POLICY "Admins can manage all client wallet transactions" 
ON public.client_wallet_transactions 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Agents can view client transactions for their event" 
ON public.client_wallet_transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM agents a 
  JOIN client_connections cc ON cc.event_id = a.event_id
  WHERE a.user_id = auth.uid() 
  AND a.active = true 
  AND cc.id = client_wallet_transactions.client_connection_id
));

-- Add triggers for updated_at
CREATE TRIGGER update_eventime_events_updated_at
  BEFORE UPDATE ON public.eventime_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_connections_updated_at
  BEFORE UPDATE ON public.client_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_wallet_transactions_updated_at
  BEFORE UPDATE ON public.client_wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();