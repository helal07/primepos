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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          module: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          module?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          module?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          selfie_url: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          selfie_url?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          selfie_url?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string | null
          content: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_media: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          slug: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_credentials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          pathao_access_token: string | null
          pathao_base_url: string | null
          pathao_client_id: string | null
          pathao_client_secret: string | null
          pathao_password: string | null
          pathao_refresh_token: string | null
          pathao_store_id: string | null
          pathao_token_expires_at: string | null
          pathao_username: string | null
          provider: string
          steadfast_api_key: string | null
          steadfast_base_url: string | null
          steadfast_secret_key: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          pathao_access_token?: string | null
          pathao_base_url?: string | null
          pathao_client_id?: string | null
          pathao_client_secret?: string | null
          pathao_password?: string | null
          pathao_refresh_token?: string | null
          pathao_store_id?: string | null
          pathao_token_expires_at?: string | null
          pathao_username?: string | null
          provider: string
          steadfast_api_key?: string | null
          steadfast_base_url?: string | null
          steadfast_secret_key?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          pathao_access_token?: string | null
          pathao_base_url?: string | null
          pathao_client_id?: string | null
          pathao_client_secret?: string | null
          pathao_password?: string | null
          pathao_refresh_token?: string | null
          pathao_store_id?: string | null
          pathao_token_expires_at?: string | null
          pathao_username?: string | null
          provider?: string
          steadfast_api_key?: string | null
          steadfast_base_url?: string | null
          steadfast_secret_key?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          selling_price_group_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          selling_price_group_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          selling_price_group_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_groups_selling_price_group_id_fkey"
            columns: ["selling_price_group_id"]
            isOneToOne: false
            referencedRelation: "selling_price_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          balance: number
          company: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          customer_group_id: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tax_number: string | null
          tenant_id: string | null
          total_purchases: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          company?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_group_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          tenant_id?: string | null
          total_purchases?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          company?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_group_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          tenant_id?: string | null
          total_purchases?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_customer_group_id_fkey"
            columns: ["customer_group_id"]
            isOneToOne: false
            referencedRelation: "customer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_name: string | null
          created_at: string
          created_by: string | null
          department: string | null
          designation: string | null
          email: string | null
          emergency_contact: string | null
          id: string
          joining_date: string
          name: string
          notes: string | null
          phone: string | null
          salary: number
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          emergency_contact?: string | null
          id?: string
          joining_date?: string
          name: string
          notes?: string | null
          phone?: string | null
          salary?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          emergency_contact?: string | null
          id?: string
          joining_date?: string
          name?: string
          notes?: string | null
          phone?: string | null
          salary?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_purchases: {
        Row: {
          brand: string | null
          condition_notes: string | null
          created_at: string
          created_by: string | null
          goods_photos: string[]
          id: string
          imei: string | null
          linked_product_id: string | null
          linked_sale_id: string | null
          linked_variation_id: string | null
          model: string | null
          notes: string | null
          paid_amount: number
          payment_method: string
          product_name: string
          purchase_date: string
          purchase_price: number
          reference_no: string
          seller_address: string | null
          seller_name: string
          seller_nid_no: string | null
          seller_nid_url: string | null
          seller_phone: string | null
          seller_photo_url: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          condition_notes?: string | null
          created_at?: string
          created_by?: string | null
          goods_photos?: string[]
          id?: string
          imei?: string | null
          linked_product_id?: string | null
          linked_sale_id?: string | null
          linked_variation_id?: string | null
          model?: string | null
          notes?: string | null
          paid_amount?: number
          payment_method?: string
          product_name: string
          purchase_date?: string
          purchase_price?: number
          reference_no?: string
          seller_address?: string | null
          seller_name: string
          seller_nid_no?: string | null
          seller_nid_url?: string | null
          seller_phone?: string | null
          seller_photo_url?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          condition_notes?: string | null
          created_at?: string
          created_by?: string | null
          goods_photos?: string[]
          id?: string
          imei?: string | null
          linked_product_id?: string | null
          linked_sale_id?: string | null
          linked_variation_id?: string | null
          model?: string | null
          notes?: string | null
          paid_amount?: number
          payment_method?: string
          product_name?: string
          purchase_date?: string
          purchase_price?: number
          reference_no?: string
          seller_address?: string | null
          seller_name?: string
          seller_nid_no?: string | null
          seller_nid_url?: string | null
          seller_phone?: string | null
          seller_photo_url?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      installment_collections: {
        Row: {
          amount: number
          collected_at: string
          collected_by: string | null
          id: string
          installment_sale_id: string
          notes: string | null
          payment_method: string
          schedule_id: string
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          collected_at?: string
          collected_by?: string | null
          id?: string
          installment_sale_id: string
          notes?: string | null
          payment_method?: string
          schedule_id: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          collected_at?: string
          collected_by?: string | null
          id?: string
          installment_sale_id?: string
          notes?: string | null
          payment_method?: string
          schedule_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_collections_installment_sale_id_fkey"
            columns: ["installment_sale_id"]
            isOneToOne: false
            referencedRelation: "installment_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_collections_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "installment_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_customers: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          guarantor_mobile: string | null
          guarantor_name: string | null
          guarantor_nid_url: string | null
          guarantor_permanent_address: string | null
          guarantor_photo_url: string | null
          guarantor_present_address: string | null
          guarantor_work_address: string | null
          id: string
          nid_url: string | null
          permanent_address: string | null
          photo_url: string | null
          tenant_id: string | null
          work_address: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          guarantor_mobile?: string | null
          guarantor_name?: string | null
          guarantor_nid_url?: string | null
          guarantor_permanent_address?: string | null
          guarantor_photo_url?: string | null
          guarantor_present_address?: string | null
          guarantor_work_address?: string | null
          id?: string
          nid_url?: string | null
          permanent_address?: string | null
          photo_url?: string | null
          tenant_id?: string | null
          work_address?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          guarantor_mobile?: string | null
          guarantor_name?: string | null
          guarantor_nid_url?: string | null
          guarantor_permanent_address?: string | null
          guarantor_photo_url?: string | null
          guarantor_present_address?: string | null
          guarantor_work_address?: string | null
          id?: string
          nid_url?: string | null
          permanent_address?: string | null
          photo_url?: string | null
          tenant_id?: string | null
          work_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          down_payment: number
          down_payment_account: string
          id: string
          imei_serial: string | null
          installment_customer_id: string | null
          installment_duration_days: number
          interest_percent: number
          invoice_no: string
          notes: string | null
          num_installments: number
          price: number
          product_id: string | null
          remaining_amount: number
          sale_date: string
          shipping_cost: number
          status: string
          tenant_id: string | null
          total_amount: number
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          down_payment?: number
          down_payment_account?: string
          id?: string
          imei_serial?: string | null
          installment_customer_id?: string | null
          installment_duration_days?: number
          interest_percent?: number
          invoice_no?: string
          notes?: string | null
          num_installments?: number
          price?: number
          product_id?: string | null
          remaining_amount?: number
          sale_date?: string
          shipping_cost?: number
          status?: string
          tenant_id?: string | null
          total_amount?: number
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          down_payment?: number
          down_payment_account?: string
          id?: string
          imei_serial?: string | null
          installment_customer_id?: string | null
          installment_duration_days?: number
          interest_percent?: number
          invoice_no?: string
          notes?: string | null
          num_installments?: number
          price?: number
          product_id?: string | null
          remaining_amount?: number
          sale_date?: string
          shipping_cost?: number
          status?: string
          tenant_id?: string | null
          total_amount?: number
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_sales_installment_customer_id_fkey"
            columns: ["installment_customer_id"]
            isOneToOne: false
            referencedRelation: "installment_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_sales_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_schedules: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_sale_id: string
          paid_amount: number
          paid_date: string | null
          serial_no: number
          status: string
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          id?: string
          installment_sale_id: string
          paid_amount?: number
          paid_date?: string | null
          serial_no: number
          status?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_sale_id?: string
          paid_amount?: number
          paid_date?: string | null
          serial_no?: number
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_schedules_installment_sale_id_fkey"
            columns: ["installment_sale_id"]
            isOneToOne: false
            referencedRelation: "installment_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          id: string
          reference: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          reference?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          reference?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
          tenant_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          tenant_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway: string
          gateway_ref: string | null
          id: string
          package_id: string | null
          raw_payload: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          gateway: string
          gateway_ref?: string | null
          id?: string
          package_id?: string | null
          raw_payload?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway?: string
          gateway_ref?: string | null
          id?: string
          package_id?: string | null
          raw_payload?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "saas_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_credentials: {
        Row: {
          config: Json
          created_at: string
          gateway_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          gateway_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          gateway_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_credentials_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: true
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          account_number: string | null
          account_type: string | null
          active: boolean
          config: Json
          created_at: string
          display_name: string
          id: string
          instructions: string | null
          logo_url: string | null
          mode: string
          provider: string
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          active?: boolean
          config?: Json
          created_at?: string
          display_name: string
          id?: string
          instructions?: string | null
          logo_url?: string | null
          mode?: string
          provider: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          active?: boolean
          config?: Json
          created_at?: string
          display_name?: string
          id?: string
          instructions?: string | null
          logo_url?: string | null
          mode?: string
          provider?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      payroll: {
        Row: {
          allowances: number
          basic_salary: number
          created_at: string
          created_by: string | null
          deductions: number
          employee_id: string
          id: string
          month: number
          net_salary: number
          notes: string | null
          overtime: number
          paid_date: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          allowances?: number
          basic_salary?: number
          created_at?: string
          created_by?: string | null
          deductions?: number
          employee_id: string
          id?: string
          month: number
          net_salary?: number
          notes?: string | null
          overtime?: number
          paid_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          allowances?: number
          basic_salary?: number
          created_at?: string
          created_by?: string | null
          deductions?: number
          employee_id?: string
          id?: string
          month?: number
          net_salary?: number
          notes?: string | null
          overtime?: number
          paid_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_group_prices: {
        Row: {
          created_at: string
          id: string
          price: number
          price_type: string
          product_id: string
          selling_price_group_id: string
          tenant_id: string | null
          updated_at: string
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number
          price_type?: string
          product_id: string
          selling_price_group_id: string
          tenant_id?: string | null
          updated_at?: string
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          price_type?: string
          product_id?: string
          selling_price_group_id?: string
          tenant_id?: string | null
          updated_at?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_group_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_group_prices_selling_price_group_id_fkey"
            columns: ["selling_price_group_id"]
            isOneToOne: false
            referencedRelation: "selling_price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_group_prices_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          alert_quantity: number
          barcode: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          product_id: string
          purchase_price: number
          selling_price: number
          sku: string | null
          stock_quantity: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          alert_quantity?: number
          barcode?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          product_id: string
          purchase_price?: number
          selling_price?: number
          sku?: string | null
          stock_quantity?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_quantity?: number
          barcode?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          purchase_price?: number
          selling_price?: number
          sku?: string | null
          stock_quantity?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          alert_quantity: number
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          gallery_urls: string[]
          has_warranty: boolean
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          product_type: string
          purchase_price: number
          selling_price: number
          serial_tracking: boolean
          show_on_website: boolean
          sku: string | null
          stock_quantity: number
          tax_percent: number
          tenant_id: string | null
          unit_id: string | null
          updated_at: string
          warranty_duration: number | null
          warranty_type: string | null
          website_description: string | null
          website_slug: string | null
        }
        Insert: {
          alert_quantity?: number
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gallery_urls?: string[]
          has_warranty?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          product_type?: string
          purchase_price?: number
          selling_price?: number
          serial_tracking?: boolean
          show_on_website?: boolean
          sku?: string | null
          stock_quantity?: number
          tax_percent?: number
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
          warranty_duration?: number | null
          warranty_type?: string | null
          website_description?: string | null
          website_slug?: string | null
        }
        Update: {
          alert_quantity?: number
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gallery_urls?: string[]
          has_warranty?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          product_type?: string
          purchase_price?: number
          selling_price?: number
          serial_tracking?: boolean
          show_on_website?: boolean
          sku?: string | null
          stock_quantity?: number
          tax_percent?: number
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
          warranty_duration?: number | null
          warranty_type?: string | null
          website_description?: string | null
          website_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          company: string | null
          created_at: string
          display_name: string | null
          id: string
          id_proof_name: string | null
          id_proof_url: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          id_proof_name?: string | null
          id_proof_url?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          id_proof_name?: string | null
          id_proof_url?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          product_id: string
          purchase_id: string
          quantity: number
          received_quantity: number
          serial_number: string | null
          tax_percent: number
          tenant_id: string | null
          total: number
          unit_cost: number
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          product_id: string
          purchase_id: string
          quantity?: number
          received_quantity?: number
          serial_number?: string | null
          tax_percent?: number
          tenant_id?: string | null
          total?: number
          unit_cost?: number
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          product_id?: string
          purchase_id?: string
          quantity?: number
          received_quantity?: number
          serial_number?: string | null
          tax_percent?: number
          tenant_id?: string | null
          total?: number
          unit_cost?: number
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          tenant_id: string | null
          total: number
          unit_cost: number
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          purchase_order_id: string
          quantity?: number
          tenant_id?: string | null
          total?: number
          unit_cost?: number
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          tenant_id?: string | null
          total?: number
          unit_cost?: number
          variation_id?: string | null
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
          {
            foreignKeyName: "purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          reference_number: string
          status: string
          supplier_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          reference_number?: string
          status?: string
          supplier_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          reference_number?: string
          status?: string
          supplier_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          payment_note: string | null
          purchase_id: string
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_note?: string | null
          purchase_id: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_note?: string | null
          purchase_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          discount_amount: number
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          purchase_date: string
          reference_number: string
          shipping_cost: number
          status: string
          subtotal: number
          supplier_id: string | null
          tax_amount: number
          tenant_id: string | null
          total_amount: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          purchase_date?: string
          reference_number?: string
          shipping_cost?: number
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          purchase_date?: string
          reference_number?: string
          shipping_cost?: number
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role_id: string
          tenant_id: string | null
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role_id: string
          tenant_id?: string | null
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_packages: {
        Row: {
          created_at: string
          duration_days: number
          enabled_modules: string[]
          features: Json
          id: string
          is_active: boolean
          is_popular: boolean
          max_business_location: number
          max_invoice: number
          max_users: number
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days?: number
          enabled_modules?: string[]
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          max_business_location?: number
          max_invoice?: number
          max_users?: number
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          enabled_modules?: string[]
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          max_business_location?: number
          max_invoice?: number
          max_users?: number
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          product_id: string
          quantity: number
          sale_id: string
          serial_number: string | null
          tax_percent: number
          tenant_id: string | null
          total: number
          unit_price: number
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          product_id: string
          quantity?: number
          sale_id: string
          serial_number?: string | null
          tax_percent?: number
          tenant_id?: string | null
          total?: number
          unit_price?: number
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          serial_number?: string | null
          tax_percent?: number
          tenant_id?: string | null
          total?: number
          unit_price?: number
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          payment_note: string | null
          sale_id: string
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_note?: string | null
          sale_id: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_note?: string | null
          sale_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number
          discount_type: string | null
          discount_value: number
          exchange_purchase_id: string | null
          id: string
          invoice_number: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          sale_date: string
          shipping_cost: number
          source: string
          status: string
          subtotal: number
          tax_amount: number
          tenant_id: string | null
          total_amount: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number
          exchange_purchase_id?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          sale_date?: string
          shipping_cost?: number
          source?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number
          exchange_purchase_id?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          sale_date?: string
          shipping_cost?: number
          source?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
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
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      selling_price_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipment_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          shipment_id: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          shipment_id: string
          status: string
          tenant_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          shipment_id?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_status_history_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          city: string | null
          courier: string | null
          courier_consignment_id: string | null
          courier_label_url: string | null
          courier_payload: Json | null
          courier_provider: string | null
          courier_status: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sale_id: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_cost: number
          status: string
          tenant_id: string | null
          tracking_no: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          city?: string | null
          courier?: string | null
          courier_consignment_id?: string | null
          courier_label_url?: string | null
          courier_payload?: Json | null
          courier_provider?: string | null
          courier_status?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sale_id?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_cost?: number
          status?: string
          tenant_id?: string | null
          tracking_no?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          city?: string | null
          courier?: string | null
          courier_consignment_id?: string | null
          courier_label_url?: string | null
          courier_payload?: Json | null
          courier_provider?: string | null
          courier_status?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sale_id?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_cost?: number
          status?: string
          tenant_id?: string | null
          tracking_no?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sitemap_entries: {
        Row: {
          changefreq: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          path: string
          priority: number
          updated_at: string
        }
        Insert: {
          changefreq?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          path: string
          priority?: number
          updated_at?: string
        }
        Update: {
          changefreq?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          path?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sms_count: number
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sms_count?: number
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sms_count?: number
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: []
      }
      sms_providers: {
        Row: {
          api_key: string | null
          api_secret: string | null
          base_url: string | null
          created_at: string
          created_by: string | null
          gateway_type: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          gateway_type?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          gateway_type?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_purchases: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          plan_id: string | null
          purchased_at: string
          reference_no: string | null
          sms_count: number
          status: string
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          purchased_at?: string
          reference_no?: string | null
          sms_count?: number
          status?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          purchased_at?: string
          reference_no?: string | null
          sms_count?: number
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_purchases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "sms_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity_change: number
          reason: string
          tenant_id: string | null
          type: string
          variation_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          adjusted_by: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity_change: number
          reason: string
          tenant_id?: string | null
          type?: string
          variation_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          adjusted_by?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity_change?: number
          reason?: string
          tenant_id?: string | null
          type?: string
          variation_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string
          from_branch: string
          from_warehouse_id: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          status: string
          tenant_id: string | null
          to_branch: string
          to_warehouse_id: string | null
          updated_at: string
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          from_branch?: string
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          status?: string
          tenant_id?: string | null
          to_branch: string
          to_warehouse_id?: string | null
          updated_at?: string
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          from_branch?: string
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          status?: string
          tenant_id?: string | null
          to_branch?: string
          to_warehouse_id?: string | null
          updated_at?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_collection_products: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "store_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_layout_sections: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_visible: boolean
          section_key: string
          sort_order: number
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          section_key: string
          sort_order?: number
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          section_key?: string
          sort_order?: number
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          tenant_id: string
          total: number
          unit_price: number
          variation_id: string | null
          variation_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          tenant_id: string
          total?: number
          unit_price?: number
          variation_id?: string | null
          variation_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
          variation_id?: string | null
          variation_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          cancelled_at: string | null
          city: string | null
          confirmed_at: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          discount_amount: number
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          payment_ref: string | null
          payment_status: string
          sale_id: string | null
          shipment_id: string | null
          shipping_address: string
          shipping_cost: number
          status: string
          subtotal: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          city?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string
          payment_ref?: string | null
          payment_status?: string
          sale_id?: string | null
          shipment_id?: string | null
          shipping_address: string
          shipping_cost?: number
          status?: string
          subtotal?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          city?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_ref?: string | null
          payment_status?: string
          sale_id?: string | null
          shipment_id?: string | null
          shipping_address?: string
          shipping_cost?: number
          status?: string
          subtotal?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          about_html: string | null
          address: string | null
          banner_url: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          enable_bkash: boolean
          enable_cod: boolean
          enable_sslcommerz: boolean
          enabled: boolean
          facebook_url: string | null
          footer_html: string | null
          free_shipping_threshold: number | null
          hero_cta_label: string | null
          hero_cta_url: string | null
          hero_heading: string | null
          hero_subheading: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          primary_color: string | null
          shipping_flat_rate: number
          store_name: string | null
          tagline: string | null
          tenant_id: string
          theme: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          about_html?: string | null
          address?: string | null
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          enable_bkash?: boolean
          enable_cod?: boolean
          enable_sslcommerz?: boolean
          enabled?: boolean
          facebook_url?: string | null
          footer_html?: string | null
          free_shipping_threshold?: number | null
          hero_cta_label?: string | null
          hero_cta_url?: string | null
          hero_heading?: string | null
          hero_subheading?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_color?: string | null
          shipping_flat_rate?: number
          store_name?: string | null
          tagline?: string | null
          tenant_id: string
          theme?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          about_html?: string | null
          address?: string | null
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          enable_bkash?: boolean
          enable_cod?: boolean
          enable_sslcommerz?: boolean
          enabled?: boolean
          facebook_url?: string | null
          footer_html?: string | null
          free_shipping_threshold?: number | null
          hero_cta_label?: string | null
          hero_cta_url?: string | null
          hero_heading?: string | null
          hero_subheading?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_color?: string | null
          shipping_flat_rate?: number
          store_name?: string | null
          tagline?: string | null
          tenant_id?: string
          theme?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tax_number: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_actions_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by: string
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_actions_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          ends_on: string | null
          id: string
          notes: string | null
          package_id: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_method: string
          payment_reference: string | null
          proof_url: string | null
          starts_on: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          ends_on?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string
          payment_reference?: string | null
          proof_url?: string | null
          starts_on?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          ends_on?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string
          payment_reference?: string | null
          proof_url?: string | null
          starts_on?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "saas_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          db_name: string | null
          domain: string | null
          domain_verified_at: string | null
          email: string | null
          enabled_modules: string[] | null
          id: string
          last_login_at: string | null
          name: string
          notes: string | null
          owner_user_id: string
          package_id: string | null
          phone: string | null
          slug: string | null
          status: string
          subscription_end: string | null
          subscription_start: string
          subscription_type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          db_name?: string | null
          domain?: string | null
          domain_verified_at?: string | null
          email?: string | null
          enabled_modules?: string[] | null
          id?: string
          last_login_at?: string | null
          name: string
          notes?: string | null
          owner_user_id: string
          package_id?: string | null
          phone?: string | null
          slug?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string
          subscription_type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          db_name?: string | null
          domain?: string | null
          domain_verified_at?: string | null
          email?: string | null
          enabled_modules?: string[] | null
          id?: string
          last_login_at?: string | null
          name?: string
          notes?: string | null
          owner_user_id?: string
          package_id?: string | null
          phone?: string | null
          slug?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string
          subscription_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "saas_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string | null
          reference: string | null
          tenant_id: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          reference?: string | null
          tenant_id?: string | null
          transaction_date?: string
          type?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          reference?: string | null
          tenant_id?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          short_name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          short_name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_stock: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          tenant_id: string | null
          updated_at: string
          variation_id: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          tenant_id?: string | null
          updated_at?: string
          variation_id?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string | null
          updated_at?: string
          variation_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          code: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      warranties: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration: number
          duration_type: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number
          duration_type?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number
          duration_type?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      warranty_claims: {
        Row: {
          claim_date: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          issue_description: string
          notes: string | null
          product_id: string | null
          resolution: string | null
          resolved_date: string | null
          sale_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          claim_date?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          issue_description: string
          notes?: string | null
          product_id?: string | null
          resolution?: string | null
          resolved_date?: string | null
          sale_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          claim_date?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          issue_description?: string
          notes?: string | null
          product_id?: string | null
          resolution?: string | null
          resolved_date?: string | null
          sale_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          session_token: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          session_token: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          session_token?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_tenant_after_payment: {
        Args: {
          _amount: number
          _gateway: string
          _gateway_ref: string
          _tenant_id: string
        }
        Returns: Json
      }
      apply_warehouse_stock_delta: {
        Args: {
          _delta: number
          _product_id: string
          _tenant_id: string
          _variation_id: string
          _warehouse_id: string
        }
        Returns: undefined
      }
      cancel_store_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      confirm_store_order: { Args: { p_order_id: string }; Returns: string }
      ensure_default_warehouse: {
        Args: { _tenant_id: string }
        Returns: string
      }
      generate_installment_invoice: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_store_order_number: { Args: never; Returns: string }
      get_tenant_by_host: {
        Args: { _host: string }
        Returns: {
          domain: string
          domain_verified_at: string
          id: string
          name: string
          slug: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_module_permission: {
        Args: { _module: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_manager_or_above: {
        Args: { _user_id: string }
        Returns: boolean
      }
      place_store_order: {
        Args: {
          p_city: string
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_notes: string
          p_payment_method: string
          p_shipping_address: string
          p_tenant_slug: string
        }
        Returns: Json
      }
      tenant_has_module: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
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
