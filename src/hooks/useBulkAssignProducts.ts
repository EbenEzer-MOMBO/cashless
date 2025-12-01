import { useState } from 'react';
import { db } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  where,
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { toast } from 'sonner';

export const useBulkAssignProducts = () => {
  const [loading, setLoading] = useState(false);

  const bulkAssignProducts = async (eventId?: string) => {
    try {
      setLoading(true);
      
      // Get all agents for the event (or all if no eventId)
      const agentsRef = collection(db, COLLECTIONS.AGENTS);
      let agentsQuery = query(agentsRef, where('active', '==', true));
      
      if (eventId) {
        agentsQuery = query(agentsRef, where('event_id', '==', eventId), where('active', '==', true));
      }
      
      const agentsSnapshot = await getDocs(agentsQuery);
      
      // Get all products for the event (or all if no eventId)
      const productsRef = collection(db, COLLECTIONS.PRODUCTS);
      let productsQuery = query(productsRef, where('active', '==', true));
      
      if (eventId) {
        productsQuery = query(productsRef, where('event_id', '==', eventId), where('active', '==', true));
      }
      
      const productsSnapshot = await getDocs(productsQuery);
      
      // Get existing assignments
      const assignmentsRef = collection(db, COLLECTIONS.PRODUCT_ASSIGNMENTS);
      const assignmentsSnapshot = await getDocs(assignmentsRef);
      
      // Create a set of existing assignments for quick lookup
      const existingAssignments = new Set<string>();
      assignmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        existingAssignments.add(`${data.product_id}_${data.agent_id}`);
      });
      
      // Create missing assignments
      let assignedCount = 0;
      
      for (const agentDoc of agentsSnapshot.docs) {
        const agentId = agentDoc.id;
        const agentEventId = agentDoc.data().event_id;
        
        for (const productDoc of productsSnapshot.docs) {
          const productId = productDoc.id;
          const productEventId = productDoc.data().event_id;
          
          // Only assign products from the same event as the agent
          if (agentEventId === productEventId) {
            const assignmentKey = `${productId}_${agentId}`;
            
            if (!existingAssignments.has(assignmentKey)) {
              await addDoc(collection(db, COLLECTIONS.PRODUCT_ASSIGNMENTS), {
                product_id: productId,
                agent_id: agentId,
                event_id: productEventId,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now()
              });
              
              assignedCount++;
            }
          }
        }
      }
      
      if (assignedCount > 0) {
        toast.success(`${assignedCount} assignations de produits créées avec succès`);
      } else {
        toast.info('Aucune nouvelle assignation nécessaire');
      }

      return assignedCount;
    } catch (err) {
      console.error('Error bulk assigning products:', err);
      toast.error('Erreur lors de l\'assignation en masse des produits');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    bulkAssignProducts,
    loading
  };
};
