import { useState } from 'react';
import { db } from '@/integrations/firebase/config';
import { 
  collection, 
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { eventimeAPI } from '@/integrations/eventime/api';
import { useParticipantAuth } from '@/contexts/ParticipantAuthContext';
import { toast } from 'sonner';

interface PaymentData {
  msisdn: string;
  amount: number;
  email: string;
  firstname: string;
  lastname: string;
  payment_system: 'airtelmoney' | 'moovmoney4';
  participant_id?: string;
}

interface PaymentResult {
  success: boolean | string;
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

// Generate a unique reference
const generateReference = (): string => {
  return Math.floor(Math.random() * 1000000000).toString();
};

export const useMobilePayment = () => {
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const { participant, refreshParticipant } = useParticipantAuth();

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
      
      console.log('🚀 Initiation du paiement via Eventime API :', { 
        msisdn: paymentData.msisdn, 
        amount: paymentData.amount, 
        payment_system: paymentData.payment_system,
        participant_id: participant.id
      });
      
      // Generate reference
      const reference = generateReference();
      
      // Call Eventime API for mobile payment
      const result = await eventimeAPI.initiateMobilePayment({
        msisdn: paymentData.msisdn,
        amount: paymentData.amount,
        email: paymentData.email,
        firstname: paymentData.firstname,
        lastname: paymentData.lastname,
        description: `Recharge cashless - ${paymentData.amount} FCFA`,
        reference: reference,
        payment_system: paymentData.payment_system,
      });

      console.log('📡 Response from Eventime API:', result);

      // Handle response
      if (result.success && result.data) {
        // Store payment record in Firestore for local tracking
        try {
          await addDoc(collection(db, COLLECTIONS.MOBILE_PAYMENTS), {
            participant_id: participant.id,
            event_id: participant.event_id,
            msisdn: paymentData.msisdn,
            amount: paymentData.amount,
            email: paymentData.email,
            firstname: paymentData.firstname,
            lastname: paymentData.lastname,
            payment_system: paymentData.payment_system,
            reference: result.data.reference,
            bill_id: result.data.bill_id,
            status: result.data.status,
            description: `Recharge cashless - ${paymentData.amount} FCFA`,
            created_at: Timestamp.now(),
            updated_at: Timestamp.now()
          });
        } catch (firestoreError) {
          console.warn('Could not save payment to Firestore:', firestoreError);
          // Continue anyway, the payment was initiated successfully
        }

        const paymentResult: PaymentResult = {
          success: true,
          message: result.message,
          data: {
            payment_id: result.data.bill_id,
            bill_id: result.data.bill_id,
            reference: result.data.reference,
            amount: Number(result.data.amount),
            status: result.data.status,
          },
        };

        console.log('✅ Paiement initié (en attente de validation) :', paymentResult);
        setPaymentResult(paymentResult);
        
        // Afficher un message approprié selon le statut
        if (result.data.status === 'pending') {
          toast.info('Paiement en attente. Suivez les instructions sur votre téléphone et validez le paiement.');
        } else if (result.data.status === 'confirmed') {
          toast.success('Paiement confirmé ! Votre solde sera mis à jour.');
        } else {
          toast.success(result.message || 'Paiement initié. Suivez les instructions sur votre téléphone.');
        }
        
        return paymentResult;
      } else {
        const errorMessage = result.error || result.message || 'Erreur lors de l\'initiation du paiement';
        console.error('❌ Erreur de paiement :', errorMessage);
        setError(errorMessage);
        toast.error(`Erreur: ${errorMessage}`);
        return {
          success: false,
          message: errorMessage,
        };
      }
    } catch (error: any) {
      console.error('⚠️ Erreur réseau ou inattendue :', error);
      
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
      console.error('❌ Erreur participant lors de la vérification');
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    try {
      setCheckingPayment(true);
      setError(null);
      
      console.log('🔍 Vérification du statut du paiement via Eventime API :', { 
        bill_id: billId, 
        participant_id: participant.id,
      });
      
      // Call Eventime API to check payment status
      const result = await eventimeAPI.checkPaymentStatus(billId);

      console.log('📡 Check response from Eventime API:', result);

      // Handle response
      if (result.success) {
        // Récupérer les détails du paiement depuis Firestore
        let paymentAmount = 0;
        let paymentData: any = null;
        
        try {
          const paymentsRef = collection(db, COLLECTIONS.MOBILE_PAYMENTS);
          const q = query(paymentsRef, where('bill_id', '==', billId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const paymentDoc = querySnapshot.docs[0];
            paymentData = paymentDoc.data();
            paymentAmount = Number(paymentData.amount || 0);
            
            // Vérifier si le paiement n'a pas déjà été traité
            if (paymentData.status === 'confirmed') {
              console.log('⚠️ Payment already confirmed, skipping balance update');
            } else {
              // Mettre à jour le statut du paiement
              await updateDoc(doc(db, COLLECTIONS.MOBILE_PAYMENTS, paymentDoc.id), {
                status: 'confirmed',
                confirmed_at: Timestamp.now(),
                updated_at: Timestamp.now()
              });
              
              console.log('✅ Payment status updated to confirmed');
              
              // Mettre à jour le solde du participant UNIQUEMENT si le paiement est confirmé
              if (paymentAmount > 0 && participant) {
                console.log('💰 Updating participant balance:', {
                  participantId: participant.id,
                  amount: paymentAmount,
                  currentBalance: participant.balance
                });
                
                try {
                  const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, participant.id);
                  const participantDoc = await getDoc(participantRef);
                  
                  if (participantDoc.exists()) {
                    const currentBalance = Number(participantDoc.data().balance || 0);
                    const newBalance = currentBalance + paymentAmount;
                    
                    // Mettre à jour le solde
                    await updateDoc(participantRef, {
                      balance: newBalance,
                      updated_at: Timestamp.now()
                    });
                    
                    console.log('✅ Participant balance updated:', {
                      oldBalance: currentBalance,
                      addedAmount: paymentAmount,
                      newBalance: newBalance
                    });
                    
                    // Créer une transaction de type "recharge" pour l'historique
                    try {
                      await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
                        type: 'recharge',
                        participant_id: participant.id,
                        event_id: participant.event_id,
                        amount: paymentAmount,
                        status: 'completed',
                        payment_method: 'mobile_money',
                        payment_reference: billId,
                        description: `Recharge via ${paymentData.payment_system || 'mobile money'}`,
                        created_at: Timestamp.now(),
                        updated_at: Timestamp.now()
                      });
                      console.log('✅ Transaction record created');
                    } catch (transactionError) {
                      console.warn('⚠️ Could not create transaction record:', transactionError);
                      // Continue anyway, balance is updated
                    }
                    
                    // Rafraîchir les données du participant pour mettre à jour le solde dans l'UI
                    if (refreshParticipant) {
                      console.log('🔄 Refreshing participant data...');
                      try {
                        await refreshParticipant();
                        console.log('✅ Participant data refreshed');
                      } catch (refreshError) {
                        console.warn('⚠️ Could not refresh participant data:', refreshError);
                      }
                    }
                  } else {
                    console.error('❌ Participant document not found');
                  }
                } catch (balanceError) {
                  console.error('❌ Error updating participant balance:', balanceError);
                  throw balanceError;
                }
              }
            }
          } else {
            console.warn('⚠️ Payment record not found in Firestore for bill_id:', billId);
          }
        } catch (firestoreError) {
          console.error('❌ Could not process payment confirmation:', firestoreError);
          throw firestoreError;
        }

        const paymentResult: PaymentResult = {
          success: true,
          message: result.message || 'Paiement confirmé ! Votre solde a été mis à jour.',
          data: {
            payment_id: billId,
            bill_id: billId,
            reference: paymentData?.reference || '',
            amount: paymentAmount,
            status: 'confirmed',
          },
        };

        console.log('✅ Paiement confirmé et solde mis à jour :', paymentResult);
        setPaymentResult(paymentResult);
        toast.success(`Paiement confirmé ! ${paymentAmount > 0 ? `${paymentAmount} XAF ont été ajoutés à votre compte.` : 'Votre solde a été mis à jour.'}`);
        return paymentResult;
      } else {
        const errorMessage = result.message || 'Paiement en attente de confirmation';
        console.log('⏳ Paiement non confirmé :', errorMessage);
        
        // Ne pas traiter comme une erreur si c'est juste en attente
        if (!errorMessage.toLowerCase().includes('paiement en attente') && 
            !errorMessage.toLowerCase().includes('en cours')) {
          setError(errorMessage);
        }
        
        toast.info(errorMessage);
        
        return {
          success: false,
          message: errorMessage,
        };
      }
    } catch (error: any) {
      console.error('⚠️ Erreur lors de la vérification :', error);
      
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
