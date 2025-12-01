import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  where,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { useAgentAuth } from '@/contexts/AgentAuthContext';

export interface AgentStats {
  totalSales: number;
  todaySales: number;
  salesCount: number;
  todayCount: number;
}

export const useAgentStats = () => {
  const [stats, setStats] = useState<AgentStats>({
    totalSales: 0,
    todaySales: 0,
    salesCount: 0,
    todayCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAgentAuth();

  const loadStats = async () => {
    if (!user) {
      setStats({ totalSales: 0, todaySales: 0, salesCount: 0, todayCount: 0 });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all sales for this agent
      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
      const q = query(
        transactionsRef,
        where('agent_id', '==', user.agentId),
        where('type', '==', 'vente'),
        where('status', '==', 'completed')
      );
      
      const querySnapshot = await getDocs(q);
      
      let totalSales = 0;
      let todaySalesAmount = 0;
      let salesCount = 0;
      let todayCount = 0;

      querySnapshot.docs.forEach(docSnapshot => {
        const t = docSnapshot.data();
        const amount = Number(t.amount);
        const createdAt = t.created_at?.toDate?.() || new Date(t.created_at);
        
        totalSales += amount;
        salesCount++;
        
        if (createdAt >= today) {
          todaySalesAmount += amount;
          todayCount++;
        }
      });

      setStats({
        totalSales,
        todaySales: todaySalesAmount,
        salesCount,
        todayCount
      });
    } catch (err) {
      console.error('Error loading agent stats:', err);
      setStats({ totalSales: 0, todaySales: 0, salesCount: 0, todayCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user?.agentId]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.agentId) return;

    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(
      transactionsRef,
      where('agent_id', '==', user.agentId),
      where('type', '==', 'vente')
    );

    const unsubscribe = onSnapshot(q, () => {
      console.log('New transaction, reloading stats...');
      loadStats();
    }, (err) => {
      console.error('Error in stats subscription:', err);
    });

    return () => unsubscribe();
  }, [user?.agentId]);

  return {
    stats,
    loading,
    refetch: loadStats
  };
};
