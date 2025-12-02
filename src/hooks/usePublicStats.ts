import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';

export interface PublicStats {
  totalEvents: number;
  activeEvents: number;
  totalParticipants: number;
  totalTransactions: number;
}

export const usePublicStats = () => {
  const [stats, setStats] = useState<PublicStats>({
    totalEvents: 0,
    activeEvents: 0,
    totalParticipants: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPublicStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Charger les événements (lecture seule, devrait fonctionner avec les règles Firestore)
        const eventsRef = collection(db, COLLECTIONS.EVENTS);
        const eventsSnapshot = await getDocs(eventsRef);
        const allEvents = eventsSnapshot.docs.map(doc => doc.data());
        
        const now = new Date();
        const activeEvents = allEvents.filter(event => {
          if (event.status === 'cancelled' || event.status === 'completed') return false;
          const startDate = event.start_date?.toDate?.() || new Date(event.start_date);
          const endDate = event.end_date?.toDate?.() || new Date(event.end_date);
          return now >= startDate && now <= endDate;
        }).length;

        // Charger les participants
        const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
        const participantsSnapshot = await getDocs(participantsRef);
        const totalParticipants = participantsSnapshot.size;

        // Charger les transactions
        const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
        const transactionsSnapshot = await getDocs(transactionsRef);
        const totalTransactions = transactionsSnapshot.size;

        setStats({
          totalEvents: allEvents.length,
          activeEvents,
          totalParticipants,
          totalTransactions,
        });
      } catch (err) {
        console.error('Error loading public stats:', err);
        // Ne pas afficher d'erreur pour les stats publiques, utiliser des valeurs par défaut
        setError(null);
        setStats({
          totalEvents: 0,
          activeEvents: 0,
          totalParticipants: 0,
          totalTransactions: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadPublicStats();
  }, []);

  return { stats, loading, error };
};

