
-- Receipt status enum
CREATE TYPE public.receipt_status AS ENUM ('draft','final','dibatalkan');

-- receipts
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  received_from text NOT NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  amount_in_words text,
  for_payment text,
  payment_method text,
  receiver_name text,
  status public.receipt_status NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read receipts" ON public.receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert receipts" ON public.receipts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update receipts" ON public.receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete receipts" ON public.receipts FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_receipts_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- next_receipt_number
CREATE OR REPLACE FUNCTION public.next_receipt_number(_date date DEFAULT CURRENT_DATE)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix text; next_seq int;
BEGIN
  prefix := 'KW-' || to_char(_date, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(substring(receipt_number from '([0-9]+)$') AS int)), 0) + 1
    INTO next_seq FROM public.receipts WHERE receipt_number LIKE prefix || '%';
  RETURN prefix || lpad(next_seq::text, 4, '0');
END; $$;

-- audit_logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read audit" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- app_settings (single row pattern: singleton id)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Nova Invoice',
  company_logo_url text,
  company_address text,
  company_npwp text,
  company_email text,
  company_phone text,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  invoice_footer text,
  default_tax_percent numeric(5,2) NOT NULL DEFAULT 11,
  invoice_template text NOT NULL DEFAULT 'modern',
  receipt_template text NOT NULL DEFAULT 'modern',
  signature_url text,
  stamp_url text,
  signer_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update settings" ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.app_settings (company_name) VALUES ('Nova Invoice');

-- document_archives
CREATE TABLE public.document_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL,
  doc_number text NOT NULL,
  entity_id uuid,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  year int NOT NULL,
  month int NOT NULL,
  size_bytes int,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.document_archives TO authenticated;
GRANT ALL ON public.document_archives TO service_role;
ALTER TABLE public.document_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read archives" ON public.document_archives FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert archives" ON public.document_archives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth delete archives" ON public.document_archives FOR DELETE TO authenticated USING (true);

-- Storage policies for documents bucket (bucket created via tool below)
