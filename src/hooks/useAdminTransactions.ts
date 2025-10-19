
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

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

  const loadTransactions = async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Loading admin transactions with separate queries...');

      // First, get all transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, type, amount, status, created_at, participant_id, agent_id, product_id')
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Transactions query error:', transactionsError);
        throw transactionsError;
      }

      if (!transactionsData || transactionsData.length === 0) {
        console.log('No transactions found');
        setTransactions([]);
        return;
      }

      console.log('Raw transactions data:', transactionsData);

      // Get unique IDs for separate queries
      const agentIds = [...new Set(transactionsData.map(t => t.agent_id).filter(Boolean))];
      const participantIds = [...new Set(transactionsData.map(t => t.participant_id).filter(Boolean))];
      const productIds = [...new Set(transactionsData.map(t => t.product_id).filter(Boolean))];

      // Fetch agents, participants, and products in parallel
      const [agentsResponse, participantsResponse, productsResponse] = await Promise.all([
        agentIds.length > 0 ? supabase.from('agents').select('id, name').in('id', agentIds) : { data: [], error: null },
        participantIds.length > 0 ? supabase.from('participants').select('id, name').in('id', participantIds) : { data: [], error: null },
        productIds.length > 0 ? supabase.from('products').select('id, name').in('id', productIds) : { data: [], error: null }
      ]);

      // Log any errors in fetching related data
      if (agentsResponse.error) {
        console.error('Error fetching agents:', agentsResponse.error);
      }
      if (participantsResponse.error) {
        console.error('Error fetching participants:', participantsResponse.error);
      }
      if (productsResponse.error) {
        console.error('Error fetching products:', productsResponse.error);
      }

      console.log('Participants found:', participantsResponse.data?.length, 'out of', participantIds.length);
      console.log('Agents found:', agentsResponse.data?.length, 'out of', agentIds.length);

      // Create lookup maps
      const agentsMap = new Map((agentsResponse.data || []).map(a => [a.id, a.name]));
      const participantsMap = new Map((participantsResponse.data || []).map(p => [p.id, p.name]));
      const productsMap = new Map((productsResponse.data || []).map(p => [p.id, p.name]));

      // Format transactions with joined data
      const formattedTransactions: AdminTransaction[] = transactionsData.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        participantName: participantsMap.get(t.participant_id) || `Participant #${t.participant_id}`,
        productName: t.product_id ? (productsMap.get(t.product_id) || `Produit #${t.product_id}`) : undefined,
        agentName: agentsMap.get(t.agent_id) || `Agent #${t.agent_id}`,
        status: t.status,
        createdAt: t.created_at
      }));

      console.log('Formatted transactions:', formattedTransactions);
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
    loadTransactions();
  }, [user?.id]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('admin-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          console.log('New transaction detected, reloading...');
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
