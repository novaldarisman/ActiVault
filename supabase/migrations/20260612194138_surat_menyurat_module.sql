-- ====================================================================
-- MODUL SURAT MENYURAT (Document Generator Engine)
-- DocTiva Smart Digital Administration
-- ====================================================================

-- 1. Enum status dokumen
CREATE TYPE public.document_status AS ENUM (
  'draft',
  'aktif',
  'selesai',
  'berakhir',
  'dibatalkan'
);

-- 2. Jenis dokumen (dinamis, dikelola super admin)
CREATE TABLE public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  number_prefix text NOT NULL,
  number_format text NOT NULL DEFAULT '$PREFIX-YYYYMM-XXXX',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_types TO authenticated;
GRANT ALL ON public.document_types TO service_role;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view document_types" ON public.document_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manage document_types" ON public.document_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_document_types_updated BEFORE UPDATE ON public.document_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Template dokumen (dibuat user, per jenis dokumen)
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id uuid NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  content text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view templates" ON public.document_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert templates" ON public.document_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin_keuangan'));
CREATE POLICY "Auth update templates" ON public.document_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin_keuangan'));
CREATE POLICY "Auth delete templates" ON public.document_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_document_templates_updated BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Dokumen utama
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE,
  document_type_id uuid NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  title text NOT NULL,
  document_date date NOT NULL DEFAULT CURRENT_DATE,
  effective_date date,
  expiry_date date,
  content text NOT NULL DEFAULT '',
  status public.document_status NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Staff update documents" ON public.documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin_keuangan'));
CREATE POLICY "Staff delete documents" ON public.documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Pihak terkait / penandatangan dokumen
CREATE TABLE public.document_signatories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  party_label text NOT NULL DEFAULT 'Pihak Pertama',
  name text,
  position text,
  signature_url text,
  stamp_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_signatories TO authenticated;
GRANT ALL ON public.document_signatories TO service_role;
ALTER TABLE public.document_signatories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view signatories" ON public.document_signatories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage signatories" ON public.document_signatories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Riwayat status dokumen
CREATE TABLE public.document_status_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  old_status public.document_status,
  new_status public.document_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.document_status_histories TO authenticated;
GRANT ALL ON public.document_status_histories TO service_role;
ALTER TABLE public.document_status_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view status_histories" ON public.document_status_histories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert status_histories" ON public.document_status_histories FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Index
CREATE INDEX idx_documents_type ON public.documents(document_type_id);
CREATE INDEX idx_documents_customer ON public.documents(customer_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_date ON public.documents(document_date);
CREATE INDEX idx_document_templates_type ON public.document_templates(document_type_id);
CREATE INDEX idx_document_signatories_doc ON public.document_signatories(document_id);
-- 8. Fungsi nomor otomatis per jenis dokumen
CREATE OR REPLACE FUNCTION public.next_document_number(_document_type_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dt public.document_types;
  prefix text;
  next_seq int;
  candidate text;
BEGIN
  SELECT * INTO dt FROM public.document_types WHERE id = _document_type_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_type_id not found: %', _document_type_id;
  END IF;

  prefix := dt.number_prefix || '-' || to_char(_date, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(substring(document_number from '([0-9]+)$') AS int)), 0) + 1
    INTO next_seq
    FROM public.documents
   WHERE document_type_id = _document_type_id
     AND document_number LIKE prefix || '%';
  candidate := prefix || lpad(next_seq::text, 4, '0');
  RETURN candidate;
END;$$;

GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, date) TO authenticated;

-- 9. Seed data: jenis dokumen bawaan
INSERT INTO public.document_types (code, name, number_prefix, sort_order) VALUES
  ('mou', 'Memorandum of Understanding (MOU)', 'MOU', 1),
  ('spk', 'Surat Perjanjian Kerja Sama (SPK)', 'SPK', 2),
  ('penawaran', 'Surat Penawaran', 'PEN', 3),
  ('surat_tugas', 'Surat Tugas', 'TUG', 4),
  ('surat_pernyataan', 'Surat Pernyataan', 'PER', 5),
  ('surat_kuasa', 'Surat Kuasa', 'KUA', 6),
  ('nda', 'Non Disclosure Agreement (NDA)', 'NDA', 7),
  ('kontrak_pelatihan', 'Kontrak Pelatihan', 'KPL', 8),
  ('perjanjian_konsultan', 'Perjanjian Konsultan', 'PKO', 9),
  ('creative_agreement', 'Creative Agreement', 'CRA', 10)
ON CONFLICT (code) DO NOTHING;

-- 10. Realtime publication untuk documents
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
