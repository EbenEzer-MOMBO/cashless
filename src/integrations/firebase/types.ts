// Types pour les collections Firestore

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AgentRole = "recharge" | "vente";

export interface Agent {
  id: string;
  active: boolean | null;
  created_at: Date | null;
  email: string;
  event_id: string;
  last_activity: Date | null;
  name: string;
  password_changed: boolean | null;
  role: AgentRole;
  temporary_password: string | null;
  total_sales: number | null;
  updated_at: Date | null;
  user_id: string;
}

export interface Event {
  id: string;
  created_at: Date | null;
  description: string | null;
  end_date: Date | null;
  external_id: string | null;
  location: string | null;
  name: string;
  start_date: Date | null;
  status: string | null;
  updated_at: Date | null;
}

export interface EventimeEvent {
  id: string;
  created_at: Date | null;
  description: string | null;
  end_date: Date | null;
  external_id: number;
  location: string | null;
  name: string;
  organizer_id: number | null;
  start_date: Date | null;
  status: string | null;
  updated_at: Date | null;
}

export interface MobilePayment {
  id: string;
  amount: number;
  bill_id: string | null;
  confirmed_at: Date | null;
  created_at: Date;
  description: string;
  email: string;
  event_id: string;
  firstname: string;
  lastname: string;
  msisdn: string;
  participant_id: string;
  payment_system: string;
  raw_request: Json | null;
  raw_response: Json | null;
  reference: string;
  status: string;
  transaction_id: string | null;
  updated_at: Date;
}

export interface ParticipantSession {
  id: string;
  created_at: Date;
  expires_at: Date;
  is_active: boolean | null;
  last_activity: Date | null;
  participant_id: string;
  session_token: string;
  ticket_code: string;
}

export interface Participant {
  id: string;
  balance: number;
  buyer_name: string | null;
  civility_buyer: string | null;
  civility_participant: string | null;
  created_at: Date;
  email: string | null;
  event_id: string;
  eventime_created_at: Date | null;
  eventime_status: number | null;
  eventime_updated_at: Date | null;
  last_sync: Date | null;
  name: string;
  participant_email: string | null;
  participant_lastname: string | null;
  participant_matricule: string | null;
  participant_name: string | null;
  participant_telephone: string | null;
  qr_code: string;
  status: string;
  ticket_item_id: number | null;
  ticket_number: string | null;
  updated_at: Date;
}

export interface ProductAssignment {
  id: string;
  agent_id: string;
  created_at: Date;
  event_id: string;
  product_id: string;
  updated_at: Date;
}

export interface Product {
  id: string;
  active: boolean;
  created_at: Date;
  event_id: string;
  name: string;
  price: number;
  stock: number;
  updated_at: Date;
}

export interface Profile {
  id: string;
  created_at: Date | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
  updated_at: Date | null;
  user_id: string;
}

export interface SystemSettings {
  id: string;
  auto_logout_minutes: number;
  created_at: Date;
  email_notifications: boolean;
  maintenance_mode: boolean;
  sms_notifications: boolean;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  agent_id: string | null;
  amount: number;
  created_at: Date;
  event_id: string;
  participant_id: string;
  product_id: string | null;
  source: string;
  status: string;
  type: string;
  updated_at: Date;
}

// Collections Firestore
export const COLLECTIONS = {
  AGENTS: 'agents',
  EVENTS: 'events',
  EVENTIME_EVENTS: 'eventime_events',
  MOBILE_PAYMENTS: 'mobile_payments',
  PARTICIPANT_SESSIONS: 'participant_sessions',
  PARTICIPANTS: 'participants',
  PRODUCT_ASSIGNMENTS: 'product_assignments',
  PRODUCTS: 'products',
  PROFILES: 'profiles',
  SYSTEM_SETTINGS: 'system_settings',
  TRANSACTIONS: 'transactions',
} as const;


