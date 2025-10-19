
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentAuth } from '@/contexts/AgentAuthContext';

export interface Transaction {
  id: string;
  type: 'vente' | 'recharge' | 'refund';
  amount: number;
  participantName: string;
  productName?: string;
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

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('transactions')
        .select('id, type, amount, status, created_at, participant_id, product_id, agent_id')
        .eq('event_id', user.eventId)
        .order('created_at', { ascending: false });

      // If we're filtering by current agent
      if (agentFilter === 'current') {
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (agent) {
          query = query.eq('agent_id', agent.id);
        }
      }

      const { data: transactionsData, error } = await query;

      if (error) throw error;

      // Fetch related data separately
      const participantIds = [...new Set(transactionsData?.map(t => t.participant_id))];
      const productIds = [...new Set(transactionsData?.filter(t => t.product_id).map(t => t.product_id))];
      const agentIds = [...new Set(transactionsData?.map(t => t.agent_id))];

      // Fetch participants, products, and agents in parallel
      const [participantsRes, productsRes, agentsRes] = await Promise.all([
        participantIds.length > 0 ? supabase.from('participants').select('id, name').in('id', participantIds) : { data: [] },
        productIds.length > 0 ? supabase.from('products').select('id, name').in('id', productIds) : { data: [] },
        agentIds.length > 0 ? supabase.from('agents').select('id, name').in('id', agentIds) : { data: [] }
      ]);

      // Create lookup maps
      const participantsMap = (participantsRes.data || []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {} as Record<number, string>);
      const productsMap = (productsRes.data || []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {} as Record<number, string>);
      const agentsMap = (agentsRes.data || []).reduce((acc, a) => { acc[a.id] = a.name; return acc; }, {} as Record<number, string>);

      const formattedTransactions: Transaction[] = (transactionsData || []).map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        participantName: participantsMap[t.participant_id] || 'Participant inconnu',
        productName: t.product_id ? productsMap[t.product_id] : undefined,
        agentName: agentsMap[t.agent_id] || 'Agent',
        status: t.status,
        createdAt: t.created_at
      }));

      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des transactions');
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

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `event_id=eq.${user.eventId}`
        },
        () => {
          console.log('New transaction, reloading...');
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.eventId]);

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
