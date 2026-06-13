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
      app_settings: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string
          company_npwp: string | null
          company_phone: string | null
          created_at: string
          default_tax_percent: number
          id: string
          invoice_footer: string | null
          invoice_template: string
          receipt_template: string
          signature_url: string | null
          signer_name: string | null
          stamp_url: string | null
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_npwp?: string | null
          company_phone?: string | null
          created_at?: string
          default_tax_percent?: number
          id?: string
          invoice_footer?: string | null
          invoice_template?: string
          receipt_template?: string
          signature_url?: string | null
          signer_name?: string | null
          stamp_url?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_npwp?: string | null
          company_phone?: string | null
          created_at?: string
          default_tax_percent?: number
          id?: string
          invoice_footer?: string | null
          invoice_template?: string
          receipt_template?: string
          signature_url?: string | null
          signer_name?: string | null
          stamp_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      customer_import_logs: {
        Row: {
          created_at: string
          details: Json | null
          failed_rows: number
          id: string
          imported_by: string | null
          imported_by_email: string | null
          success_rows: number
          total_rows: number
          updated_rows: number
        }
        Insert: {
          created_at?: string
          details?: Json | null
          failed_rows?: number
          id?: string
          imported_by?: string | null
          imported_by_email?: string | null
          success_rows?: number
          total_rows?: number
          updated_rows?: number
        }
        Update: {
          created_at?: string
          details?: Json | null
          failed_rows?: number
          id?: string
          imported_by?: string | null
          imported_by_email?: string | null
          success_rows?: number
          total_rows?: number
          updated_rows?: number
        }
        Relationships: []
      }
      document_signatories: {
        Row: {
          created_at: string
          document_id: string
          id: string
          name: string | null
          party_label: string
          position: string | null
          signature_url: string | null
          sort_order: number
          stamp_url: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          name?: string | null
          party_label?: string
          position?: string | null
          signature_url?: string | null
          sort_order?: number
          stamp_url?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          name?: string | null
          party_label?: string
          position?: string | null
          signature_url?: string | null
          sort_order?: number
          stamp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatories_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_status_histories: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          document_id: string
          id: string
          new_status: Database["public"]["Enums"]["document_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["document_status"] | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          document_id: string
          id?: string
          new_status: Database["public"]["Enums"]["document_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["document_status"] | null
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          document_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["document_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["document_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "document_status_histories_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          description: string | null
          document_type_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          document_type_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          document_type_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          number_format: string
          number_prefix: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          number_format?: string
          number_prefix: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          number_format?: string
          number_prefix?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          customer_id: string | null
          document_date: string
          document_number: string
          document_type_id: string
          effective_date: string | null
          expiry_date: string | null
          finalized_at: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["document_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          customer_id?: string | null
          document_date?: string
          document_number: string
          document_type_id: string
          effective_date?: string | null
          expiry_date?: string | null
          finalized_at?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          customer_id?: string | null
          document_date?: string
          document_number?: string
          document_type_id?: string
          effective_date?: string | null
          expiry_date?: string | null
          finalized_at?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          alamat: string | null
          catatan: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nama_pelanggan: string
          nama_perusahaan: string | null
          npwp: string | null
          pic: string | null
          status_aktif: boolean
          telepon: string | null
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nama_pelanggan: string
          nama_perusahaan?: string | null
          npwp?: string | null
          pic?: string | null
          status_aktif?: boolean
          telepon?: string | null
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nama_pelanggan?: string
          nama_perusahaan?: string | null
          npwp?: string | null
          pic?: string | null
          status_aktif?: boolean
          telepon?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_archives: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          doc_number: string
          doc_type: string
          entity_id: string | null
          file_name: string
          id: string
          month: number
          size_bytes: number | null
          storage_path: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          doc_number: string
          doc_type: string
          entity_id?: string | null
          file_name: string
          id?: string
          month: number
          size_bytes?: number | null
          storage_path: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
      platform_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tenant_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan: string
          started_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: string
          started_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: string
          started_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activated_at: string | null
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          npwp: string | null
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          npwp?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          npwp?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
          doc_number?: string
          doc_type?: string
          entity_id?: string | null
          file_name?: string
          id?: string
          month?: number
          size_bytes?: number | null
          storage_path?: string
          year?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_percent: number
          id: string
          invoice_id: string
          position: number
          price: number
          qty: number
          subtotal: number
          tax_percent: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          description: string
          discount_percent?: number
          id?: string
          invoice_id: string
          position?: number
          price?: number
          qty?: number
          subtotal?: number
          tax_percent?: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          invoice_id?: string
          position?: number
          price?: number
          qty?: number
          subtotal?: number
          tax_percent?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          discount_total: number
          due_date: string
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_total?: number
          due_date: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_total?: number
          due_date?: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number
          amount_in_words: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          finalized_at: string | null
          for_payment: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_method: string | null
          receipt_date: string
          receipt_number: string
          receipt_type: string
          received_from: string
          receiver_name: string | null
          status: Database["public"]["Enums"]["receipt_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_in_words?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          finalized_at?: string | null
          for_payment?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_date?: string
          receipt_number: string
          receipt_type?: string
          received_from: string
          receiver_name?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_in_words?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          finalized_at?: string | null
          for_payment?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_date?: string
          receipt_number?: string
          receipt_type?: string
          received_from?: string
          receiver_name?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_number: { Args: { _date?: string }; Returns: string }
      next_receipt_number: { Args: { _date?: string }; Returns: string }
      next_document_number: { Args: { _date?: string; _document_type_id: string }; Returns: string }
      get_my_tenant_id: { Args: Record<PropertyKey, never>; Returns: string }
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      create_tenant_with_admin: { Args: { p_admin_email?: string; p_admin_full_name?: string; p_admin_password?: string; p_address?: string; p_company_name?: string; p_email?: string; p_phone?: string; p_tenant_name: string; p_tenant_type?: string }; Returns: Json }
    }
    Enums: {
      app_role: "super_admin" | "admin_keuangan" | "owner" | "platform_super_admin" | "tenant_super_admin"
      invoice_status:
        | "draft"
        | "terkirim"
        | "sebagian_dibayar"
        | "lunas"
        | "jatuh_tempo"
        | "dibatalkan"
      document_status: "draft" | "aktif" | "selesai" | "berakhir" | "dibatalkan"
      receipt_status: "draft" | "final" | "dibatalkan"
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
      app_role: ["super_admin", "admin_keuangan", "owner", "platform_super_admin", "tenant_super_admin"],
      invoice_status: [
        "draft",
        "terkirim",
        "sebagian_dibayar",
        "lunas",
        "jatuh_tempo",
        "dibatalkan",
      ],
      document_status: ["draft", "aktif", "selesai", "berakhir", "dibatalkan"],
      receipt_status: ["draft", "final", "dibatalkan"],
    },
  },
} as const
