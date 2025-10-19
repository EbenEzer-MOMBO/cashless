
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductAssignment {
  id: number;
  productId: number;
  agentId: number;
  eventId: number;
  productName: string;
  agentName: string;
  eventName: string;
  createdAt: string;
}

export const useProductAssignments = (eventId?: number) => {
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('product_assignments')
        .select('id, product_id, agent_id, event_id, created_at');

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data: assignmentsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get related data separately
      const productIds = [...new Set((assignmentsData || []).map(a => a.product_id))];
      const agentIds = [...new Set((assignmentsData || []).map(a => a.agent_id))];
      const eventIds = [...new Set((assignmentsData || []).map(a => a.event_id))];

      const [productsRes, agentsRes, eventsRes] = await Promise.all([
        productIds.length > 0 ? supabase.from('products').select('id, name').in('id', productIds) : { data: [] },
        agentIds.length > 0 ? supabase.from('agents').select('id, name').in('id', agentIds) : { data: [] },
        eventIds.length > 0 ? supabase.from('events').select('id, name').in('id', eventIds) : { data: [] }
      ]);

      // Create lookup maps
      const productsMap = (productsRes.data || []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {} as Record<number, string>);
      const agentsMap = (agentsRes.data || []).reduce((acc, a) => { acc[a.id] = a.name; return acc; }, {} as Record<number, string>);
      const eventsMap = (eventsRes.data || []).reduce((acc, e) => { acc[e.id] = e.name; return acc; }, {} as Record<number, string>);

      const formattedAssignments: ProductAssignment[] = (assignmentsData || []).map(a => ({
        id: a.id,
        productId: a.product_id,
        agentId: a.agent_id,
        eventId: a.event_id,
        productName: productsMap[a.product_id] || 'Produit inconnu',
        agentName: agentsMap[a.agent_id] || 'Agent',
        eventName: eventsMap[a.event_id] || 'Événement inconnu',
        createdAt: a.created_at
      }));

      setAssignments(formattedAssignments);
    } catch (err) {
      console.error('Error loading assignments:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des affectations');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const assignProduct = async (productId: number, agentId: number) => {
    try {
      const { error } = await supabase
        .from('product_assignments')
        .insert({
          product_id: productId,
          agent_id: agentId,
          event_id: eventId || 0 // Will be set by trigger
        });
      
      if (error) throw error;
      await loadAssignments();
    } catch (err) {
      console.error('Error assigning product:', err);
      throw err;
    }
  };

  const unassignProduct = async (productId: number, agentId: number) => {
    try {
      const { error } = await supabase
        .from('product_assignments')
        .delete()
        .eq('product_id', productId)
        .eq('agent_id', agentId);
      
      if (error) throw error;
      await loadAssignments();
    } catch (err) {
      console.error('Error unassigning product:', err);
      throw err;
    }
  };

  const getAssignedProducts = (agentId: number): number[] => {
    return assignments
      .filter(a => a.agentId === agentId)
      .map(a => a.productId);
  };

  useEffect(() => {
    loadAssignments();
  }, [eventId]);

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('product-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_assignments'
        },
        () => {
          console.log('Product assignments changed, reloading...');
          loadAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    assignments,
    loading,
    error,
    assignProduct,
    unassignProduct,
    getAssignedProducts,
    refetch: loadAssignments
  };
};
