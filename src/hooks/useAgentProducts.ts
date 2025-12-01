import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { useAgentAuth } from '@/contexts/AgentAuthContext';

export interface AgentProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  eventId: string;
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

    // Seuls les agents de vente peuvent voir les produits
    if (user.role !== 'vente') {
      console.log('Agent is not a sale agent, no products to load');
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get products assigned to this agent
      const assignmentsRef = collection(db, COLLECTIONS.PRODUCT_ASSIGNMENTS);
      const q = query(assignmentsRef, where('agent_id', '==', user.agentId));
      const assignmentsSnapshot = await getDocs(q);

      // Collect all product IDs first
      const productIds = assignmentsSnapshot.docs
        .map(doc => doc.data().product_id)
        .filter(Boolean);

      if (productIds.length === 0) {
        setProducts([]);
        return;
      }

      // Load all products in parallel instead of sequentially
      const productPromises = productIds.map(productId => 
        getDoc(doc(db, COLLECTIONS.PRODUCTS, productId))
      );
      
      const productDocs = await Promise.all(productPromises);

      const formattedProducts: AgentProduct[] = productDocs
        .filter(doc => doc.exists())
        .map(doc => {
          const product = doc.data();
          return {
            id: doc.id,
            name: product.name,
            price: Number(product.price),
            stock: product.stock,
            active: product.active,
            eventId: product.event_id,
            category: 'Produits'
          };
        })
        .filter(product => product.active); // Only active products

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
  }, [user?.agentId]);

  // Subscribe to real-time changes for both products and assignments
  useEffect(() => {
    if (!user?.agentId || user.role !== 'vente') return;

    // Listen to product assignments changes
    const assignmentsRef = collection(db, COLLECTIONS.PRODUCT_ASSIGNMENTS);
    const q = query(assignmentsRef, where('agent_id', '==', user.agentId));

    const unsubscribe = onSnapshot(q, () => {
      console.log('Product assignments changed, reloading agent products...');
      loadProducts();
    }, (err) => {
      console.error('Error in assignments subscription:', err);
    });

    return () => unsubscribe();
  }, [user?.agentId]);

  return {
    products,
    loading,
    error,
    refetch: loadProducts
  };
};
