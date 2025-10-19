
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      // Get today's date in UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get all sales for this agent
      const { data: allSales, error: allSalesError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('agent_id', user.agentId)
        .eq('type', 'vente')
        .eq('status', 'completed');

      if (allSalesError) throw allSalesError;

      // Get today's sales
      const { data: todaySales, error: todayError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('agent_id', user.agentId)
        .eq('type', 'vente')
        .eq('status', 'completed')
        .gte('created_at', todayISO);

      if (todayError) throw todayError;

      // Calculate statistics
      const totalSales = (allSales || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const todaySalesAmount = (todaySales || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const salesCount = (allSales || []).length;
      const todayCount = (todaySales || []).length;

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
  }, [user?.id]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('agent-stats-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `agent_id=eq.${user.agentId}`
        },
        () => {
          console.log('New transaction, reloading stats...');
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    stats,
    loading,
    refetch: loadStats
  };
};
