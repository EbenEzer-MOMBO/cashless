import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('agents')
      .select(`
        id, name, email, role, active, last_activity, total_sales, event_id, created_at, updated_at,
        events:event_id ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const agents = (data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      active: a.active,
      last_activity: a.last_activity,
      total_sales: a.total_sales,
      event_id: a.event_id,
      created_at: a.created_at,
      updated_at: a.updated_at,
      event_name: a.events?.name ?? null,
    }));

    return new Response(
      JSON.stringify({ success: true, agents }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err: any) {
    console.error('Unhandled error in list-agents:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
