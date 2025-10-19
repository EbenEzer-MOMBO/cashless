
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentAuth } from '@/contexts/AgentAuthContext';

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  eventId: number;
  eventName?: string;
}

export interface ProductFormData {
  name: string;
  price: string;
  stock: string;
  eventId: string;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
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

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('event_id', user.eventId)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      const formattedProducts: Product[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock: p.stock,
        active: p.active,
        eventId: p.event_id
      }));

      setProducts(formattedProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des produits');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [user?.eventId]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.eventId) return;

    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `event_id=eq.${user.eventId}`
        },
        () => {
          console.log('Products changed, reloading...');
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.eventId]);

  const createProduct = async (data: ProductFormData) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: data.name,
          price: Number(data.price),
          stock: Number(data.stock),
          event_id: user.eventId,
          active: true
        });
      
      if (error) throw error;
      await loadProducts();
    } catch (err) {
      console.error('Error creating product:', err);
      throw err;
    }
  };

  const updateProduct = async (id: number, data: ProductFormData) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: data.name,
          price: Number(data.price),
          stock: Number(data.stock)
        })
        .eq('id', id);
      
      if (error) throw error;
      await loadProducts();
    } catch (err) {
      console.error('Error updating product:', err);
      throw err;
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', id);
      
      if (error) throw error;
      await loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      throw err;
    }
  };

  return {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: loadProducts
  };
};
