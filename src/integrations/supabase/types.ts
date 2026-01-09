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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
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
      b2b_customers: {
        Row: {
          address: string | null
          b2b_partner_id: string
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string
          house_number: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          b2b_partner_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          house_number?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          b2b_partner_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          house_number?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_customers_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_document_templates: {
        Row: {
          b2b_partner_id: string
          conditions: string | null
          created_at: string
          footer: string | null
          id: string
          intro: string | null
          is_active: boolean
          legal_text: string | null
          template_type: string
          title: string
          updated_at: string
        }
        Insert: {
          b2b_partner_id: string
          conditions?: string | null
          created_at?: string
          footer?: string | null
          id?: string
          intro?: string | null
          is_active?: boolean
          legal_text?: string | null
          template_type: string
          title: string
          updated_at?: string
        }
        Update: {
          b2b_partner_id?: string
          conditions?: string | null
          created_at?: string
          footer?: string | null
          id?: string
          intro?: string | null
          is_active?: boolean
          legal_text?: string | null
          template_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_document_templates_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_partners: {
        Row: {
          billing_email: string | null
          city: string | null
          code: string | null
          company_logo_url: string | null
          company_slogan: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          customer_number: string | null
          default_return_address: Json | null
          document_texts: Json | null
          id: string
          is_active: boolean
          legal_footer: string | null
          location_id: string | null
          name: string
          primary_color: string | null
          privacy_policy_url: string | null
          secondary_color: string | null
          street: string | null
          terms_and_conditions: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          billing_email?: string | null
          city?: string | null
          code?: string | null
          company_logo_url?: string | null
          company_slogan?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          customer_number?: string | null
          default_return_address?: Json | null
          document_texts?: Json | null
          id?: string
          is_active?: boolean
          legal_footer?: string | null
          location_id?: string | null
          name: string
          primary_color?: string | null
          privacy_policy_url?: string | null
          secondary_color?: string | null
          street?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          billing_email?: string | null
          city?: string | null
          code?: string | null
          company_logo_url?: string | null
          company_slogan?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          customer_number?: string | null
          default_return_address?: Json | null
          document_texts?: Json | null
          id?: string
          is_active?: boolean
          legal_footer?: string | null
          location_id?: string | null
          name?: string
          primary_color?: string | null
          privacy_policy_url?: string | null
          secondary_color?: string | null
          street?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_partners_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_prices: {
        Row: {
          b2b_partner_id: string
          b2b_price: number
          brand: string | null
          created_at: string
          device_type: string
          endcustomer_price: number | null
          id: string
          is_active: boolean
          model: string | null
          repair_type: string
          updated_at: string
        }
        Insert: {
          b2b_partner_id: string
          b2b_price?: number
          brand?: string | null
          created_at?: string
          device_type: string
          endcustomer_price?: number | null
          id?: string
          is_active?: boolean
          model?: string | null
          repair_type: string
          updated_at?: string
        }
        Update: {
          b2b_partner_id?: string
          b2b_price?: number
          brand?: string | null
          created_at?: string
          device_type?: string
          endcustomer_price?: number | null
          id?: string
          is_active?: boolean
          model?: string | null
          repair_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_prices_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_shipments: {
        Row: {
          b2b_partner_id: string
          created_at: string
          created_by: string | null
          dhl_label_url: string | null
          dhl_tracking_number: string | null
          endcustomer_address: Json | null
          id: string
          notes: string | null
          recipient_address: Json | null
          return_to_endcustomer: boolean | null
          sender_address: Json | null
          shipment_number: string
          shipment_type: string
          status: Database["public"]["Enums"]["b2b_shipment_status"]
          updated_at: string
        }
        Insert: {
          b2b_partner_id: string
          created_at?: string
          created_by?: string | null
          dhl_label_url?: string | null
          dhl_tracking_number?: string | null
          endcustomer_address?: Json | null
          id?: string
          notes?: string | null
          recipient_address?: Json | null
          return_to_endcustomer?: boolean | null
          sender_address?: Json | null
          shipment_number: string
          shipment_type?: string
          status?: Database["public"]["Enums"]["b2b_shipment_status"]
          updated_at?: string
        }
        Update: {
          b2b_partner_id?: string
          created_at?: string
          created_by?: string | null
          dhl_label_url?: string | null
          dhl_tracking_number?: string | null
          endcustomer_address?: Json | null
          id?: string
          notes?: string | null
          recipient_address?: Json | null
          return_to_endcustomer?: boolean | null
          sender_address?: Json | null
          shipment_number?: string
          shipment_type?: string
          status?: Database["public"]["Enums"]["b2b_shipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_shipments_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_user_invitations: {
        Row: {
          accepted_at: string | null
          b2b_partner_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          b2b_partner_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          b2b_partner_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "b2b_user_invitations_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_user_invitations_invited_by_fkey"
            columns: ["invited_by"]
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
      complaints: {
        Row: {
          complaint_number: string
          created_at: string
          created_by: string
          credit_amount: number | null
          id: string
          notes: string | null
          part_id: string
          quantity: number
          reason: string
          repair_ticket_id: string | null
          replacement_quantity: number | null
          resolution_type: string | null
          resolved_at: string | null
          sent_back_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          stock_location_id: string
          supplier_id: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          complaint_number: string
          created_at?: string
          created_by: string
          credit_amount?: number | null
          id?: string
          notes?: string | null
          part_id: string
          quantity?: number
          reason: string
          repair_ticket_id?: string | null
          replacement_quantity?: number | null
          resolution_type?: string | null
          resolved_at?: string | null
          sent_back_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          stock_location_id: string
          supplier_id: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          complaint_number?: string
          created_at?: string
          created_by?: string
          credit_amount?: number | null
          id?: string
          notes?: string | null
          part_id?: string
          quantity?: number
          reason?: string
          repair_ticket_id?: string | null
          replacement_quantity?: number | null
          resolution_type?: string | null
          resolved_at?: string | null
          sent_back_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          stock_location_id?: string
          supplier_id?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_stock_location_id_fkey"
            columns: ["stock_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          marketing_consent: boolean
          marketing_consent_at: string | null
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
          marketing_consent?: boolean
          marketing_consent_at?: string | null
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
          marketing_consent?: boolean
          marketing_consent_at?: string | null
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
          sort_order: number | null
        }
        Insert: {
          brand: string
          created_at?: string
          device_type?: string
          id?: string
          model: string
          sort_order?: number | null
        }
        Update: {
          brand?: string
          created_at?: string
          device_type?: string
          id?: string
          model?: string
          sort_order?: number | null
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
          imei_unreadable: boolean
          model: string
          serial_number: string | null
          serial_unreadable: boolean
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
          imei_unreadable?: boolean
          model: string
          serial_number?: string | null
          serial_unreadable?: boolean
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
          imei_unreadable?: boolean
          model?: string
          serial_number?: string | null
          serial_unreadable?: boolean
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
      document_templates: {
        Row: {
          conditions: string | null
          created_at: string
          footer: string | null
          id: string
          intro: string | null
          locale: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          conditions?: string | null
          created_at?: string
          footer?: string | null
          id?: string
          intro?: string | null
          locale?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          conditions?: string | null
          created_at?: string
          footer?: string | null
          id?: string
          intro?: string | null
          locale?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      inventory_counts: {
        Row: {
          counted_at: string
          counted_by: string
          counted_quantity: number
          difference: number | null
          discrepancy_reason: string | null
          expected_quantity: number
          id: string
          inventory_session_id: string
          part_id: string
          unit_value: number | null
          value_difference: number | null
        }
        Insert: {
          counted_at?: string
          counted_by: string
          counted_quantity?: number
          difference?: number | null
          discrepancy_reason?: string | null
          expected_quantity?: number
          id?: string
          inventory_session_id: string
          part_id: string
          unit_value?: number | null
          value_difference?: number | null
        }
        Update: {
          counted_at?: string
          counted_by?: string
          counted_quantity?: number
          difference?: number | null
          discrepancy_reason?: string | null
          expected_quantity?: number
          id?: string
          inventory_session_id?: string
          part_id?: string
          unit_value?: number | null
          value_difference?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_inventory_session_id_fkey"
            columns: ["inventory_session_id"]
            isOneToOne: false
            referencedRelation: "inventory_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sessions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          rejection_reason: string | null
          session_number: string
          started_at: string
          status: Database["public"]["Enums"]["inventory_status"]
          stock_location_id: string
          total_discrepancies: number | null
          total_items_counted: number | null
          total_value_difference: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          session_number: string
          started_at?: string
          status?: Database["public"]["Enums"]["inventory_status"]
          stock_location_id: string
          total_discrepancies?: number | null
          total_items_counted?: number | null
          total_value_difference?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          session_number?: string
          started_at?: string
          status?: Database["public"]["Enums"]["inventory_status"]
          stock_location_id?: string
          total_discrepancies?: number | null
          total_items_counted?: number | null
          total_value_difference?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sessions_stock_location_id_fkey"
            columns: ["stock_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      kva_estimates: {
        Row: {
          created_at: string
          created_by: string | null
          customer_question: string | null
          decision: Database["public"]["Enums"]["kva_status"] | null
          decision_at: string | null
          decision_by_customer: boolean | null
          decision_channel:
            | Database["public"]["Enums"]["kva_approval_channel"]
            | null
          decision_note: string | null
          diagnosis: string | null
          disposal_option: string | null
          endcustomer_price: number | null
          endcustomer_price_released: boolean | null
          expired_at: string | null
          id: string
          internal_price: number | null
          is_current: boolean
          kva_fee_amount: number | null
          kva_fee_waived: boolean | null
          kva_fee_waiver_by: string | null
          kva_fee_waiver_reason: string | null
          kva_type: Database["public"]["Enums"]["kva_type"]
          max_cost: number | null
          min_cost: number | null
          notes: string | null
          parent_kva_id: string | null
          parts_cost: number | null
          reminder_sent_at: string | null
          repair_cost: number | null
          repair_description: string | null
          repair_ticket_id: string
          sent_at: string | null
          sent_via: Database["public"]["Enums"]["notification_channel"] | null
          staff_answer: string | null
          status: Database["public"]["Enums"]["kva_status"]
          total_cost: number | null
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_question?: string | null
          decision?: Database["public"]["Enums"]["kva_status"] | null
          decision_at?: string | null
          decision_by_customer?: boolean | null
          decision_channel?:
            | Database["public"]["Enums"]["kva_approval_channel"]
            | null
          decision_note?: string | null
          diagnosis?: string | null
          disposal_option?: string | null
          endcustomer_price?: number | null
          endcustomer_price_released?: boolean | null
          expired_at?: string | null
          id?: string
          internal_price?: number | null
          is_current?: boolean
          kva_fee_amount?: number | null
          kva_fee_waived?: boolean | null
          kva_fee_waiver_by?: string | null
          kva_fee_waiver_reason?: string | null
          kva_type?: Database["public"]["Enums"]["kva_type"]
          max_cost?: number | null
          min_cost?: number | null
          notes?: string | null
          parent_kva_id?: string | null
          parts_cost?: number | null
          reminder_sent_at?: string | null
          repair_cost?: number | null
          repair_description?: string | null
          repair_ticket_id: string
          sent_at?: string | null
          sent_via?: Database["public"]["Enums"]["notification_channel"] | null
          staff_answer?: string | null
          status?: Database["public"]["Enums"]["kva_status"]
          total_cost?: number | null
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_question?: string | null
          decision?: Database["public"]["Enums"]["kva_status"] | null
          decision_at?: string | null
          decision_by_customer?: boolean | null
          decision_channel?:
            | Database["public"]["Enums"]["kva_approval_channel"]
            | null
          decision_note?: string | null
          diagnosis?: string | null
          disposal_option?: string | null
          endcustomer_price?: number | null
          endcustomer_price_released?: boolean | null
          expired_at?: string | null
          id?: string
          internal_price?: number | null
          is_current?: boolean
          kva_fee_amount?: number | null
          kva_fee_waived?: boolean | null
          kva_fee_waiver_by?: string | null
          kva_fee_waiver_reason?: string | null
          kva_type?: Database["public"]["Enums"]["kva_type"]
          max_cost?: number | null
          min_cost?: number | null
          notes?: string | null
          parent_kva_id?: string | null
          parts_cost?: number | null
          reminder_sent_at?: string | null
          repair_cost?: number | null
          repair_description?: string | null
          repair_ticket_id?: string
          sent_at?: string | null
          sent_via?: Database["public"]["Enums"]["notification_channel"] | null
          staff_answer?: string | null
          status?: Database["public"]["Enums"]["kva_status"]
          total_cost?: number | null
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kva_estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kva_estimates_kva_fee_waiver_by_fkey"
            columns: ["kva_fee_waiver_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kva_estimates_parent_kva_id_fkey"
            columns: ["parent_kva_id"]
            isOneToOne: false
            referencedRelation: "kva_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kva_estimates_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kva_estimates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kva_fee_settings: {
        Row: {
          b2b_partner_id: string | null
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"] | null
          fee_amount: number
          id: string
          updated_at: string
        }
        Insert: {
          b2b_partner_id?: string | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          fee_amount?: number
          id?: string
          updated_at?: string
        }
        Update: {
          b2b_partner_id?: string | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          fee_amount?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kva_fee_settings_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      kva_history: {
        Row: {
          action: string
          created_at: string
          id: string
          kva_estimate_id: string
          new_values: Json | null
          note: string | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          kva_estimate_id: string
          new_values?: Json | null
          note?: string | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          kva_estimate_id?: string
          new_values?: Json | null
          note?: string | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kva_history_kva_estimate_id_fkey"
            columns: ["kva_estimate_id"]
            isOneToOne: false
            referencedRelation: "kva_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kva_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      model_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          b2b_partner_id: string | null
          brand: string
          created_at: string
          device_type: string
          id: string
          model_name: string
          rejection_reason: string | null
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          b2b_partner_id?: string | null
          brand: string
          created_at?: string
          device_type: string
          id?: string
          model_name: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          b2b_partner_id?: string | null
          brand?: string
          created_at?: string
          device_type?: string
          id?: string
          model_name?: string
          rejection_reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_requests_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          customer_id: string | null
          id: string
          is_read: boolean | null
          message: string | null
          payload: Json | null
          related_ticket_id: string | null
          repair_ticket_id: string | null
          status: string
          title: string | null
          trigger: Database["public"]["Enums"]["notification_trigger"]
          type: string | null
          user_id: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          payload?: Json | null
          related_ticket_id?: string | null
          repair_ticket_id?: string | null
          status?: string
          title?: string | null
          trigger: Database["public"]["Enums"]["notification_trigger"]
          type?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          payload?: Json | null
          related_ticket_id?: string | null
          repair_ticket_id?: string | null
          status?: string
          title?: string | null
          trigger?: Database["public"]["Enums"]["notification_trigger"]
          type?: string | null
          user_id?: string | null
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
            foreignKeyName: "notification_logs_related_ticket_id_fkey"
            columns: ["related_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
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
          avg_purchase_price: number | null
          brand: string | null
          created_at: string
          device_type: string | null
          id: string
          is_active: boolean | null
          last_purchase_price: number | null
          manufacturer_id: string | null
          min_stock_quantity: number
          model: string | null
          model_id: string | null
          name: string
          part_category: string | null
          purchase_price: number
          sales_price: number
          sku: string | null
          stock_location_id: string | null
          stock_quantity: number
          storage_location: string | null
          supplier_id: string | null
          supplier_sku: string | null
          updated_at: string
        }
        Insert: {
          avg_purchase_price?: number | null
          brand?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_purchase_price?: number | null
          manufacturer_id?: string | null
          min_stock_quantity?: number
          model?: string | null
          model_id?: string | null
          name: string
          part_category?: string | null
          purchase_price?: number
          sales_price?: number
          sku?: string | null
          stock_location_id?: string | null
          stock_quantity?: number
          storage_location?: string | null
          supplier_id?: string | null
          supplier_sku?: string | null
          updated_at?: string
        }
        Update: {
          avg_purchase_price?: number | null
          brand?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_purchase_price?: number | null
          manufacturer_id?: string | null
          min_stock_quantity?: number
          model?: string | null
          model_id?: string | null
          name?: string
          part_category?: string | null
          purchase_price?: number
          sales_price?: number
          sku?: string | null
          stock_location_id?: string | null
          stock_quantity?: number
          storage_location?: string | null
          supplier_id?: string | null
          supplier_sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "device_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_stock_location_id_fkey"
            columns: ["stock_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          key: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description: string
          id?: string
          key: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          key?: string
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
          b2b_partner_id: string | null
          can_view_all_locations: boolean
          created_at: string
          default_location_id: string | null
          email: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          b2b_partner_id?: string | null
          can_view_all_locations?: boolean
          created_at?: string
          default_location_id?: string | null
          email: string
          id: string
          is_active?: boolean
          location_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          b2b_partner_id?: string | null
          can_view_all_locations?: boolean
          created_at?: string
          default_location_id?: string | null
          email?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          part_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          received_at: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          part_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          received_at?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          received_at?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string
          expected_delivery: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          order_date: string | null
          order_number: string
          status: string
          stock_location_id: string
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expected_delivery?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          order_date?: string | null
          order_number: string
          status?: string
          stock_location_id: string
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expected_delivery?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string
          status?: string
          stock_location_id?: string
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_stock_location_id_fkey"
            columns: ["stock_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_tickets: {
        Row: {
          accessories: string | null
          assigned_technician_id: string | null
          auto_approved_limit: number | null
          b2b_customer_id: string | null
          b2b_partner_id: string | null
          created_at: string
          customer_id: string
          device_condition_at_intake: Json | null
          device_condition_remarks: string | null
          device_id: string
          disposal_option: string | null
          email_opt_in: boolean | null
          endcustomer_kva_allowed: boolean | null
          endcustomer_price: number | null
          endcustomer_price_released: boolean | null
          endcustomer_reference: string | null
          endcustomer_return_address: Json | null
          error_cause: Database["public"]["Enums"]["error_cause"] | null
          error_code: Database["public"]["Enums"]["error_code"] | null
          error_description_text: string | null
          estimated_price: number | null
          final_price: number | null
          id: string
          internal_notes: string | null
          internal_price: number | null
          is_b2b: boolean
          kva_approved: boolean | null
          kva_approved_at: string | null
          kva_decision_at: string | null
          kva_decision_by: string | null
          kva_decision_type: string | null
          kva_fee_amount: number | null
          kva_fee_applicable: boolean | null
          kva_required: boolean
          kva_token: string | null
          legal_notes_ack: boolean
          location_id: string
          passcode_info: string | null
          passcode_pattern: Json | null
          passcode_pin: string | null
          passcode_type: string | null
          price_mode: Database["public"]["Enums"]["price_mode"]
          priority: string | null
          return_to_endcustomer: boolean | null
          shipment_id: string | null
          sms_opt_in: boolean | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          updated_at: string
        }
        Insert: {
          accessories?: string | null
          assigned_technician_id?: string | null
          auto_approved_limit?: number | null
          b2b_customer_id?: string | null
          b2b_partner_id?: string | null
          created_at?: string
          customer_id: string
          device_condition_at_intake?: Json | null
          device_condition_remarks?: string | null
          device_id: string
          disposal_option?: string | null
          email_opt_in?: boolean | null
          endcustomer_kva_allowed?: boolean | null
          endcustomer_price?: number | null
          endcustomer_price_released?: boolean | null
          endcustomer_reference?: string | null
          endcustomer_return_address?: Json | null
          error_cause?: Database["public"]["Enums"]["error_cause"] | null
          error_code?: Database["public"]["Enums"]["error_code"] | null
          error_description_text?: string | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          internal_notes?: string | null
          internal_price?: number | null
          is_b2b?: boolean
          kva_approved?: boolean | null
          kva_approved_at?: string | null
          kva_decision_at?: string | null
          kva_decision_by?: string | null
          kva_decision_type?: string | null
          kva_fee_amount?: number | null
          kva_fee_applicable?: boolean | null
          kva_required?: boolean
          kva_token?: string | null
          legal_notes_ack?: boolean
          location_id: string
          passcode_info?: string | null
          passcode_pattern?: Json | null
          passcode_pin?: string | null
          passcode_type?: string | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          priority?: string | null
          return_to_endcustomer?: boolean | null
          shipment_id?: string | null
          sms_opt_in?: boolean | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          updated_at?: string
        }
        Update: {
          accessories?: string | null
          assigned_technician_id?: string | null
          auto_approved_limit?: number | null
          b2b_customer_id?: string | null
          b2b_partner_id?: string | null
          created_at?: string
          customer_id?: string
          device_condition_at_intake?: Json | null
          device_condition_remarks?: string | null
          device_id?: string
          disposal_option?: string | null
          email_opt_in?: boolean | null
          endcustomer_kva_allowed?: boolean | null
          endcustomer_price?: number | null
          endcustomer_price_released?: boolean | null
          endcustomer_reference?: string | null
          endcustomer_return_address?: Json | null
          error_cause?: Database["public"]["Enums"]["error_cause"] | null
          error_code?: Database["public"]["Enums"]["error_code"] | null
          error_description_text?: string | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          internal_notes?: string | null
          internal_price?: number | null
          is_b2b?: boolean
          kva_approved?: boolean | null
          kva_approved_at?: string | null
          kva_decision_at?: string | null
          kva_decision_by?: string | null
          kva_decision_type?: string | null
          kva_fee_amount?: number | null
          kva_fee_applicable?: boolean | null
          kva_required?: boolean
          kva_token?: string | null
          legal_notes_ack?: boolean
          location_id?: string
          passcode_info?: string | null
          passcode_pattern?: Json | null
          passcode_pin?: string | null
          passcode_type?: string | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          priority?: string | null
          return_to_endcustomer?: boolean | null
          shipment_id?: string | null
          sms_opt_in?: boolean | null
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
            foreignKeyName: "repair_tickets_b2b_customer_id_fkey"
            columns: ["b2b_customer_id"]
            isOneToOne: false
            referencedRelation: "b2b_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tickets_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "b2b_partners"
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
          {
            foreignKeyName: "repair_tickets_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "b2b_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
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
      stock_locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          location_id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          location_id: string
          name?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          location_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          complaint_id: string | null
          created_at: string
          created_by: string
          id: string
          inventory_session_id: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes: string | null
          part_id: string
          purchase_order_id: string | null
          quantity: number
          reason: string | null
          repair_ticket_id: string | null
          requires_approval: boolean
          stock_after: number
          stock_before: number
          stock_location_id: string
          supplier_id: string | null
          total_value: number | null
          transfer_movement_id: string | null
          unit_price: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          complaint_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          inventory_session_id?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          part_id: string
          purchase_order_id?: string | null
          quantity: number
          reason?: string | null
          repair_ticket_id?: string | null
          requires_approval?: boolean
          stock_after?: number
          stock_before?: number
          stock_location_id: string
          supplier_id?: string | null
          total_value?: number | null
          transfer_movement_id?: string | null
          unit_price?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          complaint_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          inventory_session_id?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          part_id?: string
          purchase_order_id?: string | null
          quantity?: number
          reason?: string | null
          repair_ticket_id?: string | null
          requires_approval?: boolean
          stock_after?: number
          stock_before?: number
          stock_location_id?: string
          supplier_id?: string | null
          total_value?: number | null
          transfer_movement_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_movements_complaint"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stock_movements_inventory_session"
            columns: ["inventory_session_id"]
            isOneToOne: false
            referencedRelation: "inventory_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stock_movements_purchase_order"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_location_id_fkey"
            columns: ["stock_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      ticket_internal_notes: {
        Row: {
          created_at: string
          id: string
          note_text: string
          repair_ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_text: string
          repair_ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_text?: string
          repair_ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_internal_notes_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message_text: string
          repair_ticket_id: string
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          repair_ticket_id: string
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          repair_ticket_id?: string
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_number_sequence: {
        Row: {
          next_number: number
          year: number
        }
        Insert: {
          next_number?: number
          year: number
        }
        Update: {
          next_number?: number
          year?: number
        }
        Relationships: []
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
          category: string | null
          created_at: string
          customer_visible: boolean | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          note: string | null
          repair_ticket_id: string
          storage_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          customer_visible?: boolean | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          note?: string | null
          repair_ticket_id: string
          storage_url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          customer_visible?: boolean | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          note?: string | null
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
      user_locations: {
        Row: {
          can_view: boolean
          created_at: string | null
          id: string
          is_default: boolean
          location_id: string
          user_id: string
        }
        Insert: {
          can_view?: boolean
          created_at?: string | null
          id?: string
          is_default?: boolean
          location_id: string
          user_id: string
        }
        Update: {
          can_view?: boolean
          created_at?: string | null
          id?: string
          is_default?: boolean
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      can_view_location: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      create_stock_movement: {
        Args: {
          _complaint_id?: string
          _inventory_session_id?: string
          _movement_type: Database["public"]["Enums"]["stock_movement_type"]
          _notes?: string
          _part_id: string
          _purchase_order_id?: string
          _quantity: number
          _reason?: string
          _repair_ticket_id?: string
          _requires_approval?: boolean
          _stock_location_id: string
          _supplier_id?: string
          _transfer_movement_id?: string
          _unit_price?: number
        }
        Returns: string
      }
      create_stock_transfer: {
        Args: {
          _from_location_id: string
          _notes?: string
          _part_id: string
          _quantity: number
          _reason?: string
          _to_location_id: string
        }
        Returns: string
      }
      generate_complaint_number: { Args: never; Returns: string }
      generate_inventory_session_number: { Args: never; Returns: string }
      generate_order_number: {
        Args: { _b2b_partner_id?: string; _location_id: string }
        Returns: string
      }
      generate_purchase_order_number: { Args: never; Returns: string }
      generate_shipment_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      generate_tracking_code: { Args: never; Returns: string }
      generate_tracking_token: { Args: never; Returns: string }
      get_b2b_partner_id: { Args: { _user_id: string }; Returns: string }
      get_stock_quantity: {
        Args: { _part_id: string; _stock_location_id?: string }
        Returns: number
      }
      get_user_locations: {
        Args: { _user_id: string }
        Returns: {
          is_default: boolean
          location_id: string
        }[]
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          permission_key: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_b2b_inhaber: { Args: { _user_id: string }; Returns: boolean }
      is_b2b_user: { Args: { _user_id: string }; Returns: boolean }
      is_employee: { Args: { _user_id: string }; Returns: boolean }
      reset_all_data: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "ADMIN"
        | "THEKE"
        | "TECHNIKER"
        | "BUCHHALTUNG"
        | "FILIALLEITER"
        | "B2B_ADMIN"
        | "B2B_USER"
        | "B2B_INHABER"
      b2b_shipment_status:
        | "ANGELEGT"
        | "GERAETE_UNTERWEGS"
        | "BEI_TELYA_EINGEGANGEN"
        | "ABGESCHLOSSEN"
        | "RETOUR_ANGELEGT"
        | "RETOUR_UNTERWEGS"
        | "RETOUR_ZUGESTELLT"
      complaint_status:
        | "OPEN"
        | "SENT_BACK"
        | "CREDIT_RECEIVED"
        | "REPLACEMENT_RECEIVED"
        | "CLOSED"
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
      inventory_status:
        | "IN_PROGRESS"
        | "PENDING_APPROVAL"
        | "APPROVED"
        | "REJECTED"
      kva_approval_channel: "ONLINE" | "TELEFON" | "VOR_ORT" | "EMAIL" | "SMS"
      kva_status:
        | "ENTWURF"
        | "ERSTELLT"
        | "GESENDET"
        | "WARTET_AUF_ANTWORT"
        | "FREIGEGEBEN"
        | "ABGELEHNT"
        | "ENTSORGEN"
        | "RUECKFRAGE"
        | "ABGELAUFEN"
      kva_type: "FIXPREIS" | "VARIABEL" | "BIS_ZU"
      notification_channel: "EMAIL" | "SMS" | "WHATSAPP"
      notification_trigger:
        | "TICKET_CREATED"
        | "KVA_READY"
        | "KVA_APPROVED"
        | "KVA_REJECTED"
        | "REPAIR_IN_PROGRESS"
        | "READY_FOR_PICKUP"
        | "REMINDER_NOT_PICKED"
        | "KVA_REMINDER"
      part_category_enum:
        | "DISPLAY"
        | "AKKU"
        | "LADEBUCHSE"
        | "KAMERA_VORNE"
        | "KAMERA_HINTEN"
        | "LAUTSPRECHER"
        | "MIKROFON"
        | "BACKCOVER"
        | "RAHMEN"
        | "FLEXKABEL"
        | "BUTTONS"
        | "VIBRATIONSMOTOR"
        | "SONSTIGES"
      price_mode: "FIXPREIS" | "KVA" | "NACH_AUFWAND"
      stock_movement_type:
        | "PURCHASE"
        | "CONSUMPTION"
        | "MANUAL_OUT"
        | "TRANSFER_OUT"
        | "TRANSFER_IN"
        | "COMPLAINT_OUT"
        | "COMPLAINT_CREDIT"
        | "COMPLAINT_REPLACE"
        | "WRITE_OFF"
        | "INVENTORY_PLUS"
        | "INVENTORY_MINUS"
        | "INITIAL_STOCK"
      ticket_status:
        | "NEU_EINGEGANGEN"
        | "IN_DIAGNOSE"
        | "WARTET_AUF_TEIL_ODER_FREIGABE"
        | "IN_REPARATUR"
        | "FERTIG_ZUR_ABHOLUNG"
        | "ABGEHOLT"
        | "STORNIERT"
        | "EINGESENDET"
        | "RUECKVERSAND_AN_B2B"
        | "RUECKVERSAND_AN_ENDKUNDE"
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
      app_role: [
        "ADMIN",
        "THEKE",
        "TECHNIKER",
        "BUCHHALTUNG",
        "FILIALLEITER",
        "B2B_ADMIN",
        "B2B_USER",
        "B2B_INHABER",
      ],
      b2b_shipment_status: [
        "ANGELEGT",
        "GERAETE_UNTERWEGS",
        "BEI_TELYA_EINGEGANGEN",
        "ABGESCHLOSSEN",
        "RETOUR_ANGELEGT",
        "RETOUR_UNTERWEGS",
        "RETOUR_ZUGESTELLT",
      ],
      complaint_status: [
        "OPEN",
        "SENT_BACK",
        "CREDIT_RECEIVED",
        "REPLACEMENT_RECEIVED",
        "CLOSED",
      ],
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
      inventory_status: [
        "IN_PROGRESS",
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED",
      ],
      kva_approval_channel: ["ONLINE", "TELEFON", "VOR_ORT", "EMAIL", "SMS"],
      kva_status: [
        "ENTWURF",
        "ERSTELLT",
        "GESENDET",
        "WARTET_AUF_ANTWORT",
        "FREIGEGEBEN",
        "ABGELEHNT",
        "ENTSORGEN",
        "RUECKFRAGE",
        "ABGELAUFEN",
      ],
      kva_type: ["FIXPREIS", "VARIABEL", "BIS_ZU"],
      notification_channel: ["EMAIL", "SMS", "WHATSAPP"],
      notification_trigger: [
        "TICKET_CREATED",
        "KVA_READY",
        "KVA_APPROVED",
        "KVA_REJECTED",
        "REPAIR_IN_PROGRESS",
        "READY_FOR_PICKUP",
        "REMINDER_NOT_PICKED",
        "KVA_REMINDER",
      ],
      part_category_enum: [
        "DISPLAY",
        "AKKU",
        "LADEBUCHSE",
        "KAMERA_VORNE",
        "KAMERA_HINTEN",
        "LAUTSPRECHER",
        "MIKROFON",
        "BACKCOVER",
        "RAHMEN",
        "FLEXKABEL",
        "BUTTONS",
        "VIBRATIONSMOTOR",
        "SONSTIGES",
      ],
      price_mode: ["FIXPREIS", "KVA", "NACH_AUFWAND"],
      stock_movement_type: [
        "PURCHASE",
        "CONSUMPTION",
        "MANUAL_OUT",
        "TRANSFER_OUT",
        "TRANSFER_IN",
        "COMPLAINT_OUT",
        "COMPLAINT_CREDIT",
        "COMPLAINT_REPLACE",
        "WRITE_OFF",
        "INVENTORY_PLUS",
        "INVENTORY_MINUS",
        "INITIAL_STOCK",
      ],
      ticket_status: [
        "NEU_EINGEGANGEN",
        "IN_DIAGNOSE",
        "WARTET_AUF_TEIL_ODER_FREIGABE",
        "IN_REPARATUR",
        "FERTIG_ZUR_ABHOLUNG",
        "ABGEHOLT",
        "STORNIERT",
        "EINGESENDET",
        "RUECKVERSAND_AN_B2B",
        "RUECKVERSAND_AN_ENDKUNDE",
      ],
    },
  },
} as const
