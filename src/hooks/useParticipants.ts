import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Participant {
  id: number;
  name: string;
  email: string;
  balance: number;
  eventId: number;
  eventName: string;
  qrCode: string;
  status: string;
  ticketNumber?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastSync?: string;
}

export const useParticipants = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour charger les participants depuis la base de données
  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          name,
          email,
          balance,
          event_id,
          qr_code,
          status,
          ticket_number,
          participant_telephone,
          created_at,
          updated_at,
          last_sync,
          events!inner(
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const participantsData: Participant[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email || '',
        balance: p.balance || 0,
        eventId: p.event_id,
        eventName: p.events?.name || '',
        qrCode: p.qr_code,
        status: p.status,
        ticketNumber: p.ticket_number,
        phone: p.participant_telephone,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        lastSync: p.last_sync,
      }));
      
      setParticipants(participantsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des participants');
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour filtrer les participants
  const getFilteredParticipants = (eventFilter: string, statusFilter: string) => {
    return participants.filter(participant => {
      const eventMatch = eventFilter === "all" || participant.eventId.toString() === eventFilter;
      const statusMatch = statusFilter === "all" || participant.status === statusFilter;
      return eventMatch && statusMatch;
    });
  };

  // Statistiques calculées
  const getStats = () => {
    const totalParticipants = participants.length;
    const totalBalance = participants.reduce((sum, p) => sum + p.balance, 0);
    const activeParticipants = participants.filter(p => p.status === 'active').length;
    
    // Participants par événement
    const eventStats = participants.reduce((acc, p) => {
      if (!acc[p.eventName]) {
        acc[p.eventName] = { count: 0, balance: 0 };
      }
      acc[p.eventName].count++;
      acc[p.eventName].balance += p.balance;
      return acc;
    }, {} as Record<string, { count: number; balance: number }>);
    
    return {
      totalParticipants,
      totalBalance,
      activeParticipants,
      eventStats
    };
  };

  // Obtenir la liste des événements uniques
  const getEvents = () => {
    const events = participants.reduce((acc, p) => {
      if (!acc.find(e => e.id === p.eventId)) {
        acc.push({ id: p.eventId, name: p.eventName });
      }
      return acc;
    }, [] as { id: number; name: string }[]);
    return events.sort((a, b) => a.name.localeCompare(b.name));
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  return {
    participants,
    loading,
    error,
    getFilteredParticipants,
    getStats,
    getEvents,
    refetch: loadParticipants
  };
};