import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAgentRequest {
  name: string;
  email: string;
  password?: string;
  role: 'recharge' | 'vente';
  eventId: number;
  firstName?: string;
  lastName?: string;
  eventName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { name, email, password, role, eventId, firstName, lastName, eventName }: CreateAgentRequest = await req.json();

    console.log('Creating agent:', { name, email, role, eventId });

    // Use provided password or generate a temporary one
    const agentPassword = password || generateTemporaryPassword();

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password: agentPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || name.split(' ')[0],
        last_name: lastName || name.split(' ').slice(1).join(' '),
        role: 'agent'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Erreur lors de la création du compte: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Aucun utilisateur créé');
    }

    console.log('User created in auth:', authData.user.id);

    // Ensure event exists in local DB to satisfy FK
    const { data: existingEvent, error: existingEventError } = await supabaseClient
      .from('events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();

    if (existingEventError) {
      console.error('Event lookup error:', existingEventError);
    }

    if (!existingEvent) {
      if (!eventName) {
        console.warn('Event not found and no eventName provided; cannot create agent due to FK');
        throw new Error('Événement introuvable. Veuillez recharger la liste des événements et réessayer.');
      }
      const { error: insertEventError } = await supabaseClient
        .from('events')
        .insert({ id: eventId, name: eventName });
      if (insertEventError) {
        console.error('Event insert error:', insertEventError);
        throw new Error(`Impossible de synchroniser l\'événement (${eventId}): ${insertEventError.message}`);
      }
    }

    // Create the agent record
    const { data: agentData, error: agentError } = await supabaseClient
      .from('agents')
      .insert({
        user_id: authData.user.id,
        name,
        email,
        role,
        event_id: eventId,
        temporary_password: agentPassword,
        active: true
      })
      .select()
      .single();

    if (agentError) {
      console.error('Agent creation error:', agentError);
      // Clean up auth user if agent creation fails
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Erreur lors de la création de l'agent: ${agentError.message}`);
    }

    console.log('Agent created:', agentData);

    // Send credentials email
    const { error: emailError } = await supabaseClient.functions.invoke('send-agent-credentials', {
      body: {
        email,
        name,
        temporaryPassword: agentPassword,
        loginUrl: `${Deno.env.get('SITE_URL') || 'https://f1c47686-d510-4b30-91b5-e45f81c04b54.sandbox.lovable.dev'}/agent/login`
      }
    });

    if (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the whole operation if email fails
    }

    return new Response(JSON.stringify({
      success: true,
      agent: agentData,
      message: 'Agent créé avec succès'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in create-agent function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur inconnue lors de la création de l\'agent',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(handler);