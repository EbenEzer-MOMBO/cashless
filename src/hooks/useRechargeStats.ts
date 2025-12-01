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

export interface RechargeStats {
  totalRecharged: number;
  totalRefunded: number;
  todayRecharged: number;
  todayRefunded: number;
  rechargeCount: number;
  refundCount: number;
}

export const useRechargeStats = () => {
  const [stats, setStats] = useState<RechargeStats>({
    totalRecharged: 0,
    totalRefunded: 0,
    todayRecharged: 0,
    todayRefunded: 0,
    rechargeCount: 0,
    refundCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAgentAuth();

  const loadStats = async () => {
    if (!user) {
      setStats({
        totalRecharged: 0,
        totalRefunded: 0,
        todayRecharged: 0,
        todayRefunded: 0,
        rechargeCount: 0,
        refundCount: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);

      // Get all recharge and refund transactions in parallel
      const [rechargeSnapshot, refundSnapshot] = await Promise.all([
        getDocs(query(
          transactionsRef,
          where('agent_id', '==', user.agentId),
          where('type', '==', 'recharge'),
          where('status', '==', 'completed')
        )),
        getDocs(query(
          transactionsRef,
          where('agent_id', '==', user.agentId),
          where('type', '==', 'refund'),
          where('status', '==', 'completed')
        ))
      ]);

      // Calculate statistics
      let totalRecharged = 0;
      let todayRecharged = 0;
      let rechargeCount = 0;

      rechargeSnapshot.docs.forEach(docSnapshot => {
        const t = docSnapshot.data();
        const amount = Number(t.amount);
        const createdAt = t.created_at?.toDate?.() || new Date(t.created_at);
        
        totalRecharged += amount;
        rechargeCount++;
        
        if (createdAt >= today) {
          todayRecharged += amount;
        }
      });

      let totalRefunded = 0;
      let todayRefunded = 0;
      let refundCount = 0;

      refundSnapshot.docs.forEach(docSnapshot => {
        const t = docSnapshot.data();
        const amount = Number(t.amount);
        const createdAt = t.created_at?.toDate?.() || new Date(t.created_at);
        
        totalRefunded += amount;
        refundCount++;
        
        if (createdAt >= today) {
          todayRefunded += amount;
        }
      });

      setStats({
        totalRecharged,
        totalRefunded,
        todayRecharged,
        todayRefunded,
        rechargeCount,
        refundCount,
      });
    } catch (err) {
      console.error('Error loading recharge stats:', err);
      setStats({
        totalRecharged: 0,
        totalRefunded: 0,
        todayRecharged: 0,
        todayRefunded: 0,
        rechargeCount: 0,
        refundCount: 0,
      });
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
      where('agent_id', '==', user.agentId)
    );

    const unsubscribe = onSnapshot(q, () => {
      console.log('New recharge/refund transaction, reloading stats...');
      loadStats();
    }, (err) => {
      console.error('Error in recharge stats subscription:', err);
    });

    return () => unsubscribe();
  }, [user?.agentId]);

  return {
    stats,
    loading,
    refetch: loadStats
  };
};
