import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketCode } = await req.json();

    if (!ticketCode) {
      console.error('Missing ticketCode in request');
      return new Response(
        JSON.stringify({ error: 'ticketCode is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Sanitize and normalize incoming code
    const cleanedTicketCode = String(ticketCode)
      .normalize('NFC')
      .trim()
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // remove control chars

    if (!cleanedTicketCode) {
      console.error('Empty cleanedTicketCode after sanitization');
      return new Response(
        JSON.stringify({ error: 'Invalid ticket code', status: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticating participant with ticket: ${cleanedTicketCode}`);

    // Call Eventime API to validate ticket (URL-encode the code to support accents and special chars)
    const encoded = encodeURIComponent(cleanedTicketCode);
    const eventimeResponse = await fetch(`https://eventime.ga/api/cashless/scan/${encoded}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!eventimeResponse.ok) {
      console.error(`Eventime API request failed with status: ${eventimeResponse.status}`);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid ticket code or API error',
          status: false 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const eventimeData = await eventimeResponse.json();
    
    if (!eventimeData.status || !eventimeData.ticket) {
      console.error('Invalid response from Eventime API:', eventimeData);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid ticket code',
          status: false 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const ticket = eventimeData.ticket;
    
    // Check if participant exists, create or update if needed
    const { data: existingParticipant, error: selectError } = await supabase
      .from('participants')
      .select('*')
      .eq('qr_code', cleanedTicketCode)
      .single();

    let participant;
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking participant:', selectError);
      throw selectError;
    }

    if (existingParticipant) {
      // Update existing participant with Eventime data
      const { data: updatedParticipant, error: updateError } = await supabase
        .from('participants')
        .update({
          ticket_item_id: ticket.ticket_item_id,
          civility_buyer: ticket.civility_buyer,
          buyer_name: ticket.buyerName,
          civility_participant: ticket.civility_participant,
          participant_name: ticket.participantName,
          participant_lastname: ticket.participantLastname,
          participant_email: ticket.participantEmailAddress,
          participant_telephone: ticket.participantTelephone,
          participant_matricule: ticket.participantMatricule,
          event_id: ticket.event_id,
          eventime_status: ticket.status,
          eventime_created_at: ticket.created_at,
          eventime_updated_at: ticket.updated_at,
          last_sync: new Date().toISOString(),
          ticket_number: ticket.ticketNumber
        })
        .eq('id', existingParticipant.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating participant:', updateError);
        throw updateError;
      }
      
      participant = updatedParticipant;
    } else {
      // Create new participant
      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert({
          name: `${ticket.participantName} ${ticket.participantLastname}`,
          email: ticket.participantEmailAddress,
          qr_code: cleanedTicketCode,
          ticket_item_id: ticket.ticket_item_id,
          civility_buyer: ticket.civility_buyer,
          buyer_name: ticket.buyerName,
          civility_participant: ticket.civility_participant,
          participant_name: ticket.participantName,
          participant_lastname: ticket.participantLastname,
          participant_email: ticket.participantEmailAddress,
          participant_telephone: ticket.participantTelephone,
          participant_matricule: ticket.participantMatricule,
          event_id: ticket.event_id,
          eventime_status: ticket.status,
          eventime_created_at: ticket.created_at,
          eventime_updated_at: ticket.updated_at,
          last_sync: new Date().toISOString(),
          ticket_number: ticket.ticketNumber,
          balance: 0,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating participant:', insertError);
        throw insertError;
      }
      
      participant = newParticipant;
    }

    // Create or update session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .upsert({
        participant_id: participant.id,
        ticket_code: cleanedTicketCode,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        last_activity: new Date().toISOString()
      }, { 
        onConflict: 'participant_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw sessionError;
    }

    console.log(`Successfully authenticated participant: ${participant.name}`);

    return new Response(JSON.stringify({
      status: true,
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        balance: participant.balance,
        event_id: participant.event_id,
        qr_code: participant.qr_code
      },
      session: {
        token: session.session_token,
        expires_at: session.expires_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in participant-auth function:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as any).message || 'Authentication failed',
        status: false 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
