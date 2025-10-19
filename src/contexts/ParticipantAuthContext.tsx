import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: number;
  name: string;
  email: string;
  balance: number;
  event_id: number;
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

  const isAuthenticated = !!(participant && session && new Date(session.expires_at) > new Date());

  // Load stored data on mount
  useEffect(() => {
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
        } else {
          // Session expired, clear storage
          localStorage.removeItem(STORAGE_KEYS.PARTICIPANT);
          localStorage.removeItem(STORAGE_KEYS.SESSION);
        }
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem(STORAGE_KEYS.PARTICIPANT);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (ticketCode: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('participant-auth', {
        body: { ticketCode }
      });

      if (error) {
        console.error('Authentication error:', error);
        return false;
      }

      if (!data.status) {
        console.error('Authentication failed:', data.error);
        return false;
      }

      const newParticipant = data.participant;
      const newSession = data.session;

      setParticipant(newParticipant);
      setSession(newSession);

      // Store in localStorage
      localStorage.setItem(STORAGE_KEYS.PARTICIPANT, JSON.stringify(newParticipant));
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession));

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setParticipant(null);
    setSession(null);
    localStorage.removeItem(STORAGE_KEYS.PARTICIPANT);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  };

  const refreshParticipant = async () => {
    if (!participant || !session) return;

    try {
      console.log('Refreshing participant data for ID:', participant.id);
      
      const { data, error } = await supabase
        .from('participants')
        .select('id, name, email, balance, event_id, qr_code')
        .eq('id', participant.id)
        .maybeSingle();

      if (error) {
        console.error('Error refreshing participant:', error);
        return;
      }

      if (!data) {
        console.warn('No participant data found for ID:', participant.id);
        return;
      }

      console.log('Updated participant balance:', data.balance);
      const updatedParticipant = { ...participant, ...data };
      setParticipant(updatedParticipant);
      localStorage.setItem(STORAGE_KEYS.PARTICIPANT, JSON.stringify(updatedParticipant));
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