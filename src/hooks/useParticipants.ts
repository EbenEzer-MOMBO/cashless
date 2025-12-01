import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/config';
import { 
  collection, 
  query, 
  getDocs,
  orderBy,
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { COLLECTIONS } from '@/integrations/firebase/types';
import { eventimeAPI } from '@/integrations/eventime/api';

export interface Participant {
  id: string;
  name: string;
  email: string;
  balance: number;
  eventId: string;
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

  // Fonction pour charger les participants depuis Firestore
  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
      const q = query(participantsRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const participantsData: Participant[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const p = docSnapshot.data();
        
        // Get event name
        let eventName = '';
        if (p.event_id) {
          const eventDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, p.event_id));
          if (eventDoc.exists()) {
            eventName = eventDoc.data().name || '';
          }
        }
        
        participantsData.push({
          id: docSnapshot.id,
          name: p.name,
          email: p.email || '',
          balance: p.balance || 0,
          eventId: p.event_id,
          eventName: eventName,
          qrCode: p.qr_code,
          status: p.status,
          ticketNumber: p.ticket_number,
          phone: p.participant_telephone,
          createdAt: p.created_at?.toDate?.()?.toISOString() || p.created_at,
          updatedAt: p.updated_at?.toDate?.()?.toISOString() || p.updated_at,
          lastSync: p.last_sync?.toDate?.()?.toISOString() || p.last_sync,
        });
      }
      
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
      const eventMatch = eventFilter === "all" || participant.eventId === eventFilter;
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
    }, [] as { id: string; name: string }[]);
    return events.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Fonction pour rechercher un participant par ticket (QR code) via API Eventime
  const searchParticipantByTicket = async (ticketCode: string): Promise<Participant | null> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Searching participant by ticket:', ticketCode);
      
      // Scanner le ticket via API Eventime
      const scanResult = await eventimeAPI.scanTicket(ticketCode);
      
      if (!scanResult.status || !scanResult.ticket) {
        throw new Error(scanResult.error || 'Ticket non trouvé');
      }
      
      const ticket = scanResult.ticket;
      
      // Construire le nom complet
      const participantName = `${ticket.participantName} ${ticket.participantLastname}`.trim();
      
      // Récupérer le nom de l'événement depuis Firestore ou utiliser l'ID
      let eventName = '';
      if (ticket.event_id) {
        try {
          const eventDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, ticket.event_id.toString()));
          if (eventDoc.exists()) {
            eventName = eventDoc.data().name || '';
          }
        } catch (e) {
          console.warn('Could not fetch event name:', e);
        }
      }
      
      // Vérifier si le participant existe déjà dans Firestore
      const participantId = ticket.ticket_item_id.toString();
      const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, participantId);
      const participantDoc = await getDoc(participantRef);
      
      // Créer ou mettre à jour le participant dans Firestore
      const participantData = {
        id: ticket.ticket_item_id,
        name: participantName,
        email: ticket.participantEmailAddress || '',
        balance: 0, // Le solde sera mis à jour lors des transactions
        event_id: ticket.event_id.toString(),
        qr_code: ticket.ticketNumber,
        ticket_number: ticket.ticketNumber,
        participant_telephone: ticket.participantTelephone || null,
        status: 'active',
        created_at: participantDoc.exists() 
          ? participantDoc.data().created_at 
          : Timestamp.now(),
        updated_at: Timestamp.now(),
        last_sync: Timestamp.now()
      };
      
      await setDoc(participantRef, participantData, { merge: true });
      
      const participant: Participant = {
        id: participantId,
        name: participantName,
        email: ticket.participantEmailAddress || '',
        balance: participantDoc.exists() ? (participantDoc.data().balance || 0) : 0,
        eventId: ticket.event_id.toString(),
        eventName: eventName,
        qrCode: ticket.ticketNumber,
        status: 'active',
        ticketNumber: ticket.ticketNumber,
        phone: ticket.participantTelephone || undefined,
        createdAt: participantDoc.exists() 
          ? (participantDoc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString())
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSync: new Date().toISOString()
      };
      
      // Recharger la liste des participants
      await loadParticipants();
      
      console.log('✅ Participant found and synced:', participant);
      return participant;
    } catch (err) {
      console.error('❌ Error searching participant:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche du participant');
      return null;
    } finally {
      setLoading(false);
    }
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
    refetch: loadParticipants,
    searchParticipantByTicket
  };
};
