
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  action: 'initiate' | 'check';
  msisdn?: string;
  amount?: number;
  email?: string;
  firstname?: string;
  lastname?: string;
  payment_system?: string;
  bill_id?: string;
  participant_id?: number;
}

const EVENTIME_API_BASE = 'https://eventime.ga/api/cashless';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Authorization header and parse body
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    // Enhanced logging for debugging
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers.get('Content-Type'));
    console.log('Request body available:', req.body !== null);
    
    let body: PaymentRequest;
    let rawBody: string = '';
    
    try {
      // Get raw text first for debugging
      rawBody = await req.text();
      console.log('Raw request body length:', rawBody.length);
      console.log('Raw request body preview:', rawBody.substring(0, 200));
      
      // Parse JSON
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Request body is empty');
      }
      
      body = JSON.parse(rawBody) as PaymentRequest;
      console.log('Successfully parsed JSON body:', { action: body.action, participant_id: body.participant_id });
    } catch (error) {
      console.error('Error parsing request body:', error);
      console.error('Raw body that failed to parse:', rawBody);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Format de requête invalide',
          details: error instanceof Error ? error.message : 'Unknown parsing error'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Auth header received:', authHeader ? '[present]' : '[absent]');
    console.log('Incoming action:', body.action, 'participant_id:', body.participant_id);

    // Try to resolve participant from session token first, then fallback to participant_id
    let participant: { id: number; name: string; email: string; event_id: number } | null = null;

    if (authHeader) {
      // Verify participant session with detailed logging
      console.log('Searching for session with token:', authHeader.substring(0, 8) + '...');
      
      const { data: sessions, error: sessionError } = await supabaseClient
        .from('participant_sessions')
        .select('participant_id, expires_at, is_active, session_token')
        .eq('session_token', authHeader)
        .eq('is_active', true);

      console.log('Session query result:', { 
        sessionCount: sessions?.length || 0, 
        sessionError: sessionError ? sessionError.message : null 
      });

      if (sessions && sessions.length > 0 && !sessionError) {
        const session = sessions[0];
        console.log('Found session for participant:', session.participant_id, 'expires:', session.expires_at);
        
        if (new Date(session.expires_at) > new Date()) {
          const { data: p, error: participantError } = await supabaseClient
            .from('participants')
            .select('id, name, email, event_id')
            .eq('id', session.participant_id)
            .maybeSingle();
            
          console.log('Participant lookup result:', { 
            participant: p ? `${p.name} (ID: ${p.id})` : null, 
            error: participantError ? participantError.message : null 
          });
          
          if (!participantError && p) participant = p as any;
        } else {
          console.log('Session expired at:', session.expires_at);
        }
      } else {
        console.log('No valid session found for token');
      }
    }

    // Fallback to participant_id if provided
    if (!participant && body.participant_id) {
      console.log('Attempting participant_id fallback:', body.participant_id);
      const { data: p, error: participantError } = await supabaseClient
        .from('participants')
        .select('id, name, email, event_id')
        .eq('id', body.participant_id)
        .maybeSingle();
      
      console.log('Participant fallback result:', { 
        participant: p ? `${p.name} (ID: ${p.id})` : null, 
        error: participantError ? participantError.message : null 
      });
      
      if (!participantError && p) participant = p as any;
    }

    if (!participant) {
      console.error('Authentication failed: no valid participant found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Session invalide ou expirée. Veuillez vous reconnecter.' 
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('Authentication successful for participant:', participant.name, '(ID:', participant.id, ')');

    if (body.action === 'initiate') {
      console.log('=== INITIATE PAYMENT START ===');
      console.log('Request body:', JSON.stringify(body, null, 2));
      
      // Validate required fields
      const { msisdn, amount, email, firstname, lastname, payment_system } = body;
      
      console.log('Validating required fields:', { 
        msisdn: !!msisdn, 
        amount: !!amount, 
        email: !!email, 
        firstname: !!firstname, 
        lastname: !!lastname, 
        payment_system: !!payment_system 
      });
      
      if (!msisdn || !amount || !email || !firstname || !lastname || !payment_system) {
        console.log('ERROR: Missing required fields');
        return new Response(
          JSON.stringify({ success: false, error: 'Données manquantes' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate amount
      console.log('Validating amount:', amount);
      if (amount < 100) {
        console.log('ERROR: Amount too low:', amount);
        return new Response(
          JSON.stringify({ success: false, error: 'Le montant minimum est de 100 FCFA' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Normalize and validate msisdn format
      let normalizedMsisdn = msisdn.replace(/[\s\-\+]/g, ''); // Remove spaces, dashes, plus
      
      // Handle international format (+241)
      if (normalizedMsisdn.startsWith('241')) {
        normalizedMsisdn = normalizedMsisdn.substring(3);
      }
      
      // Validate normalized format
      const msisdnRegex = /^(06|07)\d{7}$/;
      console.log(`MSISDN validation: original="${msisdn}", normalized="${normalizedMsisdn}", regex_test=${msisdnRegex.test(normalizedMsisdn)}`);
      if (!msisdnRegex.test(normalizedMsisdn)) {
        console.log(`ERROR: Invalid MSISDN format: original="${msisdn}", normalized="${normalizedMsisdn}"`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Format de numéro invalide. Utilisez: 06XXXXXXXX, 07XXXXXXXX, +24106XXXXXXXX ou +24107XXXXXXXX' 
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      console.log(`MSISDN normalized: "${msisdn}" -> "${normalizedMsisdn}"`);
      
      // Determine payment operator: prefer provided payment_system, else infer from msisdn
      const providedSystem = (payment_system || '').toLowerCase();
      const inferred = normalizedMsisdn.startsWith('07') ? 'airtelmoney' : 'moovmoney4';
      
      // Map payment system identifiers to their correct values
      let operator = inferred; // default fallback
      if (providedSystem === 'airtelmoney' || providedSystem === 'airtel') {
        operator = 'airtelmoney';
      } else if (providedSystem === 'moovmoney4' || providedSystem === 'moov') {
        operator = 'moovmoney4';
      }
      console.log(`Operator resolved: ${operator} (provided: ${providedSystem || 'none'}, inferred from MSISDN: ${inferred})`);

      // Generate unique reference
      const reference = `PART-${participant.id}-${Date.now()}`;
      const description = `Recharge portefeuille - Participant ${participant.name}`;

      // Prepare payment data with normalized MSISDN
      const paymentData = {
        msisdn: normalizedMsisdn,  // Use normalized MSISDN
        amount: amount.toString(),
        email,
        firstname,
        lastname,
        description,
        reference,
        payment_system: operator,  // Use detected operator
      };

      console.log(`Payment details - Participant: ${participant.name} (ID: ${participant.id}), Event: ${participant.event_id}, Amount: ${amount} FCFA, Operator: ${operator}`);

      try {
        // Call Eventime API to initiate payment with timeout
        console.log('Initiating payment with Eventime API:', paymentData);
        
        // Retry wrapper with longer timeout to improve reliability
        const maxAttempts = 2;
        let response: Response | undefined;
        let lastError: any;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
          try {
            console.log(`Initiating payment with Eventime API (attempt ${attempt}/${maxAttempts})`, { reference, operator });
            response = await fetch(`${EVENTIME_API_BASE}/initier-paiement`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(paymentData),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) break;
            const bodyText = await response.text();
            console.error(`Eventime initiate HTTP ${response.status} (attempt ${attempt}) body:`, bodyText);
            lastError = new Error(`Erreur API: HTTP ${response.status}`);
          } catch (err: any) {
            clearTimeout(timeoutId);
            lastError = err;
            if (err?.name === 'AbortError') {
              console.warn(`Eventime initiate timeout on attempt ${attempt}`);
            } else {
              console.error(`Eventime initiate network error on attempt ${attempt}:`, err?.message || err);
            }
          }
          // small backoff before retry (except after last attempt)
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
        if (!response || !response.ok) {
          throw lastError || new Error('Impossible de joindre le service de paiement');
        }

        let responseData;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          console.error('Invalid JSON response from Eventime API:', await response.text());
          throw new Error('Réponse invalide de l\'API de paiement');
        }

        console.log(`Eventime API response (status: ${response.status}):`, responseData);

        if (!response.ok) {
          console.error(`Eventime API HTTP error: ${response.status}`);
          const errorMessage = responseData?.message || responseData?.error || `Erreur HTTP ${response.status}`;
          throw new Error(`Erreur API: ${errorMessage}`);
        }

        if (!responseData.success) {
          console.error('ERROR: Eventime API returned success=false:', responseData);
          const errorMessage = responseData.message || responseData.error || 'Échec de l\'initiation du paiement';
          console.error('Parsed error message:', errorMessage);
          throw new Error(errorMessage);
        }

        if (!responseData.data?.bill_id) {
          console.error('Missing bill_id in Eventime response:', responseData);
          throw new Error('Réponse API incomplète (bill_id manquant)');
        }

        // Store payment in database
        const { data: mobilePayment, error: insertError } = await supabaseClient
          .from('mobile_payments')
          .insert({
            participant_id: participant.id,
            event_id: participant.event_id,
            msisdn: normalizedMsisdn,  // Use normalized MSISDN
            amount,
            email,
            firstname,
            lastname,
            description,
            reference,
            payment_system: operator,  // Use detected operator
            bill_id: responseData.data.bill_id,
            status: 'pending',
            raw_request: paymentData,
            raw_response: responseData,
          })
          .select()
          .single();

        if (insertError) {
          console.error('ERROR: Error storing payment:', insertError);
          throw new Error('Erreur lors de l\'enregistrement du paiement');
        }

        console.log(`SUCCESS: Payment successfully stored in database with ID: ${mobilePayment.id}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Paiement initié avec succès',
            data: {
              payment_id: mobilePayment.id,
              bill_id: responseData.data.bill_id,
              reference,
              amount,
              status: 'pending'
            }
          }),
          { status: 200, headers: corsHeaders }
        );

      } catch (error) {
        console.error('Payment initiation error:', error);
        
        // Handle specific error types
        let errorMessage = 'Erreur lors de l\'initiation du paiement';
        
        if (error.name === 'AbortError') {
          errorMessage = 'Délai d\'attente dépassé. Vérifiez votre connexion et réessayez.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: errorMessage
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (body.action === 'check') {
      const { bill_id } = body;
      
      if (!bill_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'bill_id manquant' }),
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        // Get payment from database
        const { data: mobilePayment, error: paymentError } = await supabaseClient
          .from('mobile_payments')
          .select('*')
          .eq('bill_id', bill_id)
          .eq('participant_id', participant.id)
          .single();

        if (paymentError || !mobilePayment) {
          return new Response(
            JSON.stringify({ success: false, error: 'Paiement non trouvé' }),
            { status: 404, headers: corsHeaders }
          );
        }

        // If already confirmed, return success
        if (mobilePayment.status === 'confirmed') {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Le paiement a été confirmé avec succès.',
              data: { status: 'confirmed', amount: mobilePayment.amount }
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        // Check payment status with Eventime API
        console.log('Checking payment status for bill_id:', bill_id);
        
        // Check status with retry and longer timeout
        const maxAttempts = 2;
        let response: Response | undefined;
        let lastError: any;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout
          try {
            console.log(`Checking payment status (attempt ${attempt}/${maxAttempts}) for bill_id:`, bill_id);
            response = await fetch(`${EVENTIME_API_BASE}/etat-paiement/${bill_id}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) break;
            const bodyText = await response.text();
            console.error(`Eventime status HTTP ${response.status} (attempt ${attempt}) body:`, bodyText);
            lastError = new Error(`Erreur API: HTTP ${response.status}`);
          } catch (err: any) {
            clearTimeout(timeoutId);
            lastError = err;
            if (err?.name === 'AbortError') {
              console.warn(`Eventime status timeout on attempt ${attempt}`);
            } else {
              console.error(`Eventime status network error on attempt ${attempt}:`, err?.message || err);
            }
          }
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
        if (!response || !response.ok) {
          throw lastError || new Error('Impossible de vérifier le statut du paiement');
        }
        
        let responseData;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          console.error('Invalid JSON response from Eventime status API:', await response.text());
          throw new Error('Réponse invalide de l\'API de vérification');
        }
        
        console.log(`Payment status response (HTTP ${response.status}):`, responseData);

        if (response.ok && responseData.success) {
          // Payment confirmed, create transaction and update balance
          const { data: transaction, error: transactionError } = await supabaseClient
            .from('transactions')
            .insert({
              participant_id: participant.id,
              event_id: participant.event_id,
              type: 'recharge',
              amount: mobilePayment.amount,
              status: 'completed',
              source: 'mobile_payment'
            })
            .select()
            .single();

          if (transactionError) {
            console.error('Error creating transaction:', transactionError);
            throw new Error('Erreur lors de la création de la transaction');
          }

          // Get current balance first
          const { data: participantData, error: getError } = await supabaseClient
            .from('participants')
            .select('balance')
            .eq('id', participant.id)
            .single();

          if (getError) {
            console.error('Error getting participant balance:', getError);
            throw new Error('Erreur lors de la récupération du solde');
          }

          const newBalance = Number(participantData.balance) + Number(mobilePayment.amount);
          
          // Update participant balance
          const { error: balanceError } = await supabaseClient
            .from('participants')
            .update({
              balance: newBalance
            })
            .eq('id', participant.id);

          if (balanceError) {
            console.error('Error updating balance:', balanceError);
            throw new Error('Erreur lors de la mise à jour du solde');
          }

          // Update mobile payment status
          const { error: updateError } = await supabaseClient
            .from('mobile_payments')
            .update({
              status: 'confirmed',
              transaction_id: transaction.id,
              confirmed_at: new Date().toISOString(),
              raw_response: { ...mobilePayment.raw_response, status_check: responseData }
            })
            .eq('id', mobilePayment.id);

          if (updateError) {
            console.error('Error updating payment status:', updateError);
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Le paiement a été confirmé avec succès.',
              data: { status: 'confirmed', amount: mobilePayment.amount }
            }),
            { status: 200, headers: corsHeaders }
          );
        } else {
          // Payment still pending
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Paiement en attente de confirmation.',
              data: { status: 'pending' }
            }),
            { status: 200, headers: corsHeaders }
          );
        }

      } catch (error) {
        console.error('Payment check error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || 'Erreur lors de la vérification du paiement'
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Action non supportée' }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
