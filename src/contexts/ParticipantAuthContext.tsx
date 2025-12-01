import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth } from '@/integrations/firebase/config';
import { eventimeAPI } from '@/integrations/eventime/api';
import { 
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { signInAnonymously, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { COLLECTIONS } from '@/integrations/firebase/types';

interface Participant {
  id: string;
  name: string;
  email: string;
  balance: number;
  event_id: string;
  qr_code: string;
}

interface ParticipantSession {
  token: string;
  expires_at: string;
}

interface ParticipantAuthContextType {
  participant: Participant | null;
  session: ParticipantSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (ticketCode: string) => Promise<boolean>;
  logout: () => void;
  refreshParticipant: () => Promise<void>;
}

const ParticipantAuthContext = createContext<ParticipantAuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PARTICIPANT: 'participant_data',
  SESSION: 'participant_session'
};

export const ParticipantAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);

  const isAuthenticated = !!(participant && session && new Date(session.expires_at) > new Date());

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Participant Firebase Auth state changed:', firebaseUser ? {
        uid: firebaseUser.uid,
        isAnonymous: firebaseUser.isAnonymous
      } : 'null');
      
      // Check for existing participant session in localStorage
      const storedParticipant = localStorage.getItem(STORAGE_KEYS.PARTICIPANT);
      const storedSession = localStorage.getItem(STORAGE_KEYS.SESSION);

      if (storedParticipant && storedSession) {
        try {
          const parsedParticipant = JSON.parse(storedParticipant);
          const parsedSession = JSON.parse(storedSession);
          
          // Check if session is still valid
          if (new Date(parsedSession.expires_at) > new Date()) {
            setParticipant(parsedParticipant);
            setSession(parsedSession);
            
            // If participant is logged in but no Firebase Auth session exists, create anonymous session
            if (!firebaseUser) {
              console.log('🔄 Participant session found but no Firebase Auth session. Creating anonymous session...');
              try {
                const credential = await signInAnonymously(auth);
                console.log('✅ Firebase Auth anonymous session created for participant:', {
                  uid: credential.user.uid,
                  isAnonymous: credential.user.isAnonymous
                });
                setFirebaseAuthReady(true);
              } catch (error: any) {
                console.error('❌ Failed to create Firebase Auth session for participant:', error);
                if (error.code === 'auth/operation-not-allowed') {
                  console.error('⚠️ Anonymous authentication is not enabled in Firebase Console!');
                  console.error('⚠️ Please enable it in Firebase Console > Authentication > Sign-in method > Anonymous');
                }
                setFirebaseAuthReady(false);
              }
            } else {
              console.log('✅ Firebase Auth session already exists for participant:', firebaseUser.uid);
              setFirebaseAuthReady(true);
            }
          } else {
            // Session expired, clear storage
            localStorage.removeItem(STORAGE_KEYS.PARTICIPANT);
            localStorage.removeItem(STORAGE_KEYS.SESSION);
            setFirebaseAuthReady(true);
          }
        } catch (error) {
          console.error('Error parsing stored participant data:', error);
          localStorage.removeItem(STORAGE_KEYS.PARTICIPANT);
          localStorage.removeItem(STORAGE_KEYS.SESSION);
          setFirebaseAuthReady(true);
        }
      } else {
        setFirebaseAuthReady(true);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (ticketCode: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log('🔐 Participant login attempt with ticket:', ticketCode);
      
      // Authenticate via Eventime API
      const result = await eventimeAPI.participantAuth(ticketCode);

      console.log('📥 API response:', {
        status: result.status,
        hasParticipant: !!result.participant,
        hasSession: !!result.session,
        error: result.error
      });

      if (!result.status || !result.participant || !result.session) {
        console.error('❌ Authentication failed:', {
          status: result.status,
          error: result.error,
          participant: result.participant,
          session: result.session
        });
        return false;
      }

      const apiParticipant = result.participant;
      const apiSession = result.session;

      console.log('✅ API authentication successful:', {
        participantId: apiParticipant.id,
        name: apiParticipant.name,
        email: apiParticipant.email,
        eventId: apiParticipant.event_id
      });

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
        console.log('🔐 Creating Firebase Auth anonymous session for participant...');
        const anonymousCredential = await signInAnonymously(auth);
        console.log('✅ Firebase Auth anonymous session created for participant:', {
          uid: anonymousCredential.user.uid,
          isAnonymous: anonymousCredential.user.isAnonymous
        });
        
        // Verify the session is active
        if (auth.currentUser) {
          console.log('✅ Firebase Auth session verified:', auth.currentUser.uid);
        } else {
          console.error('❌ Firebase Auth session not active after creation!');
        }
      } catch (firebaseAuthError: any) {
        console.error('❌ Could not create Firebase Auth session for participant:', firebaseAuthError);
        console.error('Error code:', firebaseAuthError.code);
        console.error('Error message:', firebaseAuthError.message);
        
        // Show user-friendly error
        if (firebaseAuthError.code === 'auth/operation-not-allowed') {
          console.error('⚠️ Anonymous authentication is not enabled in Firebase Console!');
          console.error('⚠️ Please enable it in Firebase Console > Authentication > Sign-in method > Anonymous');
          throw new Error('Authentification anonyme non activée. Veuillez contacter l\'administrateur.');
        }
        
        // Continue anyway, but Firestore access will likely fail
        throw new Error('Erreur lors de la création de la session. Veuillez réessayer.');
      }

      // Store participant in Firestore (sync from Eventime)
      const participantId = apiParticipant.id.toString();
      const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);
      
      console.log('💾 Saving participant to Firestore:', participantId);
      
      // Get existing balance if participant already exists
      let existingBalance = 0;
      try {
        const existingDoc = await getDoc(participantRef);
        if (existingDoc.exists()) {
          existingBalance = existingDoc.data().balance || 0;
          console.log('📊 Existing balance found:', existingBalance);
        }
      } catch (e) {
        console.warn('⚠️ Could not check existing participant:', e);
      }
      
      await setDoc(participantRef, {
        id: apiParticipant.id,
        name: apiParticipant.name,
        email: apiParticipant.email || '',
        balance: existingBalance || apiParticipant.balance || 0, // Preserve existing balance
        event_id: apiParticipant.event_id.toString(),
        qr_code: apiParticipant.qr_code,
        status: 'active',
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      }, { merge: true });
      
      console.log('✅ Participant saved to Firestore');

      const newParticipant: Participant = {
        id: participantId,
        name: apiParticipant.name,
        email: apiParticipant.email || '',
        balance: apiParticipant.balance || 0,
        event_id: apiParticipant.event_id.toString(),
        qr_code: apiParticipant.qr_code
      };

      const newSession: ParticipantSession = {
        token: apiSession.token,
        expires_at: apiSession.expires_at
      };

      setParticipant(newParticipant);
      setSession(newSession);

      // Store in localStorage
      localStorage.setItem(STORAGE_KEYS.PARTICIPANT, JSON.stringify(newParticipant));
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession));

      console.log('✅ Participant login successful');
      return true;
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setParticipant(null);
    setSession(null);
    localStorage.removeItem(STORAGE_KEYS.PARTICIPANT);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    
    // Sign out from Firebase Auth
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
        console.log('✅ Participant signed out from Firebase Auth');
      }
    } catch (error) {
      console.error('Error signing out from Firebase Auth:', error);
    }
  };

  const refreshParticipant = async () => {
    if (!participant || !session) return;

    try {
      console.log('Refreshing participant data for ID:', participant.id);
      
      // Try to get from Firestore first (faster)
      const participantDoc = await getDoc(doc(db, COLLECTIONS.PARTICIPANTS, participant.id));

      if (participantDoc.exists()) {
        const data = participantDoc.data();
        console.log('Updated participant balance:', data.balance);
        
        const updatedParticipant: Participant = {
          ...participant,
          name: data.name,
          email: data.email || '',
          balance: data.balance || 0,
          event_id: data.event_id,
          qr_code: data.qr_code
        };
        
        setParticipant(updatedParticipant);
        localStorage.setItem(STORAGE_KEYS.PARTICIPANT, JSON.stringify(updatedParticipant));
      } else {
        // If not in Firestore, could re-authenticate via Eventime API
        console.warn('Participant not found in Firestore, may need to re-authenticate');
      }
    } catch (error) {
      console.error('Error refreshing participant data:', error);
    }
  };

  return (
    <ParticipantAuthContext.Provider
      value={{
        participant,
        session,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshParticipant,
      }}
    >
      {children}
    </ParticipantAuthContext.Provider>
  );
};

export const useParticipantAuth = () => {
  const context = useContext(ParticipantAuthContext);
  if (context === undefined) {
    throw new Error('useParticipantAuth must be used within a ParticipantAuthProvider');
  }
  return context;
};
