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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checklist_template_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          checklist_template_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          checklist_template_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          active: boolean
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"] | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_catalog: {
        Row: {
          brand: string
          created_at: string
          device_type: string
          id: string
          model: string
        }
        Insert: {
          brand: string
          created_at?: string
          device_type?: string
          id?: string
          model: string
        }
        Update: {
          brand?: string
          created_at?: string
          device_type?: string
          id?: string
          model?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          customer_id: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          imei_or_serial: string | null
          model: string
          updated_at: string
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          customer_id: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          imei_or_serial?: string | null
          model: string
          updated_at?: string
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          customer_id?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          imei_or_serial?: string | null
          model?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_complaint: boolean
          rating: number
          repair_ticket_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_complaint?: boolean
          rating: number
          repair_ticket_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_complaint?: boolean
          rating?: number
          repair_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          customer_id: string | null
          id: string
          payload: Json | null
          repair_ticket_id: string | null
          status: string
          trigger: Database["public"]["Enums"]["notification_trigger"]
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          id?: string
          payload?: Json | null
          repair_ticket_id?: string | null
          status?: string
          trigger: Database["public"]["Enums"]["notification_trigger"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          id?: string
          payload?: Json | null
          repair_ticket_id?: string | null
          status?: string
          trigger?: Database["public"]["Enums"]["notification_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          subject: string | null
          trigger: Database["public"]["Enums"]["notification_trigger"]
        }
        Insert: {
          active?: boolean
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          subject?: string | null
          trigger: Database["public"]["Enums"]["notification_trigger"]
        }
        Update: {
          active?: boolean
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          subject?: string | null
          trigger?: Database["public"]["Enums"]["notification_trigger"]
        }
        Relationships: []
      }
      parts: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          min_stock_quantity: number
          model: string | null
          name: string
          purchase_price: number
          sales_price: number
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          min_stock_quantity?: number
          model?: string | null
          name: string
          purchase_price?: number
          sales_price?: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          min_stock_quantity?: number
          model?: string | null
          name?: string
          purchase_price?: number
          sales_price?: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      price_list: {
        Row: {
          active: boolean
          brand: string
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          model: string | null
          price: number
          repair_type: Database["public"]["Enums"]["error_code"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand: string
          created_at?: string
          device_type: Database["public"]["Enums"]["device_type"]
          id?: string
          model?: string | null
          price: number
          repair_type: Database["public"]["Enums"]["error_code"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          model?: string | null
          price?: number
          repair_type?: Database["public"]["Enums"]["error_code"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          location_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_tickets: {
        Row: {
          accessories: string | null
          assigned_technician_id: string | null
          created_at: string
          customer_id: string
          device_id: string
          error_cause: Database["public"]["Enums"]["error_cause"] | null
          error_code: Database["public"]["Enums"]["error_code"] | null
          error_description_text: string | null
          estimated_price: number | null
          final_price: number | null
          id: string
          internal_notes: string | null
          kva_approved: boolean | null
          kva_approved_at: string | null
          kva_required: boolean
          kva_token: string | null
          legal_notes_ack: boolean
          location_id: string
          passcode_info: string | null
          price_mode: Database["public"]["Enums"]["price_mode"]
          priority: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          updated_at: string
        }
        Insert: {
          accessories?: string | null
          assigned_technician_id?: string | null
          created_at?: string
          customer_id: string
          device_id: string
          error_cause?: Database["public"]["Enums"]["error_cause"] | null
          error_code?: Database["public"]["Enums"]["error_code"] | null
          error_description_text?: string | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          internal_notes?: string | null
          kva_approved?: boolean | null
          kva_approved_at?: string | null
          kva_required?: boolean
          kva_token?: string | null
          legal_notes_ack?: boolean
          location_id: string
          passcode_info?: string | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          priority?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          updated_at?: string
        }
        Update: {
          accessories?: string | null
          assigned_technician_id?: string | null
          created_at?: string
          customer_id?: string
          device_id?: string
          error_cause?: Database["public"]["Enums"]["error_cause"] | null
          error_code?: Database["public"]["Enums"]["error_code"] | null
          error_description_text?: string | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          internal_notes?: string | null
          kva_approved?: boolean | null
          kva_approved_at?: string | null
          kva_required?: boolean
          kva_token?: string | null
          legal_notes_ack?: boolean
          location_id?: string
          passcode_info?: string | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          priority?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_tickets_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tickets_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          changed_by_user_id: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["ticket_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["ticket_status"] | null
          repair_ticket_id: string
        }
        Insert: {
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["ticket_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["ticket_status"] | null
          repair_ticket_id: string
        }
        Update: {
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["ticket_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["ticket_status"] | null
          repair_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_checklist_items: {
        Row: {
          checked: boolean
          checked_at: string | null
          checked_by_user_id: string | null
          checklist_item_id: string
          id: string
          repair_ticket_id: string
        }
        Insert: {
          checked?: boolean
          checked_at?: string | null
          checked_by_user_id?: string | null
          checklist_item_id: string
          id?: string
          repair_ticket_id: string
        }
        Update: {
          checked?: boolean
          checked_at?: string | null
          checked_by_user_id?: string | null
          checklist_item_id?: string
          id?: string
          repair_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_checklist_items_checked_by_user_id_fkey"
            columns: ["checked_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_checklist_items_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_checklist_items_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_part_usage: {
        Row: {
          created_at: string
          id: string
          part_id: string
          quantity: number
          repair_ticket_id: string
          unit_purchase_price: number | null
          unit_sales_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          part_id: string
          quantity?: number
          repair_ticket_id: string
          unit_purchase_price?: number | null
          unit_sales_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string
          quantity?: number
          repair_ticket_id?: string
          unit_purchase_price?: number | null
          unit_sales_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_part_usage_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_part_usage_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_photos: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          repair_ticket_id: string
          storage_url: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          repair_ticket_id: string
          storage_url: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          repair_ticket_id?: string
          storage_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_photos_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ticket_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_employee: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "ADMIN" | "THEKE" | "TECHNIKER" | "BUCHHALTUNG" | "FILIALLEITER"
      device_type: "HANDY" | "TABLET" | "LAPTOP" | "SMARTWATCH" | "OTHER"
      error_cause:
        | "STURZ"
        | "FEUCHTIGKEIT"
        | "VERSCHLEISS"
        | "HERSTELLERFEHLER"
        | "UNKLAR"
      error_code:
        | "DISPLAYBRUCH"
        | "WASSERSCHADEN"
        | "AKKU_SCHWACH"
        | "LADEBUCHSE"
        | "KAMERA"
        | "MIKROFON"
        | "LAUTSPRECHER"
        | "TASTATUR"
        | "SONSTIGES"
      notification_channel: "EMAIL" | "SMS" | "WHATSAPP"
      notification_trigger:
        | "TICKET_CREATED"
        | "KVA_READY"
        | "KVA_APPROVED"
        | "KVA_REJECTED"
        | "REPAIR_IN_PROGRESS"
        | "READY_FOR_PICKUP"
        | "REMINDER_NOT_PICKED"
      price_mode: "FIXPREIS" | "KVA" | "NACH_AUFWAND"
      ticket_status:
        | "NEU_EINGEGANGEN"
        | "IN_DIAGNOSE"
        | "WARTET_AUF_TEIL_ODER_FREIGABE"
        | "IN_REPARATUR"
        | "FERTIG_ZUR_ABHOLUNG"
        | "ABGEHOLT"
        | "STORNIERT"
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
      app_role: ["ADMIN", "THEKE", "TECHNIKER", "BUCHHALTUNG", "FILIALLEITER"],
      device_type: ["HANDY", "TABLET", "LAPTOP", "SMARTWATCH", "OTHER"],
      error_cause: [
        "STURZ",
        "FEUCHTIGKEIT",
        "VERSCHLEISS",
        "HERSTELLERFEHLER",
        "UNKLAR",
      ],
      error_code: [
        "DISPLAYBRUCH",
        "WASSERSCHADEN",
        "AKKU_SCHWACH",
        "LADEBUCHSE",
        "KAMERA",
        "MIKROFON",
        "LAUTSPRECHER",
        "TASTATUR",
        "SONSTIGES",
      ],
      notification_channel: ["EMAIL", "SMS", "WHATSAPP"],
      notification_trigger: [
        "TICKET_CREATED",
        "KVA_READY",
        "KVA_APPROVED",
        "KVA_REJECTED",
        "REPAIR_IN_PROGRESS",
        "READY_FOR_PICKUP",
        "REMINDER_NOT_PICKED",
      ],
      price_mode: ["FIXPREIS", "KVA", "NACH_AUFWAND"],
      ticket_status: [
        "NEU_EINGEGANGEN",
        "IN_DIAGNOSE",
        "WARTET_AUF_TEIL_ODER_FREIGABE",
        "IN_REPARATUR",
        "FERTIG_ZUR_ABHOLUNG",
        "ABGEHOLT",
        "STORNIERT",
      ],
    },
  },
} as const
