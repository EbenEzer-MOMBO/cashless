import { useState, useEffect } from 'react';
import { eventimeAPI } from '@/integrations/eventime/api';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export interface Event {
  id: string;
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
  externalId?: number; // ID from Eventime API
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
    id: apiEvent.event_id.toString(),
    name: apiEvent.title,
    description: apiEvent.description || '',
    location: apiEvent.location || '',
    startDate: apiEvent.start_date,
    endDate: apiEvent.end_date,
    status: calculateEventStatus(apiEvent),
    participantsCount: 0, // Will be calculated from Firestore
    agentsCount: 0, // Will be calculated from Firestore
    productsCount: 0, // Will be calculated from Firestore
    createdAt: apiEvent.created_at,
    updatedAt: apiEvent.updated_at,
    externalId: apiEvent.event_id
  });

  // Fonction pour charger les événements depuis l'API Eventime
  const loadEvents = async () => {
    if (!user?.id) {
      setLoading(false);
      setEvents([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Timeout for the request to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La requête a pris trop de temps')), 10000)
      );

      const requestPromise = eventimeAPI.getEvents(user.id);

      const result = await Promise.race([requestPromise, timeoutPromise]) as any;

      if (!result.status) {
        const errorMsg = result.error || 'Erreur lors de la récupération des événements';
        console.error('API returned error status:', errorMsg);
        throw new Error(errorMsg);
      }

      if (result.status === true && Array.isArray(result.events)) {
        try {
          const mappedEvents = result.events.map(mapApiEventToEvent);
          setEvents(mappedEvents);
        } catch (mappingError) {
          console.error('Error mapping events:', mappingError);
          setEvents([]);
          setError('Erreur lors du traitement des données d\'événements');
        }
      } else {
        console.warn('Unexpected data format:', result);
        setEvents([]);
      }
    } catch (err) {
      console.error('Error loading events:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des événements';
      setError(errorMessage);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour créer un événement (non supportée - doit être fait via Eventime)
  const createEvent = async (eventData: EventFormData): Promise<Event | null> => {
    setError('La création d\'événements doit être faite via la plateforme Eventime (https://eventime.ga/)');
    return null;
  };

  // Fonction pour mettre à jour un événement (non supportée - doit être fait via Eventime)
  const updateEvent = async (id: string, eventData: EventFormData): Promise<boolean> => {
    setError('La modification d\'événements doit être faite via la plateforme Eventime (https://eventime.ga/)');
    return false;
  };

  // Fonction pour supprimer un événement (non supportée - doit être fait via Eventime)
  const deleteEvent = async (id: string): Promise<boolean> => {
    setError('La suppression d\'événements doit être faite via la plateforme Eventime (https://eventime.ga/)');
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
