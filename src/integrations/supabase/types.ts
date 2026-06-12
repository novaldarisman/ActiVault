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
    }
    Enums: {
      app_role: "super_admin" | "admin_keuangan" | "owner"
      invoice_status:
        | "draft"
        | "terkirim"
        | "sebagian_dibayar"
        | "lunas"
        | "jatuh_tempo"
        | "dibatalkan"
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
      app_role: ["super_admin", "admin_keuangan", "owner"],
      invoice_status: [
        "draft",
        "terkirim",
        "sebagian_dibayar",
        "lunas",
        "jatuh_tempo",
        "dibatalkan",
      ],
      receipt_status: ["draft", "final", "dibatalkan"],
    },
  },
} as const
