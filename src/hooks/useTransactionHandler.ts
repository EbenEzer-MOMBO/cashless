
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { toast } from 'sonner';

interface TransactionRequest {
  type: 'vente' | 'recharge' | 'refund';
  amount: number;
  participantId?: number;
  productId?: number;
  qrCode?: string;
  quantity?: number;
}

interface TransactionResult {
  id: string;
  type: string;
  amount: number;
  newBalance: number;
  participant: {
    name: string;
    balance: number;
  };
}

export const useTransactionHandler = () => {
  const [loading, setLoading] = useState(false);
  const { session } = useAgentAuth();

  const processTransaction = async (request: TransactionRequest): Promise<TransactionResult | null> => {
    if (!session) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return null;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('process-transaction', {
        body: request,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la transaction');
      }

      toast.success(
        request.type === 'recharge' 
          ? 'Recharge effectuée avec succès' 
          : request.type === 'vente'
          ? 'Vente effectuée avec succès'
          : 'Remboursement effectué avec succès'
      );

      return data.transaction;
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error(error.message || 'Erreur lors de la transaction');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getParticipantByQR = async (qrCode: string): Promise<any | null> => {
    if (!session) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return null;
    }

    try {
      // Sanitize and normalize incoming code (same logic as participant-auth edge function)
      const cleanedQrCode = String(qrCode)
        .normalize('NFC')
        .trim()
        .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // remove control chars

      if (!cleanedQrCode) {
        throw new Error('Code QR invalide après nettoyage');
      }

      console.log(`Searching participant with cleaned QR code: ${cleanedQrCode}`);

      const { data, error } = await supabase
        .from('participants')
        .select('id, name, balance, status, event_id')
        .eq('qr_code', cleanedQrCode)
        .eq('status', 'active')
        .limit(1);

      if (error) throw error;

      const participant = (data && data[0]) ? data[0] : null;
      if (!participant) {
        throw new Error('Participant non trouvé');
      }

      return participant;
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast.error(error.message || 'Erreur lors de la lecture du QR code');
      return null;
    }
  };

  return {
    processTransaction,
    getParticipantByQR,
    loading
  };
};
