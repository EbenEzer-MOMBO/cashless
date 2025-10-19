import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      // Get today's date in UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get all recharge transactions for this agent
      const { data: rechargeData, error: rechargeError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('agent_id', user.agentId)
        .eq('type', 'recharge')
        .eq('status', 'completed');

      if (rechargeError) throw rechargeError;

      // Get all refund transactions for this agent
      const { data: refundData, error: refundError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('agent_id', user.agentId)
        .eq('type', 'refund')
        .eq('status', 'completed');

      if (refundError) throw refundError;

      // Get today's recharge transactions
      const { data: todayRechargeData, error: todayRechargeError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('agent_id', user.agentId)
        .eq('type', 'recharge')
        .eq('status', 'completed')
        .gte('created_at', todayISO);

      if (todayRechargeError) throw todayRechargeError;

      // Get today's refund transactions
      const { data: todayRefundData, error: todayRefundError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('agent_id', user.agentId)
        .eq('type', 'refund')
        .eq('status', 'completed')
        .gte('created_at', todayISO);

      if (todayRefundError) throw todayRefundError;

      // Calculate statistics
      const totalRecharged = (rechargeData || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const totalRefunded = (refundData || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const todayRecharged = (todayRechargeData || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const todayRefunded = (todayRefundData || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const rechargeCount = (rechargeData || []).length;
      const refundCount = (refundData || []).length;

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
  }, [user?.id]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('recharge-stats-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `agent_id=eq.${user.agentId}`
        },
        () => {
          console.log('New recharge/refund transaction, reloading stats...');
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