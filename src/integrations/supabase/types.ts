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
      b2b_partners: {
        Row: {
          billing_email: string | null
          city: string | null
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          customer_number: string | null
          default_return_address: Json | null
          id: string
          is_active: boolean
          name: string
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          billing_email?: string | null
          city?: string | null
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          customer_number?: string | null
          default_return_address?: Json | null
          id?: string
          is_active?: boolean
          name: string
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          billing_email?: string | null
          city?: string | null
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          customer_number?: string | null
          default_return_address?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      b2b_shipments: {
        Row: {
          b2b_partner_id: string
          created_at: string
          created_by: string | null
          dhl_label_url: string | null
          dhl_tracking_number: string | null
          id: string
          notes: string | null
          recipient_address: Json | null
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
          id?: string
          notes?: string | null
          recipient_address?: Json | null
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
          id?: string
          notes?: string | null
          recipient_address?: Json | null
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
      repair_tickets: {
        Row: {
          accessories: string | null
          assigned_technician_id: string | null
          auto_approved_limit: number | null
          b2b_partner_id: string | null
          created_at: string
          customer_id: string
          device_id: string
          disposal_option: string | null
          email_opt_in: boolean | null
          endcustomer_price: number | null
          endcustomer_price_released: boolean | null
          endcustomer_reference: string | null
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
          kva_fee_amount: number | null
          kva_fee_applicable: boolean | null
          kva_required: boolean
          kva_token: string | null
          legal_notes_ack: boolean
          location_id: string
          passcode_info: string | null
          price_mode: Database["public"]["Enums"]["price_mode"]
          priority: string | null
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
          b2b_partner_id?: string | null
          created_at?: string
          customer_id: string
          device_id: string
          disposal_option?: string | null
          email_opt_in?: boolean | null
          endcustomer_price?: number | null
          endcustomer_price_released?: boolean | null
          endcustomer_reference?: string | null
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
          kva_fee_amount?: number | null
          kva_fee_applicable?: boolean | null
          kva_required?: boolean
          kva_token?: string | null
          legal_notes_ack?: boolean
          location_id: string
          passcode_info?: string | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          priority?: string | null
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
          b2b_partner_id?: string | null
          created_at?: string
          customer_id?: string
          device_id?: string
          disposal_option?: string | null
          email_opt_in?: boolean | null
          endcustomer_price?: number | null
          endcustomer_price_released?: boolean | null
          endcustomer_reference?: string | null
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
          kva_fee_amount?: number | null
          kva_fee_applicable?: boolean | null
          kva_required?: boolean
          kva_token?: string | null
          legal_notes_ack?: boolean
          location_id?: string
          passcode_info?: string | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          priority?: string | null
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
      generate_order_number: {
        Args: { _b2b_partner_id?: string; _location_id: string }
        Returns: string
      }
      generate_shipment_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      generate_tracking_token: { Args: never; Returns: string }
      get_b2b_partner_id: { Args: { _user_id: string }; Returns: string }
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
      b2b_shipment_status:
        | "ANGELEGT"
        | "GERAETE_UNTERWEGS"
        | "BEI_TELYA_EINGEGANGEN"
        | "ABGESCHLOSSEN"
        | "RETOUR_ANGELEGT"
        | "RETOUR_UNTERWEGS"
        | "RETOUR_ZUGESTELLT"
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
      app_role: [
        "ADMIN",
        "THEKE",
        "TECHNIKER",
        "BUCHHALTUNG",
        "FILIALLEITER",
        "B2B_ADMIN",
        "B2B_USER",
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
