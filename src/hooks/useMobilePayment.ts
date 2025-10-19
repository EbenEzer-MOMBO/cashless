
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParticipantAuth } from '@/contexts/ParticipantAuthContext';
import { toast } from 'sonner';

interface PaymentData {
  msisdn: string;
  amount: number;
  email: string;
  firstname: string;
  lastname: string;
  payment_system: 'airtelmoney' | 'moovmoney4';
  participant_id?: number;
}

interface PaymentResult {
  success: boolean | string; // Permettre string au cas où l'API renvoie "true"/"false"
  message: string;
  data?: {
    payment_id: string;
    bill_id: string;
    reference: string;
    amount: number;
    status: 'pending' | 'confirmed' | 'failed';
  };
  error?: string;
}

export const useMobilePayment = () => {
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const { session, logout, participant } = useParticipantAuth();

  const initiatePayment = async (paymentData: PaymentData): Promise<PaymentResult | null> => {
    if (!participant) {
      const errorMsg = 'Participant non trouvé';
      console.error('❌ Erreur participant :', { participantExists: !!participant });
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      setPaymentResult(null);
      
      console.log('🚀 Initiation du paiement :', { 
        msisdn: paymentData.msisdn, 
        amount: paymentData.amount, 
        payment_system: paymentData.payment_system,
        participant_id: participant.id
      });
      
      const requestBody = {
        action: 'initiate' as const,
        participant_id: participant.id,
        ...paymentData
      };
      
      console.log('📤 Request body:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('participant-mobile-payment', {
        body: requestBody
      });

      console.log('📡 Response from edge function:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      // Log immédiatement après réception de la réponse
      console.log('📨 Réponse brute reçue :', data);

      // Gestion robuste de la réponse
      let result: PaymentResult;
      try {
        result = typeof data === 'object' ? data : JSON.parse(data);
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON :', parseError);
        result = {
          success: false,
          message: 'Réponse invalide de l\'API de paiement'
        };
      }

      console.log('🔍 Résultat parsé :', result);
      console.log('🔍 Type de success :', typeof result.success, '| Valeur :', result.success);

      // Vérification stricte du succès - conversion en boolean si nécessaire
      const isSuccess = result.success === true || result.success === 'true';
      
      if (isSuccess) {
        console.log('✅ Paiement initié avec succès :', result);
        setPaymentResult(result);
        toast.success(result.message || 'Paiement initié avec succès. Suivez les instructions sur votre téléphone.');
        return result;
      } else {
        const errorMessage = result.error || result.message || 'Erreur lors de l\'initiation du paiement';
        console.error('❌ Erreur de paiement :', errorMessage);
        setError(errorMessage);
        toast.error(`Erreur: ${errorMessage}`);
        return result;
      }
    } catch (error: any) {
      console.error('⚠️ Erreur réseau ou inattendue :', error);
      
      // Handle specific error types
      let errorMessage = 'Erreur lors de l\'initiation du paiement';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Délai d\'attente dépassé. Vérifiez votre connexion et réessayez.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (billId: string): Promise<PaymentResult | null> => {
    if (!participant) {
      const errorMsg = 'Participant non trouvé';
      console.error('❌ Erreur participant lors de la vérification :', { participantExists: !!participant });
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    try {
      setCheckingPayment(true);
      setError(null);
      
      console.log('🔍 Vérification du statut du paiement :', { 
        bill_id: billId, 
        participant_id: participant.id,
      });
      
      const { data, error } = await supabase.functions.invoke('participant-mobile-payment', {
        body: {
          action: 'check',
          bill_id: billId,
          participant_id: participant.id
        }
      });

      console.log('📡 Check response from edge function:', { data, error });

      if (error) {
        console.error('❌ Edge function error during check:', error);
        throw error;
      }

      // Log immédiatement après réception de la réponse
      console.log('📨 Réponse brute vérification :', data);

      // Gestion robuste de la réponse
      let result: PaymentResult;
      try {
        result = typeof data === 'object' ? data : JSON.parse(data);
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON vérification :', parseError);
        result = {
          success: false,
          message: 'Réponse invalide de l\'API de vérification'
        };
      }

      console.log('🔍 Résultat vérification parsé :', result);
      
      // Vérification stricte du succès - conversion en boolean si nécessaire
      const isSuccess = result.success === true || result.success === 'true';

      if (isSuccess) {
        console.log('✅ Vérification paiement réussie :', result);
        setPaymentResult(result);
        toast.success(result.message || 'Paiement confirmé ! Votre solde a été mis à jour.');
      } else {
        const errorMessage = result.error || result.message || 'Paiement en attente de confirmation';
        console.log('⏳ Paiement non confirmé :', errorMessage);
        
        // Ne pas traiter comme une erreur si c'est juste en attente
        if (!errorMessage.toLowerCase().includes('paiement en attente') && 
            !errorMessage.toLowerCase().includes('en cours')) {
          setError(errorMessage);
        }
        
        toast.info(errorMessage);
      }

      return result;
    } catch (error: any) {
      console.error('⚠️ Erreur réseau ou inattendue lors de la vérification :', error);
      
      const errorMessage = error.message || 'Erreur inattendue lors de la vérification du paiement';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setCheckingPayment(false);
    }
  };

  return {
    loading,
    checkingPayment,
    error,
    paymentResult,
    initiatePayment,
    checkPaymentStatus,
  };
};
