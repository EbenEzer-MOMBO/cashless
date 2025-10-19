
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentAuth } from '@/contexts/AgentAuthContext';

export interface AgentProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  eventId: number;
  category?: string;
}

export const useAgentProducts = () => {
  const [products, setProducts] = useState<AgentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAgentAuth();

  const loadProducts = async () => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get products assigned to this agent
      const { data, error } = await supabase
        .from('product_assignments')
        .select(`
          products!inner(
            id,
            name,
            price,
            stock,
            active,
            event_id
          )
        `)
        .eq('agent_id', user.agentId)
        .eq('products.active', true);

      if (error) throw error;

      const formattedProducts: AgentProduct[] = (data || []).map(assignment => ({
        id: assignment.products.id,
        name: assignment.products.name,
        price: Number(assignment.products.price),
        stock: assignment.products.stock,
        active: assignment.products.active,
        eventId: assignment.products.event_id,
        category: 'Produits' // Default category for now
      }));

      setProducts(formattedProducts);
    } catch (err) {
      console.error('Error loading agent products:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des produits');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [user?.id]);

  // Subscribe to real-time changes for both products and assignments
  useEffect(() => {
    if (!user?.id) return;

    const productsChannel = supabase
      .channel('agent-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `event_id=eq.${user.eventId}`
        },
        () => {
          console.log('Products changed, reloading agent products...');
          loadProducts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_assignments',
          filter: `agent_id=eq.${user.agentId}`
        },
        () => {
          console.log('Product assignments changed, reloading agent products...');
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, [user?.agentId, user?.eventId]);

  return {
    products,
    loading,
    error,
    refetch: loadProducts
  };
};
