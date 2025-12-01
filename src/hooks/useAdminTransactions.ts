import { useState, useEffect } from 'react';
import { db, auth } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  getDocs,
  doc,
  getDoc,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useEvents } from '@/hooks/useEvents';

export interface AdminTransaction {
  id: string;
  type: 'vente' | 'recharge' | 'refund';
  amount: number;
  participantName: string;
  productName?: string;
  agentName: string;
  status: string;
  createdAt: string;
}

export const useAdminTransactions = () => {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAdminAuth();
  const { events } = useEvents();

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

      console.log('🔄 Loading admin transactions...');
      console.log('📅 Events for organizer:', events.length);

      // Get event IDs from organizer's events
      const eventIds = events.map(e => e.id);
      
      if (eventIds.length === 0) {
        console.log('⚠️ No events found for organizer');
        setTransactions([]);
        setLoading(false);
        return;
      }

      console.log('🔍 Filtering transactions for events:', eventIds);

      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
      
      // Load all transactions and filter by event_id client-side
      // (Firestore doesn't support 'in' queries with orderBy easily)
      const q = query(transactionsRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('⚠️ No transactions found in database');
        setTransactions([]);
        return;
      }

      // Filter transactions by event_id (only events created by this organizer)
      const filteredDocs = querySnapshot.docs.filter(docSnapshot => {
        const t = docSnapshot.data();
        return eventIds.includes(t.event_id);
      });

      console.log(`✅ Found ${filteredDocs.length} transactions for organizer's events (out of ${querySnapshot.docs.length} total)`);

      if (filteredDocs.length === 0) {
        console.log('⚠️ No transactions found for organizer\'s events');
        setTransactions([]);
        return;
      }

      // Collect all unique IDs for batch fetching
      const agentIds = new Set<string>();
      const participantIds = new Set<string>();
      const productIds = new Set<string>();

      filteredDocs.forEach(docSnapshot => {
        const t = docSnapshot.data();
        if (t.agent_id) agentIds.add(t.agent_id);
        if (t.participant_id) participantIds.add(t.participant_id);
        if (t.product_id) productIds.add(t.product_id);
      });

      // Fetch related data
      const agentsMap: Record<string, string> = {};
      const participantsMap: Record<string, string> = {};
      const productsMap: Record<string, string> = {};

      await Promise.all([
        ...Array.from(agentIds).map(async (id) => {
          const docSnap = await getDoc(doc(db, COLLECTIONS.AGENTS, id));
          if (docSnap.exists()) {
            agentsMap[id] = docSnap.data().name;
          }
        }),
        ...Array.from(participantIds).map(async (id) => {
          const docSnap = await getDoc(doc(db, COLLECTIONS.PARTICIPANTS, id));
          if (docSnap.exists()) {
            participantsMap[id] = docSnap.data().name;
          }
        }),
        ...Array.from(productIds).map(async (id) => {
          const docSnap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
          if (docSnap.exists()) {
            productsMap[id] = docSnap.data().name;
          }
        })
      ]);

      // Format transactions with joined data
      const formattedTransactions: AdminTransaction[] = filteredDocs.map(docSnapshot => {
        const t = docSnapshot.data();
        return {
          id: docSnapshot.id,
          type: t.type,
          amount: Number(t.amount),
          participantName: participantsMap[t.participant_id] || `Participant #${t.participant_id}`,
          productName: t.product_id ? (productsMap[t.product_id] || `Produit #${t.product_id}`) : undefined,
          agentName: agentsMap[t.agent_id] || `Agent #${t.agent_id}`,
          status: t.status,
          createdAt: t.created_at?.toDate?.()?.toISOString() || t.created_at
        };
      });

      console.log(`✅ Formatted ${formattedTransactions.length} transactions for organizer`);
      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Error loading admin transactions:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (events.length > 0) {
      loadTransactions();
    }
  }, [user?.id, events.length]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id || events.length === 0) return;

    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(transactionsRef, orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, () => {
      console.log('🔄 New transaction detected, reloading...');
      loadTransactions();
    }, (err) => {
      console.error('❌ Error in transactions subscription:', err);
    });

    return () => unsubscribe();
  }, [user?.id, events.length]);

  const getFilteredTransactions = (searchTerm: string, typeFilter: string, statusFilter: string) => {
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.participantName.toLowerCase().includes(searchTerm.toLowerCase());
      
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

    const todayRefunds = todayTransactions.reduce((sum, t) => {
      if (t.type === 'refund') return sum + t.amount;
      return sum;
    }, 0);

    const totalRecharges = transactions.reduce((sum, t) => {
      if (t.type === 'recharge') return sum + t.amount;
      return sum;
    }, 0);

    const totalRefunds = transactions.reduce((sum, t) => {
      if (t.type === 'refund') return sum + t.amount;
      return sum;
    }, 0);

    const totalTransactions = transactions.length;
    const rechargeCount = transactions.filter(t => t.type === 'recharge').length;
    const refundCount = transactions.filter(t => t.type === 'refund').length;
    const ventesCount = transactions.filter(t => t.type === 'vente').length;

    return {
      totalAmount,
      totalTransactions,
      rechargeCount,
      refundCount,
      ventesCount,
      todayTransactions: todayTransactions.length,
      todayRevenue,
      todayRecharges,
      todayRefunds,
      totalRecharges,
      totalRefunds
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
