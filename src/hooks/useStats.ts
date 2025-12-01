import { useState, useEffect } from 'react';
import { db, auth } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';

export interface DashboardStats {
  totalSales: number;
  totalBalance: number;
  activeAgents: number;
  totalTransactions: number;
  todayTransactions: number;
  todayRevenue: number;
  todayRecharges: number;
}

export interface RecentActivity {
  time: string;
  action: string;
  user: string;
  id?: string;
}

export const useStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalBalance: 0,
    activeAgents: 0,
    totalTransactions: 0,
    todayTransactions: 0,
    todayRevenue: 0,
    todayRecharges: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour charger les statistiques depuis Firestore
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('⚠️ No authenticated user, cannot load stats');
        setError('Vous devez être connecté pour voir les statistiques');
        setLoading(false);
        return;
      }
      
      console.log('📊 Loading stats for authenticated user:', currentUser.uid);
      
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Load sales data
      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
      const salesQuery = query(
        transactionsRef,
        where('type', '==', 'vente'),
        where('status', '==', 'completed')
      );
      const salesSnapshot = await getDocs(salesQuery);
      const totalSales = salesSnapshot.docs.reduce((sum, doc) => sum + Number(doc.data().amount), 0);

      // Load participants balance
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const participantsSnapshot = await getDocs(participantsRef);
      const totalBalance = participantsSnapshot.docs.reduce((sum, doc) => sum + Number(doc.data().balance || 0), 0);

      // Load active agents
      const agentsRef = collection(db, COLLECTIONS.AGENTS);
      const activeAgentsQuery = query(agentsRef, where('active', '==', true));
      const activeAgentsSnapshot = await getDocs(activeAgentsQuery);
      const activeAgents = activeAgentsSnapshot.size;

      // Load all transactions
      const allTransactionsSnapshot = await getDocs(transactionsRef);
      const totalTransactions = allTransactionsSnapshot.size;

      // Calculate today's stats
      let todayTransactions = 0;
      let todayRevenue = 0;
      let todayRecharges = 0;

      allTransactionsSnapshot.docs.forEach(docSnapshot => {
        const t = docSnapshot.data();
        const createdAt = t.created_at?.toDate?.() || new Date(t.created_at);
        
        if (createdAt >= today) {
          todayTransactions++;
          
          if (t.type === 'vente' && t.status === 'completed') {
            todayRevenue += Number(t.amount);
          }
          
          if (t.type === 'recharge' && t.status === 'completed') {
            todayRecharges += Number(t.amount);
          }
        }
      });

      setStats({
        totalSales,
        totalBalance,
        activeAgents,
        totalTransactions,
        todayTransactions,
        todayRevenue,
        todayRecharges
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour charger les activités récentes
  const loadRecentActivity = async () => {
    try {
      // For now, leave activity empty
      // In a real implementation, you'd query recent transactions and format them
      setRecentActivity([]);
    } catch (err) {
      console.error('Error loading recent activity:', err);
    }
  };

  useEffect(() => {
    loadStats();
    loadRecentActivity();
    
    // Reload stats every 30 seconds
    const interval = setInterval(() => {
      loadStats();
      loadRecentActivity();
    }, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    stats,
    recentActivity,
    loading,
    error,
    refetch: () => {
      loadStats();
      loadRecentActivity();
    }
  };
};
