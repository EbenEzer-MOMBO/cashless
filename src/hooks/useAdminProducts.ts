import { useState, useEffect } from 'react';
import { db, auth } from '@/integrations/firebase/config';
import { 
  collection, 
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';

export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  eventId: string;
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

      // Check if user is authenticated (Firebase Auth)
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        // Check if admin is logged in (via localStorage)
        const adminUser = localStorage.getItem('admin_user');
        if (adminUser) {
          console.warn('⚠️ Admin user detected (Eventime API), but NO Firebase Auth session yet.');
          console.warn('⚠️ Waiting for Firebase Auth session to be created...');
          // Wait a bit for Firebase Auth session to be created (max 3 seconds)
          let attempts = 0;
          const maxAttempts = 30; // 3 seconds (100ms * 30)
          while (!auth.currentUser && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          
          if (!auth.currentUser) {
            console.error('❌ Firebase Auth session was not created after waiting.');
            setError('Erreur d\'authentification Firebase. Vérifiez que l\'authentification anonyme est activée.');
            setLoading(false);
            return;
          } else {
            console.log('✅ Firebase Auth session created after waiting:', auth.currentUser.uid);
          }
        } else {
          setError('Vous devez être connecté pour voir les produits');
          setLoading(false);
          return;
        }
      }

      const productsRef = collection(db, COLLECTIONS.PRODUCTS);
      // Load all products and filter/t sort client-side to avoid index requirement
      const querySnapshot = await getDocs(productsRef);

      const formattedProducts: AdminProduct[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const p = docSnapshot.data();
        
        // Filter active products only
        if (p.active !== true) {
          continue;
        }
        
        // Get event name
        let eventName = '';
        if (p.event_id) {
          const eventDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, p.event_id));
          if (eventDoc.exists()) {
            eventName = eventDoc.data().name || '';
          }
        }
        
        formattedProducts.push({
          id: docSnapshot.id,
          name: p.name,
          price: Number(p.price),
          stock: p.stock,
          active: p.active,
          eventId: p.event_id,
          eventName: eventName,
          createdAt: p.created_at?.toDate?.()?.toISOString() || p.created_at,
          updatedAt: p.updated_at?.toDate?.()?.toISOString() || p.updated_at
        });
      }

      // Sort by name client-side
      formattedProducts.sort((a, b) => a.name.localeCompare(b.name));

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
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    // Subscribe to all products, filter client-side
    const unsubscribe = onSnapshot(productsRef, () => {
      console.log('Admin products changed, reloading...');
      loadProducts();
    }, (err) => {
      console.error('Error in admin products subscription:', err);
    });

    return () => unsubscribe();
  }, []);

  const createProduct = async (data: AdminProductFormData) => {
    try {
      // Check if user is authenticated (Firebase Auth)
      const currentUser = auth.currentUser;
      
      console.log('🔄 Creating product...');
      console.log('🔍 Checking Firebase Auth state...');
      console.log('  - auth.currentUser:', currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        isAnonymous: currentUser.isAnonymous
      } : 'null');
      
      if (!currentUser) {
        // Check if admin is logged in (via localStorage)
        const adminUser = localStorage.getItem('admin_user');
        if (adminUser) {
          console.warn('⚠️ Admin user detected (Eventime API), but NO Firebase Auth session yet.');
          console.warn('⚠️ Waiting for Firebase Auth session to be created...');
          // Wait a bit for Firebase Auth session to be created (max 3 seconds)
          let attempts = 0;
          const maxAttempts = 30; // 3 seconds (100ms * 30)
          while (!auth.currentUser && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          
          if (!auth.currentUser) {
            console.error('❌ Firebase Auth session was not created after waiting.');
            throw new Error('Erreur d\'authentification Firebase. Vérifiez que l\'authentification anonyme est activée.');
          } else {
            console.log('✅ Firebase Auth session created after waiting:', auth.currentUser.uid);
          }
        } else {
          throw new Error('Vous devez être connecté pour créer un produit');
        }
      } else {
        console.log('✅ Firebase Auth user authenticated:', {
          uid: currentUser.uid,
          isAnonymous: currentUser.isAnonymous
        });
      }

      console.log('📝 Creating product document in Firestore...', {
        name: data.name,
        price: Number(data.price),
        stock: Number(data.stock),
        event_id: data.eventId
      });

      await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
        name: data.name,
        price: Number(data.price),
        stock: Number(data.stock),
        event_id: data.eventId,
        active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
      
      console.log('✅ Product created successfully');
      await loadProducts();
    } catch (err) {
      console.error('❌ Error creating product:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'permission-denied') {
        throw new Error('Permission refusée. Vérifiez les règles de sécurité Firestore.');
      } else if (error.message) {
        throw new Error(error.message);
      }
      throw err;
    }
  };

  const updateProduct = async (id: string, data: AdminProductFormData) => {
    try {
      // Check if user is authenticated (Firebase Auth)
      if (!auth.currentUser) {
        const adminUser = localStorage.getItem('admin_user');
        if (!adminUser) {
          throw new Error('Vous devez être connecté pour modifier un produit');
        }
      }

      console.log('📝 Updating product:', id);
      const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
      await updateDoc(productRef, {
        name: data.name,
        price: Number(data.price),
        stock: Number(data.stock),
        event_id: data.eventId,
        updated_at: Timestamp.now()
      });
      
      console.log('✅ Product updated successfully');
      await loadProducts();
    } catch (err) {
      console.error('❌ Error updating product:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'permission-denied') {
        throw new Error('Permission refusée. Vérifiez les règles de sécurité Firestore.');
      } else if (error.message) {
        throw new Error(error.message);
      }
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      // Check if user is authenticated (Firebase Auth)
      if (!auth.currentUser) {
        const adminUser = localStorage.getItem('admin_user');
        if (!adminUser) {
          throw new Error('Vous devez être connecté pour supprimer un produit');
        }
      }

      console.log('🗑️ Deleting product:', id);
      const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
      await updateDoc(productRef, { 
        active: false,
        updated_at: Timestamp.now()
      });
      
      console.log('✅ Product deleted successfully');
      await loadProducts();
    } catch (err) {
      console.error('❌ Error deleting product:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'permission-denied') {
        throw new Error('Permission refusée. Vérifiez les règles de sécurité Firestore.');
      } else if (error.message) {
        throw new Error(error.message);
      }
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
