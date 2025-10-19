
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface AdminUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  supabaseUser: User | null;
  supabaseSession: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        setSupabaseSession(session);
        setSupabaseUser(session?.user ?? null);
      }
    );

    // Check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Existing session:', session?.user?.id);
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
    });

    // Vérifier si l'utilisateur admin est déjà connecté au chargement
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { email, password }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return { 
          success: false, 
          error: 'Erreur de connexion. Vérifiez votre connexion internet.' 
        };
      }

      if (data?.status === true && data?.user) {
        const adminUser: AdminUser = {
          id: data.user.id,
          firstname: data.user.firstname,
          lastname: data.user.lastname,
          email: data.user.email,
        };
        
        setUser(adminUser);
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
        
        // If we have Supabase auth credentials, establish the session
        if (data.supabase_auth?.email && data.supabase_auth?.password) {
          try {
            console.log('Signing in with Supabase credentials...');
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
              email: data.supabase_auth.email,
              password: data.supabase_auth.password,
            });
            
            if (signInError) {
              console.error('Error signing in with Supabase:', signInError);
            } else {
              console.log('Successfully signed in with Supabase:', authData.user?.id);
            }
          } catch (sessionError) {
            console.error('Error establishing Supabase session:', sessionError);
          }
        }
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data?.message || data?.error || 'Identifiants incorrects' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Erreur de connexion. Vérifiez votre connexion internet.' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setSupabaseUser(null);
    setSupabaseSession(null);
    localStorage.removeItem('admin_user');
    supabase.auth.signOut();
  };

  const checkAuth = (): boolean => {
    return user !== null;
  };

  const value: AdminAuthContextType = {
    user,
    supabaseUser,
    supabaseSession,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
