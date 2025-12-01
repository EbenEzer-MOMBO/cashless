import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/integrations/firebase/config';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword,
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDocsFromCache,
  doc,
  updateDoc,
  getDoc,
  getDocFromCache,
  Timestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';

export interface AgentUser {
  id: string;
  agentId: string;
  name: string;
  email: string;
  role: 'recharge' | 'vente';
  eventId: string;
  eventName: string;
  passwordChanged: boolean;
}

interface AgentAuthContextType {
  user: AgentUser | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AgentAuthContext = createContext<AgentAuthContextType | undefined>(undefined);

export const useAgentAuth = () => {
  const context = useContext(AgentAuthContext);
  if (context === undefined) {
    throw new Error('useAgentAuth must be used within an AgentAuthProvider');
  }
  return context;
};

interface AgentAuthProviderProps {
  children: ReactNode;
}

export const AgentAuthProvider: React.FC<AgentAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AgentUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour charger les données de l'agent depuis Firestore
  const loadAgentData = async (userId: string): Promise<AgentUser | null> => {
    try {
      console.log('Loading agent data for user:', userId);
      
      // Query agents collection for this user
      const agentsRef = collection(db, COLLECTIONS.AGENTS);
      
      // First try with active filter
      let q = query(
        agentsRef, 
        where('user_id', '==', userId),
        where('active', '==', true)
      );
      
      let querySnapshot;
      try {
        // Try to get from server first
        querySnapshot = await getDocs(q);
        console.log(`🔍 Found ${querySnapshot.docs.length} active agent(s) for user ${userId}`);
      } catch (serverError: any) {
        // If offline, try to get from cache
        if (serverError.code === 'unavailable' || serverError.message?.includes('offline')) {
          console.warn('⚠️ Offline detected, trying to get from cache...');
          try {
            querySnapshot = await getDocsFromCache(q);
            console.log('✅ Got agent data from cache');
          } catch (cacheError) {
            console.error('❌ Could not get agent data from cache:', cacheError);
            return null;
          }
        } else {
          throw serverError;
        }
      }
      
      // If no active agent found, try without active filter
      if (querySnapshot.empty) {
        console.warn('⚠️ No active agent found, trying without active filter...');
        q = query(
          agentsRef, 
          where('user_id', '==', userId)
        );
        
        try {
          querySnapshot = await getDocs(q);
          console.log(`🔍 Found ${querySnapshot.docs.length} agent(s) (including inactive) for user ${userId}`);
        } catch (err) {
          console.error('❌ Error fetching agent without active filter:', err);
          return null;
        }
      }
      
      if (querySnapshot.empty) {
        console.warn('❌ No agent found for user:', userId);
        
        // Vérifier si l'utilisateur est un utilisateur anonyme (participant)
        // Les utilisateurs anonymes ne devraient pas avoir de données d'agent
        if (auth.currentUser?.isAnonymous) {
          console.log('ℹ️ User is anonymous (participant), skipping agent data load');
          return null;
        }
        
        console.warn('💡 Checking all agents in collection...');
        
        // Debug: Check all agents to see what user_ids exist
        try {
          const allAgentsSnapshot = await getDocs(agentsRef);
          console.log(`📊 Total agents in collection: ${allAgentsSnapshot.docs.length}`);
          allAgentsSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Agent ${index + 1}:`, {
              id: doc.id,
              user_id: data.user_id,
              email: data.email,
              name: data.name,
              active: data.active
            });
          });
        } catch (debugError) {
          console.error('Error fetching all agents for debug:', debugError);
        }
        
        return null;
      }

      const agentDoc = querySnapshot.docs[0];
      const agentData = agentDoc.data();
      
      // Get event name (with offline support)
      let eventName = '';
      if (agentData.event_id) {
        try {
          const eventDocRef = doc(db, COLLECTIONS.EVENTS, agentData.event_id);
          let eventDoc;
          try {
            eventDoc = await getDoc(eventDocRef);
          } catch (eventError: any) {
            // If offline, try to get from cache
            if (eventError.code === 'unavailable' || eventError.message?.includes('offline')) {
              try {
                eventDoc = await getDocFromCache(eventDocRef);
                console.log('✅ Got event data from cache');
              } catch (cacheError) {
                console.warn('Could not load event name from cache:', cacheError);
                // Event name will remain empty, which is acceptable
              }
            } else {
              throw eventError;
            }
          }
          
          if (eventDoc && eventDoc.exists()) {
            eventName = eventDoc.data().name || '';
          }
        } catch (eventError: any) {
          console.warn('Could not load event name:', eventError);
          // Event name will remain empty, which is acceptable
        }
      }

      console.log('Agent data loaded successfully:', agentData);

      return {
        id: userId,
        agentId: agentDoc.id,
        name: agentData.name,
        email: agentData.email,
        role: agentData.role,
        eventId: agentData.event_id,
        eventName: eventName,
        passwordChanged: agentData.password_changed || false
      };
    } catch (error: any) {
      console.error('Exception loading agent data:', error);
      
      // Handle offline errors more gracefully
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.warn('⚠️ Firestore is offline. Please check your internet connection.');
        return null;
      }
      
      return null;
    }
  };

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.uid);
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        // Vérifier si l'utilisateur est anonyme (participant)
        if (firebaseUser.isAnonymous) {
          console.log('ℹ️ User is anonymous (participant), skipping agent data load');
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // Vérifier si l'utilisateur a un email (les agents ont un email)
        if (!firebaseUser.email) {
          console.warn('⚠️ Firebase user has no email, might be anonymous or invalid');
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        let agentData = await loadAgentData(firebaseUser.uid);
        
        // Si l'agent n'est pas trouvé par user_id, essayer de le trouver par email
        if (!agentData && firebaseUser.email) {
          console.warn('⚠️ Agent not found by user_id, trying to find by email...', firebaseUser.email);
          try {
            const agentsRef = collection(db, COLLECTIONS.AGENTS);
            const emailQuery = query(
              agentsRef,
              where('email', '==', firebaseUser.email)
            );
            
            const emailSnapshot = await getDocs(emailQuery);
            console.log(`📧 Found ${emailSnapshot.docs.length} agent(s) with email ${firebaseUser.email}`);
            
            if (!emailSnapshot.empty) {
              const agentDoc = emailSnapshot.docs[0];
              const agentDataFromEmail = agentDoc.data();
              
              // Update the agent document with the correct user_id
              if (agentDataFromEmail.user_id !== firebaseUser.uid) {
                console.log('🔄 Updating agent user_id to match Firebase Auth UID...');
                const agentRef = doc(db, COLLECTIONS.AGENTS, agentDoc.id);
                await updateDoc(agentRef, { 
                  user_id: firebaseUser.uid,
                  updated_at: Timestamp.now()
                });
                console.log('✅ Agent user_id updated');
              }
              
              // Reload agent data
              agentData = await loadAgentData(firebaseUser.uid);
            }
          } catch (emailSearchError) {
            console.error('❌ Error searching agent by email:', emailSearchError);
          }
        }
        
        console.log('Agent data loaded:', agentData);
        setUser(agentData);
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }> => {
    try {
      console.log('🔐 Starting login process for:', email);
      setIsLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log('✅ User authenticated, UID:', firebaseUser.uid);

      console.log('🔍 Loading agent data...');
      let agentData = await loadAgentData(firebaseUser.uid);
      
      // If agent not found by user_id, try to find by email
      if (!agentData) {
        console.warn('⚠️ Agent not found by user_id, trying to find by email...');
        try {
          const agentsRef = collection(db, COLLECTIONS.AGENTS);
          const emailQuery = query(
            agentsRef,
            where('email', '==', email)
          );
          
          const emailSnapshot = await getDocs(emailQuery);
          console.log(`📧 Found ${emailSnapshot.docs.length} agent(s) with email ${email}`);
          
          if (!emailSnapshot.empty) {
            const agentDoc = emailSnapshot.docs[0];
            const agentDataFromEmail = agentDoc.data();
            
            // Update the agent document with the correct user_id
            if (agentDataFromEmail.user_id !== firebaseUser.uid) {
              console.log('🔄 Updating agent user_id to match Firebase Auth UID...');
              const agentRef = doc(db, COLLECTIONS.AGENTS, agentDoc.id);
              await updateDoc(agentRef, { 
                user_id: firebaseUser.uid,
                updated_at: Timestamp.now()
              });
              console.log('✅ Agent user_id updated');
            }
            
            // Reload agent data
            agentData = await loadAgentData(firebaseUser.uid);
          }
        } catch (emailSearchError) {
          console.error('❌ Error searching agent by email:', emailSearchError);
        }
      }
      
      if (!agentData) {
        console.error('❌ Agent data not found after all attempts, signing out...');
        await signOut(auth);
        return { 
          success: false, 
          error: 'Compte agent non trouvé ou désactivé. Contactez votre administrateur.' 
        };
      }

      console.log('✅ Login successful, agent data:', agentData);
      return { 
        success: true, 
        requiresPasswordChange: !agentData.passwordChanged 
      };
    } catch (error: any) {
      console.error('❌ Login exception:', error);
      let errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Réessayez plus tard.';
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      await updatePassword(currentUser, newPassword);

      // Mark password as changed in Firestore
      if (user) {
        const agentRef = doc(db, COLLECTIONS.AGENTS, user.agentId);
        await updateDoc(agentRef, { password_changed: true });
        
        setUser({ ...user, passwordChanged: true });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { success: false, error: error.message || 'Erreur lors du changement de mot de passe' };
    }
  };

  const value: AgentAuthContextType = {
    user,
    firebaseUser,
    isAuthenticated: !!firebaseUser && !!user,
    isLoading,
    login,
    logout,
    changePassword,
  };

  return (
    <AgentAuthContext.Provider value={value}>
      {children}
    </AgentAuthContext.Provider>
  );
};
