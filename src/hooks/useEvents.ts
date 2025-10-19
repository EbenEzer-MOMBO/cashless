import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export interface Event {
  id: number;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  participantsCount: number;
  agentsCount: number;
  productsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventFormData {
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
}

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAdminAuth();

  // Helper function to calculate event status
  const calculateEventStatus = (apiEvent: any): Event['status'] => {
    if (apiEvent.is_canceled === 1) return 'cancelled';
    
    const now = new Date();
    const startDate = new Date(apiEvent.start_date);
    const endDate = new Date(apiEvent.end_date);
    
    if (now < startDate) return 'planned';
    if (now >= startDate && now <= endDate) return 'active';
    return 'completed';
  };

  // Helper function to map API event to local Event type
  const mapApiEventToEvent = (apiEvent: any): Event => ({
    id: apiEvent.event_id,
    name: apiEvent.title,
    description: apiEvent.description,
    location: apiEvent.location,
    startDate: apiEvent.start_date,
    endDate: apiEvent.end_date,
    status: calculateEventStatus(apiEvent),
    participantsCount: 0, // Placeholder - would need separate API call
    agentsCount: 0, // Placeholder - would need separate API call  
    productsCount: 0, // Placeholder - would need separate API call
    createdAt: apiEvent.created_at,
    updatedAt: apiEvent.updated_at
  });

  // Fonction pour charger les événements depuis l'API externe avec gestion d'erreur améliorée
  const loadEvents = async () => {
    if (!user?.id) {
      setLoading(false);
      setEvents([]); // Clear events when no user
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Timeout for the request to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La requête a pris trop de temps')), 10000)
      );

      const requestPromise = supabase.functions.invoke('events-list', {
        body: { organizerId: user.id }
      });

      const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Erreur API: ${error.message || 'Erreur inconnue'}`);
      }

      // Handle different response formats gracefully
      if (!data) {
        console.warn('No data received from events API');
        setEvents([]);
        return;
      }

      if (data.status === false) {
        const errorMsg = data.error || 'Erreur lors de la récupération des événements';
        console.error('API returned error status:', errorMsg);
        throw new Error(errorMsg);
      }

      if (data.status === true && Array.isArray(data.events)) {
        try {
          const mappedEvents = data.events.map(mapApiEventToEvent);
          setEvents(mappedEvents);
        } catch (mappingError) {
          console.error('Error mapping events:', mappingError);
          setEvents([]); // Set empty array instead of throwing
          setError('Erreur lors du traitement des données d\'événements');
        }
      } else {
        console.warn('Unexpected data format:', data);
        setEvents([]);
      }
    } catch (err) {
      console.error('Error loading events:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des événements';
      setError(errorMessage);
      setEvents([]); // Always set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour créer un événement (non supportée pour l'API externe)
  const createEvent = async (eventData: EventFormData): Promise<Event | null> => {
    setError('La création d\'événements n\'est pas encore supportée avec l\'API externe');
    return null;
  };

  // Fonction pour mettre à jour un événement (non supportée pour l'API externe)
  const updateEvent = async (id: number, eventData: EventFormData): Promise<boolean> => {
    setError('La modification d\'événements n\'est pas encore supportée avec l\'API externe');
    return false;
  };

  // Fonction pour supprimer un événement (non supportée pour l'API externe)
  const deleteEvent = async (id: number): Promise<boolean> => {
    setError('La suppression d\'événements n\'est pas encore supportée avec l\'API externe');
    return false;
  };

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id]);

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: loadEvents
  };
};