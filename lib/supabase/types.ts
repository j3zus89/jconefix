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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      afip_logs: {
        Row: {
          created_at: string
          cuit: string | null
          detail: Json | null
          endpoint: string
          error_message: string | null
          id: string
          organization_id: string | null
          result: string
        }
        Insert: {
          created_at?: string
          cuit?: string | null
          detail?: Json | null
          endpoint: string
          error_message?: string | null
          id?: string
          organization_id?: string | null
          result: string
        }
        Update: {
          created_at?: string
          cuit?: string | null
          detail?: Json | null
          endpoint?: string
          error_message?: string | null
          id?: string
          organization_id?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "afip_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afip_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      arca_wsaa_tokens: {
        Row: {
          expires_at: string
          organization_id: string
          production: boolean
          updated_at: string
        }
        Insert: {
          expires_at: string
          organization_id: string
          production?: boolean
          updated_at?: string
        }
        Update: {
          expires_at?: string
          organization_id?: string
          production?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arca_wsaa_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arca_wsaa_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          id: string
          message: string
          organization_id: string | null
          sender_color: string
          sender_name: string
          ticket_ref: string | null
          user_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          organization_id?: string | null
          sender_color?: string
          sender_name?: string
          ticket_ref?: string | null
          user_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          sender_color?: string
          sender_name?: string
          ticket_ref?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_signup_requests: {
        Row: {
          billing_interest: string
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          plan_interest: string
          shop_name: string
        }
        Insert: {
          billing_interest: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          plan_interest: string
          shop_name: string
        }
        Update: {
          billing_interest?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          plan_interest?: string
          shop_name?: string
        }
        Relationships: []
      }
      custom_ticket_statuses: {
        Row: {
          category: string
          color: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      customer_return_constancias: {
        Row: {
          amount_money: number | null
          created_at: string
          created_by_user_id: string | null
          customer_id: string | null
          delivered_at: string | null
          detail: string | null
          id: string
          organization_id: string | null
          reference_code: string
          related_invoice_id: string | null
          repair_ticket_id: string
          scenario: string
          settlement_method: string | null
          shop_owner_id: string | null
          status: string
          summary_line: string
          updated_at: string
        }
        Insert: {
          amount_money?: number | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          detail?: string | null
          id?: string
          organization_id?: string | null
          reference_code: string
          related_invoice_id?: string | null
          repair_ticket_id: string
          scenario?: string
          settlement_method?: string | null
          shop_owner_id?: string | null
          status?: string
          summary_line?: string
          updated_at?: string
        }
        Update: {
          amount_money?: number | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          detail?: string | null
          id?: string
          organization_id?: string | null
          reference_code?: string
          related_invoice_id?: string | null
          repair_ticket_id?: string
          scenario?: string
          settlement_method?: string | null
          shop_owner_id?: string | null
          status?: string
          summary_line?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_return_constancias_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_return_constancias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_return_constancias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_return_constancias_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_return_constancias_repair_ticket_id_fkey"
            columns: ["repair_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          address2: string | null
          city: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_relation: string | null
          country: string | null
          created_at: string | null
          custom_fields: Json | null
          customer_group: string | null
          drivers_license: string | null
          email: string | null
          email_notifications: boolean | null
          first_name: string | null
          gdpr_consent: boolean | null
          how_did_you_find_us: string | null
          id: string
          id_number: string | null
          id_type: string | null
          internal_notes: string | null
          is_active: boolean | null
          last_name: string | null
          mailchimp_status: string | null
          mailchimp_subscribed: boolean | null
          name: string
          notes: string | null
          organization: string | null
          organization_id: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tags: string | null
          tax_class: string | null
          updated_at: string | null
          user_id: string
          work_network: string | null
        }
        Insert: {
          address?: string | null
          address2?: string | null
          city?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_relation?: string | null
          country?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          customer_group?: string | null
          drivers_license?: string | null
          email?: string | null
          email_notifications?: boolean | null
          first_name?: string | null
          gdpr_consent?: boolean | null
          how_did_you_find_us?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          internal_notes?: string | null
          is_active?: boolean | null
          last_name?: string | null
          mailchimp_status?: string | null
          mailchimp_subscribed?: boolean | null
          name: string
          notes?: string | null
          organization?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tags?: string | null
          tax_class?: string | null
          updated_at?: string | null
          user_id: string
          work_network?: string | null
        }
        Update: {
          address?: string | null
          address2?: string | null
          city?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_relation?: string | null
          country?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          customer_group?: string | null
          drivers_license?: string | null
          email?: string | null
          email_notifications?: boolean | null
          first_name?: string | null
          gdpr_consent?: boolean | null
          how_did_you_find_us?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          internal_notes?: string | null
          is_active?: boolean | null
          last_name?: string | null
          mailchimp_status?: string | null
          mailchimp_subscribed?: boolean | null
          name?: string
          notes?: string | null
          organization?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tags?: string | null
          tax_class?: string | null
          updated_at?: string | null
          user_id?: string
          work_network?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          organization_id: string | null
          receipt_url: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          receipt_url?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          receipt_url?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          condition: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_low_stock: boolean | null
          is_serialized: boolean | null
          location: string | null
          max_quantity: number | null
          min_quantity: number | null
          model: string | null
          name: string
          notes: string | null
          organization_id: string | null
          quantity: number | null
          selling_price: number | null
          sku: string | null
          subcategory: string | null
          supplier: string | null
          supplier_code: string | null
          track_inventory: boolean | null
          updated_at: string | null
          user_id: string
          warranty_days: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_low_stock?: boolean | null
          is_serialized?: boolean | null
          location?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          model?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number | null
          selling_price?: number | null
          sku?: string | null
          subcategory?: string | null
          supplier?: string | null
          supplier_code?: string | null
          track_inventory?: boolean | null
          updated_at?: string | null
          user_id: string
          warranty_days?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_low_stock?: boolean | null
          is_serialized?: boolean | null
          location?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          model?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number | null
          selling_price?: number | null
          sku?: string | null
          subcategory?: string | null
          supplier?: string | null
          supplier_code?: string | null
          track_inventory?: boolean | null
          updated_at?: string | null
          user_id?: string
          warranty_days?: number | null
        }
        Relationships: []
      }
      inventory_transfers: {
        Row: {
          created_at: string | null
          from_location: string | null
          id: string
          notes: string | null
          organization_id: string | null
          status: string | null
          to_location: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          from_location?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string | null
          to_location?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          from_location?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string | null
          to_location?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          product_id?: string | null
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_saved_filters: {
        Row: {
          created_at: string
          filter_json: Json
          id: string
          name: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_json?: Json
          id?: string
          name: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_json?: Json
          id?: string
          name?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_saved_filters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_saved_filters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ar_cae: string | null
          ar_cae_expires_at: string | null
          ar_cbte_tipo: number | null
          ar_cuit_emisor: string | null
          ar_internal_only: boolean
          ar_numero_cbte: number | null
          ar_punto_venta: number | null
          ar_status: string | null
          billing_jurisdiction: string
          clone_of_invoice_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          customer_billing_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_iva_condition_ar: string | null
          customer_name: string
          customer_phone: string | null
          customer_signature_url: string | null
          customer_tax_id: string | null
          discount_amount: number
          due_date: string | null
          es_verifactu_uuid: string | null
          external_reference: string | null
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string | null
          paid_amount: number
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          refunded_amount: number
          shop_owner_id: string
          status: string
          subtotal: number
          tax_amount: number
          ticket_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          ar_cae?: string | null
          ar_cae_expires_at?: string | null
          ar_cbte_tipo?: number | null
          ar_cuit_emisor?: string | null
          ar_internal_only?: boolean
          ar_numero_cbte?: number | null
          ar_punto_venta?: number | null
          ar_status?: string | null
          billing_jurisdiction?: string
          clone_of_invoice_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_billing_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_iva_condition_ar?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_signature_url?: string | null
          customer_tax_id?: string | null
          discount_amount?: number
          due_date?: string | null
          es_verifactu_uuid?: string | null
          external_reference?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          refunded_amount?: number
          shop_owner_id: string
          status?: string
          subtotal?: number
          tax_amount?: number
          ticket_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          ar_cae?: string | null
          ar_cae_expires_at?: string | null
          ar_cbte_tipo?: number | null
          ar_cuit_emisor?: string | null
          ar_internal_only?: boolean
          ar_numero_cbte?: number | null
          ar_punto_venta?: number | null
          ar_status?: string | null
          billing_jurisdiction?: string
          clone_of_invoice_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_billing_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_iva_condition_ar?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_signature_url?: string | null
          customer_tax_id?: string | null
          discount_amount?: number
          due_date?: string | null
          es_verifactu_uuid?: string | null
          external_reference?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          refunded_amount?: number
          shop_owner_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          ticket_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clone_of_invoice_id_fkey"
            columns: ["clone_of_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_arca_credentials: {
        Row: {
          cert_cuit_detected: string | null
          cert_expires_at: string | null
          cert_pem_enc: string
          key_pem_enc: string
          organization_id: string
          production: boolean
          punto_venta: number | null
          updated_at: string
        }
        Insert: {
          cert_cuit_detected?: string | null
          cert_expires_at?: string | null
          cert_pem_enc: string
          key_pem_enc: string
          organization_id: string
          production?: boolean
          punto_venta?: number | null
          updated_at?: string
        }
        Update: {
          cert_cuit_detected?: string | null
          cert_expires_at?: string | null
          cert_pem_enc?: string
          key_pem_enc?: string
          organization_id?: string
          production?: boolean
          punto_venta?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_arca_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_arca_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_boleto_counter: {
        Row: {
          counter: number
          organization_id: string
        }
        Insert: {
          counter?: number
          organization_id: string
        }
        Update: {
          counter?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_boleto_counter_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_boleto_counter_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_custom_roles: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          name: string
          organization_id: string
          role_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          organization_id: string
          role_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          organization_id?: string
          role_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          organization_id: string
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id: string
          permissions?: Json | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_role_label_overrides: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          name: string
          organization_id: string
          role_key: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          organization_id: string
          role_key: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          organization_id?: string
          role_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_role_label_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_role_label_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_cycle: string
          billing_reminder_sent_for_license_end: string | null
          billing_reminder_sent_for_trial_end: string | null
          country: string
          created_at: string
          currency: string
          deleted_at: string | null
          features: Json | null
          gemini_api_key: string | null
          id: string
          license_expires_at: string | null
          license_unlimited: boolean
          logo_url: string | null
          max_storage_mb: number | null
          max_tickets: number | null
          max_users: number | null
          name: string
          owner_id: string | null
          plan_type: string
          settings: Json | null
          slug: string
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          billing_reminder_sent_for_license_end?: string | null
          billing_reminder_sent_for_trial_end?: string | null
          country?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          features?: Json | null
          gemini_api_key?: string | null
          id?: string
          license_expires_at?: string | null
          license_unlimited?: boolean
          logo_url?: string | null
          max_storage_mb?: number | null
          max_tickets?: number | null
          max_users?: number | null
          name: string
          owner_id?: string | null
          plan_type?: string
          settings?: Json | null
          slug: string
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          billing_reminder_sent_for_license_end?: string | null
          billing_reminder_sent_for_trial_end?: string | null
          country?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          features?: Json | null
          gemini_api_key?: string | null
          id?: string
          license_expires_at?: string | null
          license_unlimited?: boolean
          logo_url?: string | null
          max_storage_mb?: number | null
          max_tickets?: number | null
          max_users?: number | null
          name?: string
          owner_id?: string | null
          plan_type?: string
          settings?: Json | null
          slug?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      panel_login_email_throttle: {
        Row: {
          last_sent_at: string
          user_id: string
        }
        Insert: {
          last_sent_at: string
          user_id: string
        }
        Update: {
          last_sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      panel_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          organization_id: string
          read_at: string | null
          ticket_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id: string
          read_at?: string | null
          ticket_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          read_at?: string | null
          ticket_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          cash_received: number | null
          change_given: number | null
          created_at: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          organization_id: string | null
          paid_by: string | null
          payment_method: string
          reference_number: string | null
          shop_owner_id: string
          status: string | null
          ticket_id: string | null
        }
        Insert: {
          amount: number
          cash_received?: number | null
          change_given?: number | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string | null
          paid_by?: string | null
          payment_method: string
          reference_number?: string | null
          shop_owner_id: string
          status?: string | null
          ticket_id?: string | null
        }
        Update: {
          amount?: number
          cash_received?: number | null
          change_given?: number | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string | null
          paid_by?: string | null
          payment_method?: string
          reference_number?: string | null
          shop_owner_id?: string
          status?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          cash_change: number | null
          cash_given: number | null
          created_at: string | null
          discount_pct: number
          id: string
          items: Json
          organization_id: string | null
          payment_method: string
          subtotal: number
          tax_amount: number
          total: number
          user_id: string
        }
        Insert: {
          cash_change?: number | null
          cash_given?: number | null
          created_at?: string | null
          discount_pct?: number
          id?: string
          items?: Json
          organization_id?: string | null
          payment_method?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          user_id: string
        }
        Update: {
          cash_change?: number | null
          cash_given?: number | null
          created_at?: string | null
          discount_pct?: number
          id?: string
          items?: Json
          organization_id?: string | null
          payment_method?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          imei: string | null
          is_active: boolean
          model: string | null
          name: string
          organization_id: string | null
          price: number | null
          product_id: string | null
          quantity: number | null
          reorder_level: number | null
          serial: string | null
          sku: string | null
          stock_warning: number | null
          storage_location: string | null
          supplier: string | null
          unit_cost: number | null
          upc: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          imei?: string | null
          is_active?: boolean
          model?: string | null
          name: string
          organization_id?: string | null
          price?: number | null
          product_id?: string | null
          quantity?: number | null
          reorder_level?: number | null
          serial?: string | null
          sku?: string | null
          stock_warning?: number | null
          storage_location?: string | null
          supplier?: string | null
          unit_cost?: number | null
          upc?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          imei?: string | null
          is_active?: boolean
          model?: string | null
          name?: string
          organization_id?: string | null
          price?: number | null
          product_id?: string | null
          quantity?: number | null
          reorder_level?: number | null
          serial?: string | null
          sku?: string | null
          stock_warning?: number | null
          storage_location?: string | null
          supplier?: string | null
          unit_cost?: number | null
          upc?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          company: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          shop_name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          shop_name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          shop_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string | null
          product_id: string | null
          purchase_order_id: string
          quantity: number
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          total_cost?: number | null
          unit_cost?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          total_cost?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          reference: string | null
          status: string | null
          supplier_name: string | null
          total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          reference?: string | null
          status?: string | null
          supplier_name?: string | null
          total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          reference?: string | null
          status?: string | null
          supplier_name?: string | null
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      repair_labor_services: {
        Row: {
          brand: string
          category: string
          country_code: string
          created_at: string
          id: string
          model: string
          organization_id: string | null
          price: number
          pricing_year: number | null
          repair_type_code: string
          service_name: string
          show_in_widget: boolean
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string
          category?: string
          country_code?: string
          created_at?: string
          id?: string
          model?: string
          organization_id?: string | null
          price?: number
          pricing_year?: number | null
          repair_type_code?: string
          service_name: string
          show_in_widget?: boolean
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          category?: string
          country_code?: string
          created_at?: string
          id?: string
          model?: string
          organization_id?: string | null
          price?: number
          pricing_year?: number | null
          repair_type_code?: string
          service_name?: string
          show_in_widget?: boolean
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_labor_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_labor_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_tickets: {
        Row: {
          apply_iva: boolean
          assigned_to: string | null
          budget_last_reminder_at: string | null
          budget_loss_reason: string | null
          budget_outcome: string | null
          budget_valid_until: string | null
          completed_at: string | null
          created_at: string | null
          customer_fiscal_id_ar: string | null
          customer_id: string | null
          customer_iva_condition_ar: string | null
          deposit_amount: number | null
          device_brand: string | null
          device_category: string | null
          device_model: string | null
          device_screen_inches: string | null
          device_type: string
          diagnostic_notes: string | null
          due_date: string | null
          estimated_cost: number | null
          final_cost: number | null
          follow_up_last_notified_at: string | null
          follow_up_notify_count: number
          follow_up_snoozed_until: string | null
          follow_up_started_at: string | null
          follow_up_wait_reason: string | null
          id: string
          imei: string | null
          is_draft: boolean | null
          is_urgent: boolean | null
          issue_description: string
          notes: string | null
          organization_id: string | null
          payment_method: string | null
          payment_status: string | null
          pin_pattern: string | null
          priority: string | null
          related_ticket_id: string | null
          repair_time: string | null
          return_related_invoice_id: string | null
          return_scenario: string | null
          return_settlement_method: string | null
          return_to_customer_amount: number | null
          return_to_customer_completed_at: string | null
          return_to_customer_note: string | null
          return_to_customer_recorded_at: string | null
          serial_number: string | null
          status: string | null
          task_type: string | null
          ticket_number: string
          updated_at: string | null
          user_id: string
          warranty_end_date: string | null
          warranty_info: string | null
          warranty_start_date: string | null
        }
        Insert: {
          apply_iva?: boolean
          assigned_to?: string | null
          budget_last_reminder_at?: string | null
          budget_loss_reason?: string | null
          budget_outcome?: string | null
          budget_valid_until?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_fiscal_id_ar?: string | null
          customer_id?: string | null
          customer_iva_condition_ar?: string | null
          deposit_amount?: number | null
          device_brand?: string | null
          device_category?: string | null
          device_model?: string | null
          device_screen_inches?: string | null
          device_type: string
          diagnostic_notes?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          follow_up_last_notified_at?: string | null
          follow_up_notify_count?: number
          follow_up_snoozed_until?: string | null
          follow_up_started_at?: string | null
          follow_up_wait_reason?: string | null
          id?: string
          imei?: string | null
          is_draft?: boolean | null
          is_urgent?: boolean | null
          issue_description: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pin_pattern?: string | null
          priority?: string | null
          related_ticket_id?: string | null
          repair_time?: string | null
          return_related_invoice_id?: string | null
          return_scenario?: string | null
          return_settlement_method?: string | null
          return_to_customer_amount?: number | null
          return_to_customer_completed_at?: string | null
          return_to_customer_note?: string | null
          return_to_customer_recorded_at?: string | null
          serial_number?: string | null
          status?: string | null
          task_type?: string | null
          ticket_number: string
          updated_at?: string | null
          user_id: string
          warranty_end_date?: string | null
          warranty_info?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          apply_iva?: boolean
          assigned_to?: string | null
          budget_last_reminder_at?: string | null
          budget_loss_reason?: string | null
          budget_outcome?: string | null
          budget_valid_until?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_fiscal_id_ar?: string | null
          customer_id?: string | null
          customer_iva_condition_ar?: string | null
          deposit_amount?: number | null
          device_brand?: string | null
          device_category?: string | null
          device_model?: string | null
          device_screen_inches?: string | null
          device_type?: string
          diagnostic_notes?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          follow_up_last_notified_at?: string | null
          follow_up_notify_count?: number
          follow_up_snoozed_until?: string | null
          follow_up_started_at?: string | null
          follow_up_wait_reason?: string | null
          id?: string
          imei?: string | null
          is_draft?: boolean | null
          is_urgent?: boolean | null
          issue_description?: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pin_pattern?: string | null
          priority?: string | null
          related_ticket_id?: string | null
          repair_time?: string | null
          return_related_invoice_id?: string | null
          return_scenario?: string | null
          return_settlement_method?: string | null
          return_to_customer_amount?: number | null
          return_to_customer_completed_at?: string | null
          return_to_customer_note?: string | null
          return_to_customer_recorded_at?: string | null
          serial_number?: string | null
          status?: string | null
          task_type?: string | null
          ticket_number?: string
          updated_at?: string | null
          user_id?: string
          warranty_end_date?: string | null
          warranty_info?: string | null
          warranty_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tickets_related_ticket_id_fkey"
            columns: ["related_ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tickets_return_related_invoice_id_fkey"
            columns: ["return_related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permissions: Json
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          permissions?: Json
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          permissions?: Json
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          inventory_item_id: string | null
          quantity: number | null
          sale_id: string
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          inventory_item_id?: string | null
          quantity?: number | null
          sale_id: string
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          inventory_item_id?: string | null
          quantity?: number | null
          sale_id?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          organization_id: string | null
          payment_method: string | null
          payment_status: string | null
          sale_number: string | null
          subtotal: number | null
          tax_amount: number | null
          ticket_id: string | null
          total: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          sale_number?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          ticket_id?: string | null
          total?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          sale_number?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          ticket_id?: string | null
          total?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_printer_nodes: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          printer_type: string
          qz_printer_name: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          printer_type?: string
          qz_printer_name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          printer_type?: string
          qz_printer_name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_printer_nodes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_printer_nodes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          accounting_method: string | null
          address: string | null
          alt_name: string | null
          ar_allow_invoice_without_afip: boolean
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          currency_symbol: string | null
          customer_notify_channels: Json
          decimal_places: string | null
          default_warranty: string | null
          delay_followup_settings: Json | null
          deposit_repairs: boolean | null
          email: string | null
          end_time: string | null
          fax: string | null
          footer_text: string | null
          id: string
          invoice_prefix: string | null
          invoice_show_terms: boolean | null
          iva_condition: string | null
          language: string | null
          logo_url: string | null
          organization_id: string | null
          panel_ui_mode: string
          phone: string | null
          phone2: string | null
          portal_allow_quote_approval: boolean
          portal_enabled: boolean
          portal_require_login: boolean
          portal_show_diagnostic_notes: boolean
          portal_show_invoices: boolean
          postal_code: string | null
          price_format: string | null
          qz_tray_certificate_label: string | null
          qz_tray_certificate_pem: string | null
          qz_tray_direct_invoice_print: boolean
          qz_tray_port: number
          qz_tray_using_secure: boolean
          receive_emails: boolean | null
          registration_number: string | null
          restocking_fee: boolean | null
          screen_timeout: string | null
          security_controls: Json
          shop_name: string | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_user: string
          start_time: string | null
          state: string | null
          tax_included: boolean | null
          tax_rate: number | null
          terms_text_ar: string | null
          terms_text_es: string | null
          ticket_prefix: string | null
          ticket_repairs_settings: Json
          time_format: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          accounting_method?: string | null
          address?: string | null
          alt_name?: string | null
          ar_allow_invoice_without_afip?: boolean
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          customer_notify_channels?: Json
          decimal_places?: string | null
          default_warranty?: string | null
          delay_followup_settings?: Json | null
          deposit_repairs?: boolean | null
          email?: string | null
          end_time?: string | null
          fax?: string | null
          footer_text?: string | null
          id?: string
          invoice_prefix?: string | null
          invoice_show_terms?: boolean | null
          iva_condition?: string | null
          language?: string | null
          logo_url?: string | null
          organization_id?: string | null
          panel_ui_mode?: string
          phone?: string | null
          phone2?: string | null
          portal_allow_quote_approval?: boolean
          portal_enabled?: boolean
          portal_require_login?: boolean
          portal_show_diagnostic_notes?: boolean
          portal_show_invoices?: boolean
          postal_code?: string | null
          price_format?: string | null
          qz_tray_certificate_label?: string | null
          qz_tray_certificate_pem?: string | null
          qz_tray_direct_invoice_print?: boolean
          qz_tray_port?: number
          qz_tray_using_secure?: boolean
          receive_emails?: boolean | null
          registration_number?: string | null
          restocking_fee?: boolean | null
          screen_timeout?: string | null
          security_controls?: Json
          shop_name?: string | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_user?: string
          start_time?: string | null
          state?: string | null
          tax_included?: boolean | null
          tax_rate?: number | null
          terms_text_ar?: string | null
          terms_text_es?: string | null
          ticket_prefix?: string | null
          ticket_repairs_settings?: Json
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          accounting_method?: string | null
          address?: string | null
          alt_name?: string | null
          ar_allow_invoice_without_afip?: boolean
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          customer_notify_channels?: Json
          decimal_places?: string | null
          default_warranty?: string | null
          delay_followup_settings?: Json | null
          deposit_repairs?: boolean | null
          email?: string | null
          end_time?: string | null
          fax?: string | null
          footer_text?: string | null
          id?: string
          invoice_prefix?: string | null
          invoice_show_terms?: boolean | null
          iva_condition?: string | null
          language?: string | null
          logo_url?: string | null
          organization_id?: string | null
          panel_ui_mode?: string
          phone?: string | null
          phone2?: string | null
          portal_allow_quote_approval?: boolean
          portal_enabled?: boolean
          portal_require_login?: boolean
          portal_show_diagnostic_notes?: boolean
          portal_show_invoices?: boolean
          postal_code?: string | null
          price_format?: string | null
          qz_tray_certificate_label?: string | null
          qz_tray_certificate_pem?: string | null
          qz_tray_direct_invoice_print?: boolean
          qz_tray_port?: number
          qz_tray_using_secure?: boolean
          receive_emails?: boolean | null
          registration_number?: string | null
          restocking_fee?: boolean | null
          screen_timeout?: string | null
          security_controls?: Json
          shop_name?: string | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_user?: string
          start_time?: string | null
          state?: string | null
          tax_included?: boolean | null
          tax_rate?: number | null
          terms_text_ar?: string | null
          terms_text_es?: string | null
          ticket_prefix?: string | null
          ticket_repairs_settings?: Json
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          billing_cycle: string | null
          created_at: string
          currency_id: string | null
          date_approved: string | null
          id: string
          mercado_pago_payment_id: string
          organization_id: string | null
          payment_method_id: string | null
          payment_type_id: string | null
          raw_payment: Json | null
          status: string
          transaction_amount: number
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          currency_id?: string | null
          date_approved?: string | null
          id?: string
          mercado_pago_payment_id: string
          organization_id?: string | null
          payment_method_id?: string | null
          payment_type_id?: string | null
          raw_payment?: Json | null
          status: string
          transaction_amount: number
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          currency_id?: string | null
          date_approved?: string | null
          id?: string
          mercado_pago_payment_id?: string
          organization_id?: string | null
          payment_method_id?: string | null
          payment_type_id?: string | null
          raw_payment?: Json | null
          status?: string
          transaction_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_organization_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_organization_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_organization_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_audit_log_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      polish_gemini_calls: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      support_bot_gemini_calls: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      support_chat_messages: {
        Row: {
          admin_sender_avatar_url: string | null
          admin_sender_display_name: string | null
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          is_bot_message: boolean
          organization_id: string | null
          sender: string
          user_id: string
        }
        Insert: {
          admin_sender_avatar_url?: string | null
          admin_sender_display_name?: string | null
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_bot_message?: boolean
          organization_id?: string | null
          sender: string
          user_id: string
        }
        Update: {
          admin_sender_avatar_url?: string | null
          admin_sender_display_name?: string | null
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_bot_message?: boolean
          organization_id?: string | null
          sender?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chat_threads: {
        Row: {
          bot_active: boolean
          client_reset_after_at: string | null
          priority: string
          status: string
          updated_at: string
          user_id: string
          user_last_read_message_id: string | null
        }
        Insert: {
          bot_active?: boolean
          client_reset_after_at?: string | null
          priority?: string
          status?: string
          updated_at?: string
          user_id: string
          user_last_read_message_id?: string | null
        }
        Update: {
          bot_active?: boolean
          client_reset_after_at?: string | null
          priority?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_last_read_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_threads_user_last_read_message_id_fkey"
            columns: ["user_last_read_message_id"]
            isOneToOne: false
            referencedRelation: "support_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      task_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      technicians: {
        Row: {
          clock_pin: string | null
          color: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          organization_id: string | null
          panel_user_id: string | null
          permissions: Json | null
          phone: string | null
          role: string
          shop_owner_id: string
          updated_at: string | null
        }
        Insert: {
          clock_pin?: string | null
          color?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          organization_id?: string | null
          panel_user_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          shop_owner_id: string
          updated_at?: string | null
        }
        Update: {
          clock_pin?: string | null
          color?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          panel_user_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          shop_owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_accessories: {
        Row: {
          created_at: string | null
          has_case: boolean | null
          has_charger: boolean | null
          has_headphones: boolean | null
          has_memory_card: boolean | null
          has_original_box: boolean | null
          has_pencil: boolean | null
          has_power_bank: boolean | null
          has_replacement: boolean | null
          has_sim: boolean | null
          has_usb_cable: boolean | null
          id: string
          notes: string | null
          shop_owner_id: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          has_case?: boolean | null
          has_charger?: boolean | null
          has_headphones?: boolean | null
          has_memory_card?: boolean | null
          has_original_box?: boolean | null
          has_pencil?: boolean | null
          has_power_bank?: boolean | null
          has_replacement?: boolean | null
          has_sim?: boolean | null
          has_usb_cable?: boolean | null
          id?: string
          notes?: string | null
          shop_owner_id: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          has_case?: boolean | null
          has_charger?: boolean | null
          has_headphones?: boolean | null
          has_memory_card?: boolean | null
          has_original_box?: boolean | null
          has_pencil?: boolean | null
          has_power_bank?: boolean | null
          has_replacement?: boolean | null
          has_sim?: boolean | null
          has_usb_cable?: boolean | null
          id?: string
          notes?: string | null
          shop_owner_id?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_accessories_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          author_name: string
          comment_type: string | null
          content: string
          created_at: string | null
          id: string
          immutable_comment: boolean
          is_private: boolean | null
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string
          comment_type?: string | null
          content: string
          created_at?: string | null
          id?: string
          immutable_comment?: boolean
          is_private?: boolean | null
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          comment_type?: string | null
          content?: string
          created_at?: string | null
          id?: string
          immutable_comment?: boolean
          is_private?: boolean | null
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_conditions: {
        Row: {
          back_camera: string | null
          battery_bad: string | null
          battery_fair: string | null
          battery_good: string | null
          bluetooth: string | null
          charging: string | null
          chassis_broken: string | null
          chassis_new: string | null
          chassis_used: string | null
          checked_by: string | null
          condition_type: string
          coverage: string | null
          created_at: string | null
          earpiece: string | null
          face_id: string | null
          front_camera: string | null
          home_button: string | null
          id: string
          lens_broken: string | null
          lens_new: string | null
          lens_used: string | null
          microphone: string | null
          notes: string | null
          power_button: string | null
          powers_on: string | null
          proximity_sensor: string | null
          restarts: string | null
          screen_broken: string | null
          screen_new: string | null
          screen_used: string | null
          screws: string | null
          shop_owner_id: string
          silent_button: string | null
          software: string | null
          speaker: string | null
          tampered: string | null
          ticket_id: string
          touch_id: string | null
          touchscreen: string | null
          updated_at: string | null
          vibrator: string | null
          volume_button: string | null
          wet_damage: string | null
          wifi: string | null
        }
        Insert: {
          back_camera?: string | null
          battery_bad?: string | null
          battery_fair?: string | null
          battery_good?: string | null
          bluetooth?: string | null
          charging?: string | null
          chassis_broken?: string | null
          chassis_new?: string | null
          chassis_used?: string | null
          checked_by?: string | null
          condition_type: string
          coverage?: string | null
          created_at?: string | null
          earpiece?: string | null
          face_id?: string | null
          front_camera?: string | null
          home_button?: string | null
          id?: string
          lens_broken?: string | null
          lens_new?: string | null
          lens_used?: string | null
          microphone?: string | null
          notes?: string | null
          power_button?: string | null
          powers_on?: string | null
          proximity_sensor?: string | null
          restarts?: string | null
          screen_broken?: string | null
          screen_new?: string | null
          screen_used?: string | null
          screws?: string | null
          shop_owner_id: string
          silent_button?: string | null
          software?: string | null
          speaker?: string | null
          tampered?: string | null
          ticket_id: string
          touch_id?: string | null
          touchscreen?: string | null
          updated_at?: string | null
          vibrator?: string | null
          volume_button?: string | null
          wet_damage?: string | null
          wifi?: string | null
        }
        Update: {
          back_camera?: string | null
          battery_bad?: string | null
          battery_fair?: string | null
          battery_good?: string | null
          bluetooth?: string | null
          charging?: string | null
          chassis_broken?: string | null
          chassis_new?: string | null
          chassis_used?: string | null
          checked_by?: string | null
          condition_type?: string
          coverage?: string | null
          created_at?: string | null
          earpiece?: string | null
          face_id?: string | null
          front_camera?: string | null
          home_button?: string | null
          id?: string
          lens_broken?: string | null
          lens_new?: string | null
          lens_used?: string | null
          microphone?: string | null
          notes?: string | null
          power_button?: string | null
          powers_on?: string | null
          proximity_sensor?: string | null
          restarts?: string | null
          screen_broken?: string | null
          screen_new?: string | null
          screen_used?: string | null
          screws?: string | null
          shop_owner_id?: string
          silent_button?: string | null
          software?: string | null
          speaker?: string | null
          tampered?: string | null
          ticket_id?: string
          touch_id?: string | null
          touchscreen?: string | null
          updated_at?: string | null
          vibrator?: string | null
          volume_button?: string | null
          wet_damage?: string | null
          wifi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_conditions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_images: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          id: string
          image_type: string
          image_url: string
          shop_owner_id: string
          thumbnail_url: string | null
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_type: string
          image_url: string
          shop_owner_id: string
          thumbnail_url?: string | null
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_type?: string
          image_url?: string
          shop_owner_id?: string
          thumbnail_url?: string | null
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_images_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_inventory_items: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          quantity_used: number
          shop_owner_id: string
          ticket_id: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity_used?: number
          shop_owner_id: string
          ticket_id: string
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity_used?: number
          shop_owner_id?: string
          ticket_id?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_inventory_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_inventory_items_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_parts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          inventory_item_id: string | null
          part_name: string
          part_number: string | null
          product_id: string | null
          quantity: number
          shop_owner_id: string
          supplier: string | null
          ticket_id: string
          total_cost: number
          unit_cost: number
          updated_at: string | null
          warranty_days: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          part_name: string
          part_number?: string | null
          product_id?: string | null
          quantity?: number
          shop_owner_id: string
          supplier?: string | null
          ticket_id: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string | null
          warranty_days?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          part_name?: string
          part_number?: string | null
          product_id?: string | null
          quantity?: number
          shop_owner_id?: string
          supplier?: string | null
          ticket_id?: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string | null
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_parts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_parts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_statuses: {
        Row: {
          category: string
          color: string
          created_at: string | null
          dot_color: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          sort_order: number | null
          user_id: string
          value: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string | null
          dot_color?: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          sort_order?: number | null
          user_id: string
          value: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string | null
          dot_color?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          sort_order?: number | null
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          created_at: string | null
          customer_name: string | null
          device_model: string | null
          id: string
          organization_id: string | null
          status: string | null
          ticket_number: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          device_model?: string | null
          id?: string
          organization_id?: string | null
          status?: string | null
          ticket_number?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          device_model?: string | null
          id?: string
          organization_id?: string | null
          status?: string | null
          ticket_number?: string | null
        }
        Relationships: []
      }
      time_records: {
        Row: {
          created_at: string
          id: string
          note: string | null
          organization_id: string | null
          technician_id: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          technician_id?: string | null
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          technician_id?: string | null
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_records_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      user_panel_sessions: {
        Row: {
          client_key: string
          created_at: string
          id: string
          ip_address: string | null
          last_active_at: string
          location_label: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          client_key: string
          created_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          location_label?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          client_key?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          location_label?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wiki_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          organization_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organization_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_organization_stats: {
        Row: {
          active_users: number | null
          billing_cycle: string | null
          completed_tickets: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          effective_status: string | null
          id: string | null
          last_ticket_date: string | null
          license_expires_at: string | null
          license_unlimited: boolean | null
          max_tickets: number | null
          max_users: number | null
          name: string | null
          owner_email: string | null
          pending_tickets: number | null
          plan_type: string | null
          slug: string | null
          subscription_plan: string | null
          subscription_status: string | null
          total_customers: number | null
          total_inventory_items: number | null
          total_tickets: number | null
          trial_ends_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      clock_punch: {
        Args: {
          p_note?: string
          p_pin?: string
          p_technician_id: string
          p_type: string
        }
        Returns: Json
      }
      create_ticket_assignment_notifications: {
        Args: {
          p_device_summary: string
          p_organization_id: string
          p_technician_ref: string
          p_ticket_id: string
          p_ticket_number: string
        }
        Returns: Json
      }
      delete_organization: { Args: { p_org_id: string }; Returns: undefined }
      generate_org_slug: { Args: { org_name: string }; Returns: string }
      get_admin_organization_stats: {
        Args: never
        Returns: {
          active_users: number
          completed_tickets: number
          created_at: string
          effective_status: string
          id: string
          last_ticket_date: string
          max_tickets: number
          max_users: number
          name: string
          owner_email: string
          pending_tickets: number
          slug: string
          subscription_plan: string
          subscription_status: string
          total_customers: number
          total_inventory_items: number
          total_tickets: number
          trial_ends_at: string
        }[]
      }
      get_all_organizations: {
        Args: never
        Returns: {
          created_at: string
          features: Json
          id: string
          max_tickets: number
          max_users: number
          name: string
          owner_id: string
          settings: Json
          slug: string
          subscription_plan: string
          subscription_status: string
          trial_ends_at: string
          updated_at: string
        }[]
      }
      get_panel_user_for_technician_assignment: {
        Args: { p_organization_id: string; p_technician_id: string }
        Returns: string
      }
      get_dashboard_repair_payments_by_method: {
        Args: {
          p_filter_user_id?: string
          p_from: string
          p_organization_id: string | null
          p_to: string
        }
        Returns: Json
      }
      get_dashboard_repair_payments_daily: {
        Args: {
          p_filter_user_id?: string
          p_from: string
          p_organization_id: string | null
          p_to: string
        }
        Returns: Json
      }
      get_dashboard_repair_payments_sum: {
        Args: {
          p_filter_user_id?: string
          p_from: string
          p_organization_id: string | null
          p_to: string
        }
        Returns: number
      }
      get_pos_sales_dashboard_aggregates: {
        Args: {
          p_filter_user_id?: string
          p_from: string
          p_organization_id: string
          p_to: string
        }
        Returns: Json
      }
      get_super_admin_id: { Args: never; Returns: string }
      get_technician_assignee_avatar_url: {
        Args: { p_organization_id: string; p_technician_id: string }
        Returns: string
      }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_role_in_org: { Args: { org_id: string }; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      log_super_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_org_id?: string
          p_target_user_id?: string
        }
        Returns: undefined
      }
      next_boleto_ticket_number: {
        Args: { p_organization_id: string; p_style?: string }
        Returns: string
      }
      organization_invoice_open_balance: {
        Args: { p_organization_id: string }
        Returns: number
      }
      purge_chat_messages_older_than_7_days: { Args: never; Returns: number }
      search_wiki_articles: {
        Args: { max_results?: number; q: string }
        Returns: {
          category: string
          content: string
          id: string
          title: string
        }[]
      }
      support_chat_client_finalize_session: { Args: never; Returns: undefined }
      support_chat_mark_last_read: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      technician_in_organization_scope: {
        Args: { p_organization_id: string; p_technician_id: string }
        Returns: boolean
      }
      user_belongs_to_org: { Args: { org_id: string }; Returns: boolean }
      user_organization_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
