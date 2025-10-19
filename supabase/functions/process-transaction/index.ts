
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionRequest {
  type: 'vente' | 'recharge' | 'refund';
  amount: number;
  participantId?: number;
  productId?: number;
  qrCode?: string;
  quantity?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Set the auth token for the supabase client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { type, amount, participantId, productId, qrCode, quantity }: TransactionRequest = await req.json();

    console.log('Processing transaction:', { type, amount, participantId, productId, userId: user.id });

    // Get agent information
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, event_id, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .single();

    if (agentError || !agent) {
      console.error('Agent error:', agentError);
      return new Response(JSON.stringify({ error: 'Agent non trouvé ou inactif' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get or find participant
    let participant;
    if (qrCode) {
      // Clean and normalize QR code (same logic as in useTransactionHandler)
      const cleanedQrCode = String(qrCode)
        .normalize('NFC')
        .trim()
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '');

      const { data: foundParticipant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('qr_code', cleanedQrCode)
        .eq('event_id', agent.event_id)
        .eq('status', 'active')
        .single();

      if (participantError || !foundParticipant) {
        console.error('Participant search error:', participantError);
        return new Response(JSON.stringify({ error: 'Participant non trouvé avec ce QR code' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      participant = foundParticipant;
    } else if (participantId) {
      const { data: foundParticipant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', participantId)
        .eq('event_id', agent.event_id)
        .eq('status', 'active')
        .single();

      if (participantError || !foundParticipant) {
        console.error('Participant search error:', participantError);
        return new Response(JSON.stringify({ error: 'Participant non trouvé' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      participant = foundParticipant;
    } else {
      return new Response(JSON.stringify({ error: 'ID participant ou QR code requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Validate transaction based on type
    if (type === 'vente') {
      if (participant.balance < amount) {
        return new Response(JSON.stringify({ error: 'Solde insuffisant' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // If product specified, check stock
      if (productId) {
        const requestedQuantity = quantity || 1;
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock, active')
          .eq('id', productId)
          .eq('event_id', agent.event_id)
          .single();

        if (productError || !product || !product.active) {
          return new Response(JSON.stringify({ error: 'Produit non disponible' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (product.stock < requestedQuantity) {
          return new Response(JSON.stringify({ error: 'Stock insuffisant' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }
    } else if (type === 'refund') {
      if (participant.balance < amount) {
        return new Response(JSON.stringify({ error: 'Solde insuffisant pour le remboursement' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Start transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        type,
        amount,
        agent_id: agent.id,
        participant_id: participant.id,
        product_id: productId || null,
        event_id: agent.event_id
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la création de la transaction' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Update participant balance
    const newBalance = type === 'recharge' 
      ? participant.balance + amount 
      : participant.balance - amount;

    const { error: balanceError } = await supabase
      .from('participants')
      .update({ balance: newBalance })
      .eq('id', participant.id);

    if (balanceError) {
      console.error('Balance update error:', balanceError);
      // Rollback transaction if balance update fails
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour du solde' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Update product stock if it's a sale - CRITICAL: Must succeed or rollback everything
    if (type === 'vente' && productId) {
      const requestedQuantity = quantity || 1;
      
      console.log(`Attempting to update stock for product ${productId}, reducing by ${requestedQuantity}`);
      
      // Get the current product again to access stock value
      const { data: currentProduct, error: productFetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (productFetchError || !currentProduct) {
        console.error('Failed to fetch current product for stock update:', productFetchError);
        // Rollback transaction and balance update
        await supabase.from('transactions').delete().eq('id', transaction.id);
        await supabase
          .from('participants')
          .update({ balance: participant.balance })
          .eq('id', participant.id);
        return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour du stock - produit introuvable' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const newStock = currentProduct.stock - requestedQuantity;
      console.log(`Current stock: ${currentProduct.stock}, New stock will be: ${newStock}`);

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (stockError) {
        console.error('CRITICAL: Stock update failed:', stockError);
        // Rollback transaction and balance update
        await supabase.from('transactions').delete().eq('id', transaction.id);
        await supabase
          .from('participants')
          .update({ balance: participant.balance })
          .eq('id', participant.id);
        return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour du stock' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      console.log(`Stock successfully updated for product ${productId}: ${currentProduct.stock} -> ${newStock}`);
    }

    return new Response(JSON.stringify({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        newBalance,
        participant: {
          name: participant.name,
          balance: newBalance
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur interne du serveur' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
