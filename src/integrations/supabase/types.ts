export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          event_id: number
          id: number
          last_activity: string | null
          name: string
          password_changed: boolean | null
          role: Database["public"]["Enums"]["agent_role"]
          temporary_password: string | null
          total_sales: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          event_id: number
          id?: number
          last_activity?: string | null
          name: string
          password_changed?: boolean | null
          role: Database["public"]["Enums"]["agent_role"]
          temporary_password?: string | null
          total_sales?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          event_id?: number
          id?: number
          last_activity?: string | null
          name?: string
          password_changed?: boolean | null
          role?: Database["public"]["Enums"]["agent_role"]
          temporary_password?: string | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      eventime_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          external_id: number
          id: number
          location: string | null
          name: string
          organizer_id: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          external_id: number
          id?: number
          location?: string | null
          name: string
          organizer_id?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          external_id?: number
          id?: number
          location?: string | null
          name?: string
          organizer_id?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          external_id: string | null
          id: number
          location: string | null
          name: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          external_id?: string | null
          id?: number
          location?: string | null
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          external_id?: string | null
          id?: number
          location?: string | null
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mobile_payments: {
        Row: {
          amount: number
          bill_id: string | null
          confirmed_at: string | null
          created_at: string
          description: string
          email: string
          event_id: number
          firstname: string
          id: string
          lastname: string
          msisdn: string
          participant_id: number
          payment_system: string
          raw_request: Json | null
          raw_response: Json | null
          reference: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          description: string
          email: string
          event_id: number
          firstname: string
          id?: string
          lastname: string
          msisdn: string
          participant_id: number
          payment_system: string
          raw_request?: Json | null
          raw_response?: Json | null
          reference: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          description?: string
          email?: string
          event_id?: number
          firstname?: string
          id?: string
          lastname?: string
          msisdn?: string
          participant_id?: number
          payment_system?: string
          raw_request?: Json | null
          raw_response?: Json | null
          reference?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      participant_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean | null
          last_activity: string | null
          participant_id: number
          session_token: string
          ticket_code: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          participant_id: number
          session_token: string
          ticket_code: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          participant_id?: number
          session_token?: string
          ticket_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          balance: number
          buyer_name: string | null
          civility_buyer: string | null
          civility_participant: string | null
          created_at: string
          email: string | null
          event_id: number
          eventime_created_at: string | null
          eventime_status: number | null
          eventime_updated_at: string | null
          id: number
          last_sync: string | null
          name: string
          participant_email: string | null
          participant_lastname: string | null
          participant_matricule: string | null
          participant_name: string | null
          participant_telephone: string | null
          qr_code: string
          status: string
          ticket_item_id: number | null
          ticket_number: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          buyer_name?: string | null
          civility_buyer?: string | null
          civility_participant?: string | null
          created_at?: string
          email?: string | null
          event_id: number
          eventime_created_at?: string | null
          eventime_status?: number | null
          eventime_updated_at?: string | null
          id?: number
          last_sync?: string | null
          name: string
          participant_email?: string | null
          participant_lastname?: string | null
          participant_matricule?: string | null
          participant_name?: string | null
          participant_telephone?: string | null
          qr_code: string
          status?: string
          ticket_item_id?: number | null
          ticket_number?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          buyer_name?: string | null
          civility_buyer?: string | null
          civility_participant?: string | null
          created_at?: string
          email?: string | null
          event_id?: number
          eventime_created_at?: string | null
          eventime_status?: number | null
          eventime_updated_at?: string | null
          id?: number
          last_sync?: string | null
          name?: string
          participant_email?: string | null
          participant_lastname?: string | null
          participant_matricule?: string | null
          participant_name?: string | null
          participant_telephone?: string | null
          qr_code?: string
          status?: string
          ticket_item_id?: number | null
          ticket_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assignments: {
        Row: {
          agent_id: number
          created_at: string
          event_id: number
          id: number
          product_id: number
          updated_at: string
        }
        Insert: {
          agent_id: number
          created_at?: string
          event_id: number
          id?: never
          product_id: number
          updated_at?: string
        }
        Update: {
          agent_id?: number
          created_at?: string
          event_id?: number
          id?: never
          product_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          event_id: number
          id: number
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          event_id: number
          id?: number
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          event_id?: number
          id?: number
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          auto_logout_minutes: number
          created_at: string
          email_notifications: boolean
          id: string
          maintenance_mode: boolean
          sms_notifications: boolean
          updated_at: string
        }
        Insert: {
          auto_logout_minutes?: number
          created_at?: string
          email_notifications?: boolean
          id?: string
          maintenance_mode?: boolean
          sms_notifications?: boolean
          updated_at?: string
        }
        Update: {
          auto_logout_minutes?: number
          created_at?: string
          email_notifications?: boolean
          id?: string
          maintenance_mode?: boolean
          sms_notifications?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          agent_id: number | null
          amount: number
          created_at: string
          event_id: number
          id: string
          participant_id: number
          product_id: number | null
          source: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          agent_id?: number | null
          amount: number
          created_at?: string
          event_id: number
          id?: string
          participant_id: number
          product_id?: number | null
          source?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          agent_id?: number | null
          amount?: number
          created_at?: string
          event_id?: number
          id?: string
          participant_id?: number
          product_id?: number | null
          source?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_agent_id"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_participant_id"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_assign_unassigned_products: {
        Args: { p_event_id?: number }
        Returns: {
          assigned_count: number
        }[]
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_role: "recharge" | "vente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_role: ["recharge", "vente"],
    },
  },
} as const
