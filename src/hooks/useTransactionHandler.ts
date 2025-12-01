import { useState } from 'react';
import { db, auth } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { toast } from 'sonner';

interface TransactionRequest {
  type: 'vente' | 'recharge' | 'refund';
  amount: number;
  participantId?: string;
  productId?: string;
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
  const { user } = useAgentAuth();

  const processTransaction = async (request: TransactionRequest): Promise<TransactionResult | null> => {
    if (!user) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return null;
    }

    // Check Firebase Auth session
    if (!auth.currentUser) {
      console.error('❌ No Firebase Auth session for transaction');
      toast.error('Erreur d\'authentification. Veuillez vous reconnecter.');
      return null;
    }

    try {
      setLoading(true);
      console.log('🔄 Processing transaction:', {
        type: request.type,
        amount: request.amount,
        participantId: request.participantId,
        hasQRCode: !!request.qrCode
      });

      // Get participant
      let participantId = request.participantId;
      let participantDoc;
      
      if (request.qrCode) {
        // Find participant by QR code
        console.log('🔍 Searching participant by QR code:', request.qrCode);
        const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
        const q = query(
          participantsRef,
          where('qr_code', '==', request.qrCode),
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Participant non trouvé');
        }
        
        participantDoc = querySnapshot.docs[0];
        participantId = participantDoc.id;
        console.log('✅ Participant found by QR code:', participantId);
      } else if (participantId) {
        // Get participant by ID using getDoc (correct way)
        console.log('🔍 Getting participant by ID:', participantId);
        const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);
        participantDoc = await getDoc(participantRef);
        
        if (!participantDoc.exists()) {
          throw new Error('Participant non trouvé');
        }
        console.log('✅ Participant found by ID:', participantId);
      }

      if (!participantDoc) {
        throw new Error('Participant non trouvé');
      }

      const participantData = participantDoc.data();
      
      // S'assurer que le solde est bien un nombre
      const rawBalance = participantData.balance;
      const currentBalance = typeof rawBalance === 'number' ? rawBalance : Number(rawBalance || 0);
      
      console.log('💰 Current participant balance:', {
        participantId: participantDoc.id,
        participantName: participantData.name,
        rawBalance: rawBalance,
        rawBalanceType: typeof rawBalance,
        currentBalance: currentBalance,
        currentBalanceType: typeof currentBalance
      });
      
      let newBalance = currentBalance;

      // Calculate new balance based on transaction type
      switch (request.type) {
        case 'recharge':
          // Recharge = ajouter le montant au solde
          newBalance = currentBalance + request.amount;
          console.log('💰 Recharge transaction:', {
            participantId: participantDoc.id,
            participantName: participantData.name,
            currentBalance,
            amount: request.amount,
            newBalance,
            calculation: `${currentBalance} + ${request.amount} = ${newBalance}`
          });
          break;
        case 'vente':
          // Vente = soustraire le montant du solde
          if (currentBalance < request.amount) {
            console.error('❌ Solde insuffisant pour la vente:', {
              currentBalance,
              requiredAmount: request.amount,
              shortfall: request.amount - currentBalance
            });
            throw new Error('Solde insuffisant');
          }
          newBalance = currentBalance - request.amount;
          console.log('🛒 Vente transaction:', {
            participantId: participantDoc.id,
            participantName: participantData.name,
            currentBalance,
            amount: request.amount,
            newBalance,
            calculation: `${currentBalance} - ${request.amount} = ${newBalance}`
          });
          break;
        case 'refund':
          // Remboursement = soustraire le montant du solde (retirer de l'argent)
          if (currentBalance < request.amount) {
            console.error('❌ Solde insuffisant pour le remboursement:', {
              currentBalance,
              requestedAmount: request.amount,
              shortfall: request.amount - currentBalance
            });
            throw new Error('Le montant du remboursement ne peut pas dépasser le solde disponible');
          }
          newBalance = currentBalance - request.amount;
          console.log('💸 Remboursement transaction:', {
            participantId: participantDoc.id,
            participantName: participantData.name,
            currentBalance,
            amount: request.amount,
            newBalance,
            calculation: `${currentBalance} - ${request.amount} = ${newBalance}`
          });
          break;
      }

      // Update participant balance
      console.log('📝 Updating participant balance in Firestore...', {
        participantId: participantDoc.id,
        currentBalance: currentBalance,
        newBalance: newBalance,
        transactionType: request.type,
        amount: request.amount
      });
      
      const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, participantDoc.id);
      
      // Vérifier le solde avant la mise à jour pour éviter les erreurs
      const beforeUpdateDoc = await getDoc(participantRef);
      const beforeUpdateBalance = beforeUpdateDoc.exists() ? Number(beforeUpdateDoc.data().balance || 0) : 0;
      
      console.log('📊 Before update:', {
        beforeUpdateBalance: beforeUpdateBalance,
        expectedNewBalance: newBalance
      });
      
      // S'assurer que newBalance est bien un nombre
      const balanceToUpdate = typeof newBalance === 'number' ? newBalance : Number(newBalance);
      
      await updateDoc(participantRef, {
        balance: balanceToUpdate,
        updated_at: Timestamp.now()
      });
      
      console.log('✅ Balance update command sent to Firestore');
      
      // Vérifier que la mise à jour a bien été effectuée
      const afterUpdateDoc = await getDoc(participantRef);
      const afterUpdateData = afterUpdateDoc.exists() ? afterUpdateDoc.data() : null;
      const afterUpdateBalance = afterUpdateData ? Number(afterUpdateData.balance || 0) : 0;
      
      console.log('📊 After update:', {
        afterUpdateBalance: afterUpdateBalance,
        expectedBalance: balanceToUpdate,
        balanceMatch: afterUpdateBalance === balanceToUpdate,
        rawBalanceFromFirestore: afterUpdateData?.balance,
        balanceType: typeof afterUpdateData?.balance
      });
      
      if (Math.abs(afterUpdateBalance - balanceToUpdate) > 0.01) {
        console.error('❌ Balance mismatch after update!', {
          expected: balanceToUpdate,
          actual: afterUpdateBalance,
          beforeUpdate: beforeUpdateBalance,
          difference: Math.abs(afterUpdateBalance - balanceToUpdate)
        });
        throw new Error(`Erreur lors de la mise à jour du solde. Attendu: ${balanceToUpdate}, Obtenu: ${afterUpdateBalance}`);
      }
      
      console.log('✅ Participant balance updated successfully:', {
        before: beforeUpdateBalance,
        after: afterUpdateBalance,
        change: request.type === 'recharge' ? `+${request.amount}` : `-${request.amount}`
      });

      // Update product stock if it's a sale
      let productName = '';
      if (request.type === 'vente' && request.productId) {
        try {
          console.log('📦 Updating product stock for sale:', request.productId);
          const productRef = doc(db, COLLECTIONS.PRODUCTS, request.productId.toString());
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            const productData = productDoc.data();
            productName = productData.name || '';
            const currentStock = Number(productData.stock || 0);
            const quantityToDeduct = request.quantity || 1;
            const newStock = Math.max(0, currentStock - quantityToDeduct);
            
            await updateDoc(productRef, {
              stock: newStock,
              updated_at: Timestamp.now()
            });
            
            console.log('✅ Product stock updated:', {
              productId: request.productId,
              productName: productName,
              currentStock,
              quantityDeducted: quantityToDeduct,
              newStock
            });
          } else {
            console.warn('⚠️ Product not found:', request.productId);
          }
        } catch (productError) {
          console.error('❌ Error updating product stock:', productError);
          // Continue anyway, don't fail the transaction
        }
      }

      // Create transaction record
      console.log('📝 Creating transaction record in Firestore...');
      const transactionData = {
        type: request.type,
        amount: request.amount,
        participant_id: participantDoc.id,
        participant_name: participantData.name || '',
        agent_id: user.agentId,
        event_id: user.eventId,
        product_id: request.productId || null,
        product_name: productName || null,
        quantity: request.quantity || null,
        status: 'completed',
        source: 'agent',
        balance_before: currentBalance,
        balance_after: newBalance,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };
      
      const transactionDoc = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), transactionData);
      console.log('✅ Transaction record created:', {
        transactionId: transactionDoc.id,
        type: request.type,
        amount: request.amount,
        participantId: participantDoc.id,
        productId: request.productId,
        productName: productName,
        quantity: request.quantity
      });

      toast.success(
        request.type === 'recharge' 
          ? 'Recharge effectuée avec succès' 
          : request.type === 'vente'
          ? 'Vente effectuée avec succès'
          : 'Remboursement effectué avec succès'
      );

      return {
        id: transactionDoc.id,
        type: request.type,
        amount: request.amount,
        newBalance: newBalance,
        participant: {
          name: participantData.name,
          balance: newBalance
        }
      };
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error(error.message || 'Erreur lors de la transaction');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getParticipantByQR = async (qrCode: string): Promise<any | null> => {
    if (!user) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return null;
    }

    // Check Firebase Auth session
    if (!auth.currentUser) {
      console.error('❌ No Firebase Auth session for QR scan');
      toast.error('Erreur d\'authentification. Veuillez vous reconnecter.');
      return null;
    }

    try {
      // Sanitize and normalize incoming code
      const cleanedQrCode = String(qrCode)
        .normalize('NFC')
        .trim()
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '');

      if (!cleanedQrCode) {
        throw new Error('Code QR invalide après nettoyage');
      }

      console.log(`Searching participant with cleaned QR code: ${cleanedQrCode}`);

      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(
        participantsRef,
        where('qr_code', '==', cleanedQrCode),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Participant non trouvé');
      }

      const participantDoc = querySnapshot.docs[0];
      const participantData = participantDoc.data();

      // S'assurer que le solde est un nombre
      const balance = Number(participantData.balance || 0);
      
      console.log('✅ Participant found:', {
        id: participantDoc.id,
        name: participantData.name,
        balance: balance,
        balanceType: typeof balance,
        rawBalance: participantData.balance
      });
      
      return {
        id: participantDoc.id,
        name: participantData.name,
        balance: balance,
        email: participantData.email || participantData.participant_email || '',
        qr_code: participantData.qr_code || cleanedQrCode,
        status: participantData.status,
        event_id: participantData.event_id
      };
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
