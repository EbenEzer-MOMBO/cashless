import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  id?: number;
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

  // Fonction pour charger les statistiques depuis la base de données
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les statistiques générales
      const { data: salesData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'vente')
        .eq('status', 'completed');
      
      const { data: balanceData } = await supabase
        .from('participants')
        .select('balance');
      
      const { data: agentsData } = await supabase
        .from('agents')
        .select('active')
        .eq('active', true);
      
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*');
      
      // Calculer les statistiques
      const totalSales = salesData?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalBalance = balanceData?.reduce((sum, p) => sum + p.balance, 0) || 0;
      const activeAgents = agentsData?.length || 0;
      const totalTransactions = transactionsData?.length || 0;
      
      // Statistiques du jour (dernières 24h)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayTransactionsData } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', today.toISOString());
      
      const todayTransactions = todayTransactionsData?.length || 0;
      const todayRevenue = todayTransactionsData
        ?.filter(t => t.type === 'vente' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      const todayRecharges = todayTransactionsData
        ?.filter(t => t.type === 'recharge' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      
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
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour charger les activités récentes
  const loadRecentActivity = async () => {
    try {
      // TODO: Remplacer par l'appel Supabase
      // const { data, error } = await supabase
      //   .from('transactions')
      //   .select(`
      //     *,
      //     agents:agent_id (name),
      //     participants:participant_id (name),
      //     products:product_id (name)
      //   `)
      //   .order('created_at', { ascending: false })
      //   .limit(4);
      
      // if (error) throw error;
      
      // const activities: RecentActivity[] = data?.map(transaction => ({
      //   time: formatTimeAgo(transaction.created_at),
      //   action: transaction.type === 'vente' 
      //     ? `Vente - ${transaction.products?.name || 'Produit'}`
      //     : `Recharge de ${transaction.amount.toLocaleString()} XAF`,
      //   user: transaction.agents?.name || 'Agent',
      //   id: transaction.id
      // })) || [];
      
      // setRecentActivity(activities);
      
      // Pour l'instant, on laisse le tableau vide
      setRecentActivity([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des activités récentes');
    }
  };

  // Fonction utilitaire pour formater le temps écoulé
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "À l'instant";
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  };

  useEffect(() => {
    loadStats();
    loadRecentActivity();
    
    // Recharger les stats toutes les 30 secondes
    const interval = setInterval(() => {
      loadStats();
      loadRecentActivity();
    }, 30000);
    
    return () => clearInterval(interval);
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