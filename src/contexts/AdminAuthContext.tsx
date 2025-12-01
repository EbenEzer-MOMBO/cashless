import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { eventimeAPI } from '@/integrations/eventime/api';
import { auth } from '@/integrations/firebase/config';
import { signInAnonymously, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

export interface AdminUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Firebase Auth state changed:', firebaseUser ? {
        uid: firebaseUser.uid,
        isAnonymous: firebaseUser.isAnonymous
      } : 'null');
      
      // Check for existing admin session in localStorage
      const storedUser = localStorage.getItem('admin_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // If admin is logged in but no Firebase Auth session exists, create anonymous session
          if (!firebaseUser) {
            console.log('🔄 Admin session found but no Firebase Auth session. Creating anonymous session...');
            try {
              const credential = await signInAnonymously(auth);
              console.log('✅ Firebase Auth anonymous session created for existing admin:', {
                uid: credential.user.uid,
                isAnonymous: credential.user.isAnonymous
              });
              setFirebaseAuthReady(true);
            } catch (error: any) {
              console.error('❌ Failed to create Firebase Auth session for existing admin:', error);
              if (error.code === 'auth/operation-not-allowed') {
                console.error('⚠️ Anonymous authentication is not enabled in Firebase Console!');
                console.error('⚠️ Please enable it in Firebase Console > Authentication > Sign-in method > Anonymous');
              }
              setFirebaseAuthReady(false);
            }
          } else {
            console.log('✅ Firebase Auth session already exists:', firebaseUser.uid);
            setFirebaseAuthReady(true);
          }
        } catch (error) {
          console.error('Error parsing stored admin user:', error);
          localStorage.removeItem('admin_user');
          setFirebaseAuthReady(false);
        }
      } else {
        setFirebaseAuthReady(true);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('🔐 Starting admin login process...');
      
      // Authenticate via Eventime API
      const result = await eventimeAPI.adminLogin(email, password);
      
      console.log('📥 Login result received:', result);

      if (!result.status) {
        const errorMsg = result.error || result.message || 'Identifiants incorrects';
        console.error('❌ Login failed:', errorMsg);
        return { 
          success: false, 
          error: errorMsg
        };
      }

      if (!result.user) {
        console.error('❌ Login failed: No user data in response');
        return { 
          success: false, 
          error: 'Réponse invalide de l\'API. Aucune donnée utilisateur reçue.' 
        };
      }

      const adminUser: AdminUser = {
        id: result.user.id,
        firstname: result.user.firstname,
        lastname: result.user.lastname,
        email: result.user.email,
      };
      
      console.log('✅ Creating admin user object:', adminUser);
      
      // Create Firebase Auth anonymous session for Firestore access
      try {
        // Sign out any existing Firebase Auth session first
        if (auth.currentUser) {
          console.log('🔓 Signing out existing Firebase Auth session...');
          await firebaseSignOut(auth);
          // Wait a bit for sign out to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Sign in anonymously to get Firebase Auth token for Firestore
        console.log('🔐 Creating Firebase Auth anonymous session...');
        const anonymousCredential = await signInAnonymously(auth);
        console.log('✅ Firebase Auth anonymous session created for admin:', {
          uid: anonymousCredential.user.uid,
          isAnonymous: anonymousCredential.user.isAnonymous,
          email: anonymousCredential.user.email
        });
        
        // Verify the session is active
        if (auth.currentUser) {
          console.log('✅ Firebase Auth session verified:', auth.currentUser.uid);
        } else {
          console.error('❌ Firebase Auth session not active after creation!');
        }
      } catch (firebaseAuthError: any) {
        console.error('❌ Could not create Firebase Auth session for admin:', firebaseAuthError);
        console.error('Error code:', firebaseAuthError.code);
        console.error('Error message:', firebaseAuthError.message);
        
        // Show user-friendly error
        if (firebaseAuthError.code === 'auth/operation-not-allowed') {
          console.error('⚠️ Anonymous authentication is not enabled in Firebase Console!');
          console.error('⚠️ Please enable it in Firebase Console > Authentication > Sign-in method > Anonymous');
        }
        
        // Continue anyway, but Firestore access will likely fail
      }
      
      setUser(adminUser);
      localStorage.setItem('admin_user', JSON.stringify(adminUser));
      
      console.log('✅ Admin authenticated successfully via Eventime API');
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur de connexion. Vérifiez votre connexion internet.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('admin_user');
    // Sign out from Firebase Auth as well
    firebaseSignOut(auth).catch(err => {
      console.warn('Error signing out from Firebase Auth:', err);
    });
  };

  const checkAuth = (): boolean => {
    return user !== null;
  };

  const value: AdminAuthContextType = {
    user,
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
