import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';

export interface ProductAssignment {
  id: string;
  productId: string;
  agentId: string;
  eventId: string;
  productName: string;
  agentName: string;
  eventName: string;
  createdAt: string;
}

export const useProductAssignments = (eventId?: string) => {
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const assignmentsRef = collection(db, COLLECTIONS.PRODUCT_ASSIGNMENTS);
      let q = query(assignmentsRef, orderBy('created_at', 'desc'));

      if (eventId) {
        q = query(assignmentsRef, where('event_id', '==', eventId), orderBy('created_at', 'desc'));
      }

      const querySnapshot = await getDocs(q);

      // Collect all unique IDs for batch fetching
      const productIds = new Set<string>();
      const agentIds = new Set<string>();
      const eventIds = new Set<string>();

      querySnapshot.docs.forEach(docSnapshot => {
        const a = docSnapshot.data();
        if (a.product_id) productIds.add(a.product_id);
        if (a.agent_id) agentIds.add(a.agent_id);
        if (a.event_id) eventIds.add(a.event_id);
      });

      // Fetch related data
      const productsMap: Record<string, string> = {};
      const agentsMap: Record<string, string> = {};
      const eventsMap: Record<string, string> = {};

      await Promise.all([
        ...Array.from(productIds).map(async (id) => {
          const docSnap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
          if (docSnap.exists()) {
            productsMap[id] = docSnap.data().name;
          }
        }),
        ...Array.from(agentIds).map(async (id) => {
          const docSnap = await getDoc(doc(db, COLLECTIONS.AGENTS, id));
          if (docSnap.exists()) {
            agentsMap[id] = docSnap.data().name;
          }
        }),
        ...Array.from(eventIds).map(async (id) => {
          const docSnap = await getDoc(doc(db, COLLECTIONS.EVENTS, id));
          if (docSnap.exists()) {
            eventsMap[id] = docSnap.data().name;
          }
        })
      ]);

      const formattedAssignments: ProductAssignment[] = querySnapshot.docs.map(docSnapshot => {
        const a = docSnapshot.data();
        return {
          id: docSnapshot.id,
          productId: a.product_id,
          agentId: a.agent_id,
          eventId: a.event_id,
          productName: productsMap[a.product_id] || 'Produit inconnu',
          agentName: agentsMap[a.agent_id] || 'Agent',
          eventName: eventsMap[a.event_id] || 'Événement inconnu',
          createdAt: a.created_at?.toDate?.()?.toISOString() || a.created_at
        };
      });

      setAssignments(formattedAssignments);
    } catch (err) {
      console.error('Error loading assignments:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des affectations');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const assignProduct = async (productId: string, agentId: string) => {
    try {
      // Get event_id from product
      const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
      const productEventId = productDoc.exists() ? productDoc.data().event_id : eventId;

      await addDoc(collection(db, COLLECTIONS.PRODUCT_ASSIGNMENTS), {
        product_id: productId,
        agent_id: agentId,
        event_id: productEventId,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
      
      await loadAssignments();
    } catch (err) {
      console.error('Error assigning product:', err);
      throw err;
    }
  };

  const unassignProduct = async (productId: string, agentId: string) => {
    try {
      // Find the assignment document
      const assignmentsRef = collection(db, COLLECTIONS.PRODUCT_ASSIGNMENTS);
      const q = query(
        assignmentsRef,
        where('product_id', '==', productId),
        where('agent_id', '==', agentId)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Delete all matching assignments
      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(doc(db, COLLECTIONS.PRODUCT_ASSIGNMENTS, docSnapshot.id));
      }
      
      await loadAssignments();
    } catch (err) {
      console.error('Error unassigning product:', err);
      throw err;
    }
  };

  const getAssignedProducts = (agentId: string): string[] => {
    return assignments
      .filter(a => a.agentId === agentId)
      .map(a => a.productId);
  };

  useEffect(() => {
    loadAssignments();
  }, [eventId]);

  // Subscribe to real-time changes
  useEffect(() => {
    const assignmentsRef = collection(db, COLLECTIONS.PRODUCT_ASSIGNMENTS);

    const unsubscribe = onSnapshot(assignmentsRef, () => {
      console.log('Product assignments changed, reloading...');
      loadAssignments();
    }, (err) => {
      console.error('Error in assignments subscription:', err);
    });

    return () => unsubscribe();
  }, []);

  return {
    assignments,
    loading,
    error,
    assignProduct,
    unassignProduct,
    getAssignedProducts,
    refetch: loadAssignments
  };
};
