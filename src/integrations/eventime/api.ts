// Service API Eventime
// Ce service gère les appels à l'API Eventime externe

// En développement, utiliser le proxy Vite pour contourner CORS
// En production, utiliser l'URL directe
const isDevelopment = import.meta.env.DEV;
const EVENTIME_API_BASE_URL = isDevelopment 
  ? '/api/eventime'  // Utilise le proxy Vite en développement
  : (import.meta.env.VITE_EVENTIME_API_URL || 'https://eventime.ga/api/cashless');

// Log the API URL on initialization (for debugging)
if (typeof window !== 'undefined') {
  console.log('🌐 Eventime API Base URL:', EVENTIME_API_BASE_URL);
  console.log('🌐 Environment:', isDevelopment ? 'Development (using proxy)' : 'Production');
  console.log('🌐 Environment variable:', import.meta.env.VITE_EVENTIME_API_URL || 'Using default');
}

export interface EventimeEvent {
  event_id: number;
  event_ref: string;
  organizer_id: number;
  userIdentifier: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_sale_date: string | null;
  end_sale_date: string | null;
  fuseauHoraire: string;
  location: string;
  countrie: string;
  category: number;
  capacity: number | null;
  image: string | null;
  image2: string | null;
  image3: string | null;
  refund_policy: string | null;
  is_canceled: number;
  reasons_canceled: string | null;
  status: string;
  scan_date: number;
  isSponsored: number | null;
  view_generated: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EventimeAdminAuth {
  status: boolean;
  message?: string;
  user?: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
  };
  error?: string;
}

export interface EventimeTicketScan {
  status: boolean;
  ticket?: {
    ticket_item_id: number;
    ticketNumber: string;
    civility_buyer: string;
    buyerName: string;
    civility_participant: string;
    participantName: string;
    participantLastname: string;
    participantEmailAddress: string;
    participantTelephone: string | null;
    participantMatricule: string | null;
    event_id: number;
    status: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  error?: string;
}

export interface EventimeParticipantAuth {
  status: boolean;
  participant?: {
    id: number;
    name: string;
    email: string;
    balance: number;
    event_id: number;
    qr_code: string;
  };
  session?: {
    token: string;
    expires_at: string;
  };
  error?: string;
}

export interface EventimeMobilePaymentInit {
  success: boolean;
  message: string;
  data?: {
    bill_id: string;
    reference: string;
    amount: string;
    status: 'pending' | 'confirmed' | 'failed';
  };
  error?: string;
}

export interface EventimePaymentStatus {
  success: boolean;
  message: string;
}

class EventimeAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = EVENTIME_API_BASE_URL;
  }

  /**
   * Authentification admin/organisateur via API Eventime
   * POST /api/cashless/login
   */
  async adminLogin(email: string, password: string): Promise<EventimeAdminAuth> {
    try {
      const url = `${this.baseURL}/login`;
      console.log('🔐 Admin login attempt:', { url, email });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Login response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Eventime API admin login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion à l\'API Eventime';
      return {
        status: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Récupérer la liste des événements depuis l'API Eventime
   * GET /api/cashless/evenements/{organizer_id}
   */
  async getEvents(organizerId: number): Promise<{ status: boolean; events?: EventimeEvent[]; error?: string }> {
    try {
      const url = `${this.baseURL}/evenements/${organizerId}`;
      console.log('📅 Fetching events for organizer:', organizerId);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('📡 Events response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Events response:', data);
      return data;
    } catch (error) {
      console.error('❌ Eventime API get events error:', error);
      return {
        status: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des événements',
      };
    }
  }

  /**
   * Scanner un ticket (QR code) via API Eventime
   * GET /api/cashless/scan/{ticket_code}
   */
  async scanTicket(ticketCode: string): Promise<EventimeTicketScan> {
    try {
      // Clean ticket code (remove whitespace, keep all characters including dots and underscores)
      const cleanTicketCode = ticketCode.trim();
      
      // Try different URL encoding approaches
      // Some APIs might expect the ticket code as-is, others need encoding
      // We'll try with encoding first (standard approach)
      const encodedTicketCode = encodeURIComponent(cleanTicketCode);
      
      // Build URL - try with encoded version first
      const url = `${this.baseURL}/scan/${encodedTicketCode}`;
      
      console.log('🎫 Scanning ticket:', {
        original: ticketCode,
        cleaned: cleanTicketCode,
        encoded: encodedTicketCode,
        url: url,
        baseURL: this.baseURL,
        ticketLength: cleanTicketCode.length
      });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('📡 Scan response status:', response.status);
      console.log('📡 Scan response headers:', {
        contentType: response.headers.get('content-type'),
        statusText: response.statusText
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('❌ HTTP error response:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
            url: url
          });
          
          // Try to parse as JSON for better error message
          try {
            const errorJson = JSON.parse(errorText);
            const errorMessage = errorJson.error || errorJson.message || errorJson.detail || `HTTP ${response.status}`;
            console.error('❌ Parsed error:', errorMessage);
            return {
              status: false,
              error: errorMessage,
            };
          } catch {
            // Not JSON, use text as is
            console.error('❌ Error response is not JSON');
          }
        } catch (e) {
          console.error('❌ Could not read error response:', e);
        }
        
        // If 404, try without encoding (some APIs might not expect encoding for ticket codes)
        if (response.status === 404) {
          console.log('🔄 404 error, trying without URL encoding...');
          const urlWithoutEncoding = `${this.baseURL}/scan/${cleanTicketCode}`;
          console.log('🔄 Trying URL without encoding:', urlWithoutEncoding);
          
          try {
            const retryResponse = await fetch(urlWithoutEncoding, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              console.log('✅ Retry successful with unencoded URL');
              return retryData;
            } else {
              console.error('❌ Retry also failed:', retryResponse.status);
            }
          } catch (retryError) {
            console.error('❌ Retry error:', retryError);
          }
        }
        
        return {
          status: false,
          error: `Erreur HTTP ${response.status}: ${errorText || response.statusText || 'Ticket non trouvé'}`,
        };
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Response is not JSON:', text);
        return {
          status: false,
          error: 'Réponse invalide de l\'API (format non-JSON)',
        };
      }

      const data = await response.json();
      console.log('✅ Scan response data:', data);
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        console.error('❌ Invalid response structure:', data);
        return {
          status: false,
          error: 'Format de réponse invalide',
        };
      }
      
      return data;
    } catch (error) {
      console.error('❌ Eventime API scan ticket error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          status: false,
          error: 'Erreur de connexion à l\'API. Vérifiez votre connexion internet.',
        };
      }
      return {
        status: false,
        error: error instanceof Error ? error.message : 'Erreur lors du scan du ticket',
      };
    }
  }

  /**
   * Authentification participant via scan de ticket
   * Utilise scanTicket et convertit en format participant
   */
  async participantAuth(ticketCode: string): Promise<EventimeParticipantAuth> {
    try {
      console.log('🔐 Starting participant authentication for ticket:', ticketCode);
      
      const scanResult = await this.scanTicket(ticketCode);

      console.log('📋 Scan result:', {
        status: scanResult.status,
        hasTicket: !!scanResult.ticket,
        error: scanResult.error
      });

      if (!scanResult.status || !scanResult.ticket) {
        console.error('❌ Scan failed:', scanResult.error);
        return {
          status: false,
          error: scanResult.error || 'Ticket non trouvé ou invalide',
        };
      }

      const ticket = scanResult.ticket;
      
      console.log('🎫 Ticket data:', {
        ticket_item_id: ticket.ticket_item_id,
        ticketNumber: ticket.ticketNumber,
        participantName: ticket.participantName,
        participantLastname: ticket.participantLastname,
        event_id: ticket.event_id,
        status: ticket.status
      });
      
      // Vérifier que le ticket est valide (status devrait être 1 pour actif)
      // ticket.status est un number (0 = inactif, 1 = actif)
      if (ticket.status !== 1) {
        console.warn('⚠️ Ticket status is not active:', ticket.status);
        // On continue quand même, mais on log un avertissement
      }
      
      // Construire le nom complet du participant
      const participantName = `${ticket.participantName || ''} ${ticket.participantLastname || ''}`.trim();
      
      if (!participantName) {
        console.error('❌ Participant name is empty');
        return {
          status: false,
          error: 'Nom du participant manquant dans le ticket',
        };
      }
      
      // Générer un token de session (24h)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const authResult = {
        status: true,
        participant: {
          id: ticket.ticket_item_id,
          name: participantName,
          email: ticket.participantEmailAddress || '',
          balance: 0, // Le solde sera récupéré depuis Firestore
          event_id: ticket.event_id,
          qr_code: ticket.ticketNumber,
        },
        session: {
          token: sessionToken,
          expires_at: expiresAt.toISOString(),
        },
      };
      
      console.log('✅ Participant auth successful:', {
        participantId: authResult.participant.id,
        name: authResult.participant.name,
        eventId: authResult.participant.event_id
      });

      return authResult;
    } catch (error) {
      console.error('❌ Eventime API participant auth error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      return {
        status: false,
        error: error instanceof Error ? error.message : 'Erreur d\'authentification',
      };
    }
  }

  /**
   * Initier un paiement mobile via API Eventime
   * POST /api/cashless/initier-paiement
   */
  async initiateMobilePayment(paymentData: {
    msisdn: string; // Format: 06XXXXXXXX ou 07XXXXXXXX
    amount: number; // Min: 100
    email: string;
    firstname: string;
    lastname: string;
    description: string;
    reference: string;
    payment_system: 'airtelmoney' | 'moovmoney4';
  }): Promise<EventimeMobilePaymentInit> {
    try {
      const url = `${this.baseURL}/initier-paiement`;
      console.log('💳 Initiating mobile payment:', { url, msisdn: paymentData.msisdn, amount: paymentData.amount });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      console.log('📡 Payment initiation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Payment initiation response:', data);
      return data;
    } catch (error) {
      console.error('❌ Eventime API initiate payment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de l\'initiation du paiement',
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement mobile
   * GET /api/cashless/etat-paiement/{bill_id}
   */
  async checkPaymentStatus(billId: string): Promise<EventimePaymentStatus> {
    try {
      const url = `${this.baseURL}/etat-paiement/${billId}`;
      console.log('🔍 Checking payment status:', billId);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('📡 Payment status response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Payment status response:', data);
      return data;
    } catch (error) {
      console.error('❌ Eventime API check payment status error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la vérification du paiement',
      };
    }
  }
}

export const eventimeAPI = new EventimeAPI();
