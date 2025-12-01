import { useState, useEffect } from 'react';
import { db, auth } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { useAgentAuth } from '@/contexts/AgentAuthContext';

export interface Transaction {
  id: string;
  type: 'vente' | 'recharge' | 'refund';
  amount: number;
  participantName: string;
  productName?: string;
  quantity?: number;
  agentName: string;
  status: string;
  createdAt: string;
}

export const useTransactions = (agentFilter?: string) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAgentAuth();

  const loadTransactions = async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    // Check Firebase Auth session
    if (!auth.currentUser) {
      console.warn('⚠️ No Firebase Auth session for loading transactions');
      setError('Erreur d\'authentification. Veuillez vous reconnecter.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading transactions...', {
        eventId: user.eventId,
        agentId: user.agentId,
        agentFilter
      });

      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
      
      // Load all transactions for the event (avoid index requirement)
      // We'll filter and sort client-side
      const q = query(
        transactionsRef,
        where('event_id', '==', user.eventId)
      );

      const querySnapshot = await getDocs(q);
      
      console.log(`✅ Found ${querySnapshot.docs.length} transactions for event`);
      
      // Filter by agent if needed (client-side)
      let filteredDocs = querySnapshot.docs;
      if (agentFilter === 'current' && user.agentId) {
        filteredDocs = querySnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.agent_id === user.agentId;
        });
        console.log(`🔍 Filtered to ${filteredDocs.length} transactions for agent:`, user.agentId);
      }
      
      // Sort by created_at descending (client-side)
      filteredDocs.sort((a, b) => {
        const aDate = a.data().created_at?.toDate?.() || new Date(a.data().created_at || 0);
        const bDate = b.data().created_at?.toDate?.() || new Date(b.data().created_at || 0);
        return bDate.getTime() - aDate.getTime();
      });
      
      // Limit to recent transactions for dashboard
      const recentDocs = agentFilter === 'current' 
        ? filteredDocs // Show all for agent history
        : filteredDocs.slice(0, 50); // Limit for dashboard
      
      // Collect all unique IDs for batch fetching
      const participantIds = new Set<string>();
      const productIds = new Set<string>();
      const agentIds = new Set<string>();
      
      recentDocs.forEach(docSnapshot => {
        const t = docSnapshot.data();
        if (t.participant_id) participantIds.add(t.participant_id);
        if (t.product_id) productIds.add(t.product_id);
        if (t.agent_id) agentIds.add(t.agent_id);
      });

      // Fetch related data in parallel (all at once)
      const participantsMap: Record<string, string> = {};
      const productsMap: Record<string, string> = {};
      const agentsMap: Record<string, string> = {};

      // Use Promise.allSettled to handle errors gracefully
      await Promise.allSettled([
        ...Array.from(participantIds).map(async (id) => {
          try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.PARTICIPANTS, id));
            if (docSnap.exists()) {
              participantsMap[id] = docSnap.data().name;
            }
          } catch (err) {
            console.warn(`Failed to load participant ${id}:`, err);
          }
        }),
        ...Array.from(productIds).map(async (id) => {
          try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
            if (docSnap.exists()) {
              productsMap[id] = docSnap.data().name;
            }
          } catch (err) {
            console.warn(`Failed to load product ${id}:`, err);
          }
        }),
        ...Array.from(agentIds).map(async (id) => {
          try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.AGENTS, id));
            if (docSnap.exists()) {
              agentsMap[id] = docSnap.data().name;
            }
          } catch (err) {
            console.warn(`Failed to load agent ${id}:`, err);
          }
        })
      ]);

      const formattedTransactions: Transaction[] = recentDocs.map(docSnapshot => {
        const t = docSnapshot.data();
        // Use product_name from transaction if available, otherwise fetch from productsMap
        const productName = t.product_name || (t.product_id ? productsMap[t.product_id] : undefined);
        
        return {
          id: docSnapshot.id,
          type: t.type,
          amount: Number(t.amount),
          participantName: participantsMap[t.participant_id] || t.participant_name || 'Participant inconnu',
          productName: productName,
          quantity: t.quantity ? Number(t.quantity) : undefined,
          agentName: agentsMap[t.agent_id] || 'Agent',
          status: t.status,
          createdAt: t.created_at?.toDate?.()?.toISOString() || t.created_at
        };
      });

      console.log(`✅ Formatted ${formattedTransactions.length} transactions`);
      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('❌ Error loading transactions:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'permission-denied') {
        setError('Permission refusée. Vérifiez les règles de sécurité Firestore.');
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des transactions');
      }
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user?.eventId, agentFilter]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.eventId) return;

    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    // Subscribe to all transactions for the event (no orderBy to avoid index requirement)
    const q = query(
      transactionsRef,
      where('event_id', '==', user.eventId)
    );

    const unsubscribe = onSnapshot(q, () => {
      console.log('🔄 New transaction detected, reloading...');
      loadTransactions();
    }, (err) => {
      console.error('❌ Error in transactions subscription:', err);
    });

    return () => unsubscribe();
  }, [user?.eventId, user?.agentId, agentFilter]);

  const getFilteredTransactions = (searchTerm: string, typeFilter: string, statusFilter: string) => {
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.agentName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  };

  const getStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactions = transactions.filter(t => 
      new Date(t.createdAt) >= today
    );
    
    const totalAmount = transactions.reduce((sum, t) => {
      if (t.type === 'vente') return sum + t.amount;
      return sum;
    }, 0);

    const todayRevenue = todayTransactions.reduce((sum, t) => {
      if (t.type === 'vente') return sum + t.amount;
      return sum;
    }, 0);

    const todayRecharges = todayTransactions.reduce((sum, t) => {
      if (t.type === 'recharge') return sum + t.amount;
      return sum;
    }, 0);

    const totalTransactions = transactions.length;
    const rechargeCount = transactions.filter(t => t.type === 'recharge').length;
    const ventesCount = transactions.filter(t => t.type === 'vente').length;

    return {
      totalAmount,
      totalTransactions,
      rechargeCount,
      ventesCount,
      todayTransactions: todayTransactions.length,
      todayRevenue,
      todayRecharges
    };
  };

  return {
    transactions,
    loading,
    error,
    getStats,
    getFilteredTransactions,
    refetch: loadTransactions
  };
};
