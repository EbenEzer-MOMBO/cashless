import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface AgentUser {
  id: string;
  agentId: number;
  name: string;
  email: string;
  role: 'recharge' | 'vente';
  eventId: number;
  eventName: string;
  passwordChanged: boolean;
}

interface AgentAuthContextType {
  user: AgentUser | null;
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour charger les données de l'agent depuis la base de données
  const loadAgentData = async (userId: string): Promise<AgentUser | null> => {
    try {
      console.log('Loading agent data for user:', userId);
      
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          events:event_id (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Database error loading agent data:', error);
        return null;
      }

      if (!data) {
        console.warn('No agent found for user:', userId);
        return null;
      }

      console.log('Agent data loaded successfully:', data);

      return {
        id: data.user_id,
        agentId: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        eventId: data.event_id,
        eventName: data.events?.name || '',
        passwordChanged: data.password_changed || false
      };
    } catch (error) {
      console.error('Exception loading agent data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          // Différer l'appel Supabase pour éviter les deadlocks
          setTimeout(() => {
            loadAgentData(session.user.id).then(agentData => {
              console.log('Agent data loaded:', agentData);
              setUser(agentData);
              setIsLoading(false);
            }).catch(error => {
              console.error('Error loading agent data:', error);
              setUser(null);
              setIsLoading(false);
            });
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Vérifier la session existante
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      
      if (session?.user) {
        try {
          const agentData = await loadAgentData(session.user.id);
          console.log('Initial agent data loaded:', agentData);
          setUser(agentData);
        } catch (error) {
          console.error('Error loading initial agent data:', error);
          setUser(null);
        }
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }> => {
    try {
      console.log('Starting login process for:', email);
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        return { 
          success: false, 
          error: error.message === 'Invalid login credentials' 
            ? 'Email ou mot de passe incorrect' 
            : error.message 
        };
      }

      if (data.user) {
        console.log('User authenticated, loading agent data...');
        const agentData = await loadAgentData(data.user.id);
        
        if (!agentData) {
          console.error('Agent data not found, signing out...');
          await supabase.auth.signOut();
          return { 
            success: false, 
            error: 'Compte agent non trouvé ou désactivé. Contactez votre administrateur.' 
          };
        }

        console.log('Login successful, agent data:', agentData);
        return { 
          success: true, 
          requiresPasswordChange: !agentData.passwordChanged 
        };
      }

      return { success: false, error: 'Erreur de connexion' };
    } catch (error: any) {
      console.error('Login exception:', error);
      return { 
        success: false, 
        error: 'Erreur de connexion. Vérifiez votre connexion internet.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Marquer le mot de passe comme changé dans la base de données
      if (user) {
        await supabase
          .from('agents')
          .update({ password_changed: true })
          .eq('user_id', user.id);
        
        setUser({ ...user, passwordChanged: true });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur lors du changement de mot de passe' };
    }
  };

  const value: AgentAuthContextType = {
    user,
    session,
    isAuthenticated: !!session && !!user,
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