import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/integrations/firebase/config';
import { 
  collection, 
  getDocs,
  updateDoc,
  doc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: 'recharge' | 'vente';
  active: boolean;
  lastActivity: string;
  totalSales: number;
  eventId: string;
  eventName: string;
  createdAt?: string;
  updatedAt?: string;
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const isLoadingRef = useRef(false);

  // Fonction pour charger les agents depuis Firestore
  const loadAgents = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('⏸️ Load already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated (Firebase Auth)
      const currentUser = auth.currentUser;
      
      console.log('🔄 Loading agents from Firestore...');
      console.log('🔍 Checking Firebase Auth state...');
      console.log('  - auth.currentUser:', currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        isAnonymous: currentUser.isAnonymous,
        providerId: currentUser.providerId
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
            console.error('❌ Please check:');
            console.error('   1. Is Anonymous authentication enabled in Firebase Console?');
            console.error('   2. Check the login logs for Firebase Auth errors');
            setError('Erreur d\'authentification Firebase. Vérifiez que l\'authentification anonyme est activée.');
            setLoading(false);
            return;
          } else {
            console.log('✅ Firebase Auth session created after waiting:', auth.currentUser.uid);
          }
        } else {
          console.warn('⚠️ No authenticated user detected (neither Firebase Auth nor admin)');
          setError('Vous devez être connecté pour voir les agents');
          setLoading(false);
          return;
        }
      } else {
        console.log('✅ Firebase Auth user authenticated:', {
          uid: currentUser.uid,
          isAnonymous: currentUser.isAnonymous,
          email: currentUser.email || 'no email (anonymous)'
        });
      }
      console.log('📦 Collection name:', COLLECTIONS.AGENTS);
      
      const agentsRef = collection(db, COLLECTIONS.AGENTS);
      console.log('📦 Collection reference created');
      
      let querySnapshot;
      try {
        console.log('⏳ Starting getDocs query...');
        querySnapshot = await getDocs(agentsRef);
        console.log(`✅ getDocs completed successfully`);
        console.log(`📊 Found ${querySnapshot.docs.length} agent documents`);
        
        // Log each document for debugging
        if (querySnapshot.docs.length > 0) {
          querySnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`📄 Agent ${index + 1}:`, {
              id: doc.id,
              name: data.name,
              email: data.email,
              role: data.role,
              active: data.active,
              event_id: data.event_id,
              user_id: data.user_id,
              fullData: data
            });
          });
        } else {
          console.warn('⚠️ No agents found in Firestore collection');
        }
      } catch (fetchError) {
        const error = fetchError as { code?: string; message?: string; stack?: string };
        console.error('❌ Error fetching agents:', fetchError);
        console.error('❌ Error code:', error?.code);
        console.error('❌ Error message:', error?.message);
        console.error('❌ Error stack:', error?.stack);
        throw fetchError;
      }
      
      const agentsData: Agent[] = [];
      
      // Collect all event IDs first
      console.log('🔄 Collecting event IDs...');
      const eventIds = new Set<string>();
      querySnapshot.docs.forEach(docSnapshot => {
        const a = docSnapshot.data();
        if (a.event_id) {
          eventIds.add(a.event_id);
          console.log(`📅 Found event_id: ${a.event_id}`);
        }
      });
      console.log(`📅 Total unique event IDs: ${eventIds.size}`);

      // Load all events in parallel
      console.log('🔄 Loading event names...');
      const eventMap: Record<string, string> = {};
      if (eventIds.size > 0) {
        await Promise.allSettled(
          Array.from(eventIds).map(async (eventId) => {
            try {
              console.log(`📅 Loading event: ${eventId}`);
              const eventDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, eventId));
              if (eventDoc.exists()) {
                const eventName = eventDoc.data().name || eventId;
                eventMap[eventId] = eventName;
                console.log(`✅ Event loaded: ${eventId} -> ${eventName}`);
              } else {
                eventMap[eventId] = eventId; // Use event_id as fallback
                console.log(`⚠️ Event not found, using ID: ${eventId}`);
              }
            } catch (err) {
              console.warn(`⚠️ Error loading event ${eventId}:`, err);
              eventMap[eventId] = eventId; // Use event_id as fallback
            }
          })
        );
      }
      console.log('✅ Event names loaded:', eventMap);

      // Process all agents
      console.log('🔄 Processing agents...');
      for (const docSnapshot of querySnapshot.docs) {
        const a = docSnapshot.data();
        
        console.log(`🔍 Processing agent ${docSnapshot.id}:`, {
          name: a.name,
          email: a.email,
          role: a.role,
          active: a.active,
          hasName: !!a.name,
          hasEmail: !!a.email,
          hasRole: !!a.role
        });
        
        // Validate required fields
        if (!a.name || !a.email || !a.role) {
          console.warn('⚠️ Agent document missing required fields:', docSnapshot.id, {
            name: a.name,
            email: a.email,
            role: a.role,
            fullData: a
          });
          continue; // Skip invalid agents
        }
        
        const eventName = a.event_id ? (eventMap[a.event_id] || a.event_id) : 'Événement inconnu';
        
        const agentData = {
          id: docSnapshot.id,
          name: a.name,
          email: a.email,
          role: a.role,
          active: a.active !== undefined ? a.active : true, // Default to active if not set
          lastActivity: a.last_activity?.toDate?.()?.toISOString() || a.last_activity || '',
          totalSales: a.total_sales || 0,
          eventId: a.event_id || '',
          eventName: eventName,
          createdAt: a.created_at?.toDate?.()?.toISOString() || a.created_at || '',
          updatedAt: a.updated_at?.toDate?.()?.toISOString() || a.updated_at || ''
        };
        
        console.log('✅ Adding agent to list:', agentData);
        agentsData.push(agentData);
      }
      
      console.log(`✅ Loaded ${agentsData.length} agents successfully`, agentsData);
      setAgents(agentsData);
      setHasLoadedOnce(true);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      console.error('❌ Error loading agents:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Erreur lors du chargement des agents';
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission refusée. Vérifiez les règles de sécurité Firestore dans la console Firebase.';
        console.error('🔒 Firestore permission denied. Check security rules.');
      } else if (error.code === 'unavailable') {
        errorMessage = 'Firestore est indisponible. Vérifiez votre connexion internet.';
        console.error('🌐 Firestore unavailable. Check internet connection.');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      // Only clear agents if we haven't loaded successfully before
      if (!hasLoadedOnce) {
        setAgents([]);
      }
    } finally {
      console.log('🏁 Finished loading agents');
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [hasLoadedOnce]);

  // Fonction pour activer/désactiver un agent
  const toggleAgentStatus = async (agentId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return false;

      const agentRef = doc(db, COLLECTIONS.AGENTS, agentId);
      await updateDoc(agentRef, { 
        active: !agent.active
      });
      
      setAgents(prev => prev.map(a => 
        a.id === agentId 
          ? { ...a, active: !a.active }
          : a
      ));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut de l\'agent');
      return false;
    }
  };

  // Fonction pour filtrer les agents
  const getFilteredAgents = (roleFilter: string, statusFilter: string) => {
    return agents.filter(agent => {
      const roleMatch = roleFilter === "all" || agent.role === roleFilter;
      const statusMatch = statusFilter === "all" || 
        (statusFilter === "active" && agent.active) ||
        (statusFilter === "inactive" && !agent.active);
      return roleMatch && statusMatch;
    });
  };

  // Statistiques calculées
  const getStats = () => {
    const activeAgents = agents.filter(agent => agent.active).length;
    const rechargeAgents = agents.filter(agent => agent.role === "recharge").length;
    const venteAgents = agents.filter(agent => agent.role === "vente").length;
    
    return {
      activeAgents,
      rechargeAgents,
      venteAgents
    };
  };

  // Initial load on mount
  useEffect(() => {
    // Wait a bit for Firebase Auth to be ready
    const timer = setTimeout(() => {
      loadAgents();
    }, 500);

    return () => clearTimeout(timer);
  }, [loadAgents]);

  // Subscribe to real-time changes for agents (only after first successful load)
  useEffect(() => {
    // Don't subscribe until we've loaded agents at least once
    if (!hasLoadedOnce) {
      console.log('⏳ Waiting for initial load before subscribing to real-time updates...');
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let checkAuthInterval: NodeJS.Timeout | null = null;

    const setupSubscription = () => {
      if (!auth.currentUser) {
        console.warn('⚠️ Cannot setup subscription: no Firebase Auth session');
        return;
      }

      const agentsRef = collection(db, COLLECTIONS.AGENTS);
      
      console.log('🔔 Subscribing to real-time agents updates...');
      unsubscribe = onSnapshot(
        agentsRef, 
        async (snapshot) => {
          console.log('🔄 Agents collection changed, reloading...', {
            size: snapshot.size,
            docs: snapshot.docs.length,
            hasAuth: !!auth.currentUser,
            currentAgentsCount: agents.length,
            hasLoadedOnce: hasLoadedOnce
          });
          
          // Only reload if we still have auth and it's not already loading
          if (auth.currentUser && !isLoadingRef.current) {
            // Small delay to avoid rapid successive calls
            await new Promise(resolve => setTimeout(resolve, 200));
            if (auth.currentUser && !isLoadingRef.current) {
              await loadAgents();
            }
          } else {
            console.warn('⚠️ Skipping reload:', {
              hasAuth: !!auth.currentUser,
              isLoading: isLoadingRef.current
            });
          }
        }, 
        (err) => {
          console.error('❌ Error in agents subscription:', err);
          // Only try to reload if we have auth
          if (auth.currentUser && !isLoadingRef.current) {
            loadAgents();
          } else {
            console.warn('⚠️ Cannot reload agents:', {
              hasAuth: !!auth.currentUser,
              isLoading: isLoadingRef.current
            });
          }
        }
      );
    };

    // Only subscribe if Firebase Auth is ready
    if (!auth.currentUser) {
      console.log('⏳ Waiting for Firebase Auth session before subscribing to agents...');
      
      // Wait for auth to be ready
      checkAuthInterval = setInterval(() => {
        if (auth.currentUser) {
          if (checkAuthInterval) clearInterval(checkAuthInterval);
          setupSubscription();
        }
      }, 500);
    } else {
      setupSubscription();
    }

    return () => {
      if (checkAuthInterval) {
        clearInterval(checkAuthInterval);
      }
      if (unsubscribe) {
        console.log('🔌 Unsubscribing from agents collection');
        unsubscribe();
      }
    };
  }, [loadAgents, agents.length, hasLoadedOnce]);

  return {
    agents,
    loading,
    error,
    toggleAgentStatus,
    getFilteredAgents,
    getStats,
    refetch: loadAgents
  };
};
