
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  eventId: number;
  eventName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductFormData {
  name: string;
  price: string;
  stock: string;
  eventId: string;
}

export const useAdminProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          stock,
          active,
          event_id,
          created_at,
          updated_at,
          events!inner(name)
        `)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      const formattedProducts: AdminProduct[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock: p.stock,
        active: p.active,
        eventId: p.event_id,
        eventName: p.events?.name || '',
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));

      setProducts(formattedProducts);
    } catch (err) {
      console.error('Error loading admin products:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des produits');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          console.log('Admin products changed, reloading...');
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createProduct = async (data: AdminProductFormData) => {
    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: data.name,
          price: Number(data.price),
          stock: Number(data.stock),
          event_id: Number(data.eventId),
          active: true
        });
      
      if (error) throw error;
      await loadProducts();
    } catch (err) {
      console.error('Error creating product:', err);
      throw err;
    }
  };

  const updateProduct = async (id: number, data: AdminProductFormData) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: data.name,
          price: Number(data.price),
          stock: Number(data.stock),
          event_id: Number(data.eventId)
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
