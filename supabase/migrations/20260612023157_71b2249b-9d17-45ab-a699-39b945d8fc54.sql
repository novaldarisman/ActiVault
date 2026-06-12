
-- Receipts: add linkage to invoice + type + finalized_at
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS invoice_id uuid NULL REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS receipts_invoice_id_idx ON public.receipts(invoice_id);

-- Customer import logs
CREATE TABLE IF NOT EXISTS public.customer_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_by_email text NULL,
  total_rows int NOT NULL DEFAULT 0,
  success_rows int NOT NULL DEFAULT 0,
  updated_rows int NOT NULL DEFAULT 0,
  failed_rows int NOT NULL DEFAULT 0,
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.customer_import_logs TO authenticated;
GRANT ALL ON public.customer_import_logs TO service_role;

ALTER TABLE public.customer_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view import logs"
  ON public.customer_import_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert import logs"
  ON public.customer_import_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = imported_by OR imported_by IS NULL);
