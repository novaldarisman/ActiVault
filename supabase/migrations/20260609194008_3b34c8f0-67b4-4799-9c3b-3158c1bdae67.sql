
-- Invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('draft','terkirim','sebagian_dibayar','lunas','jatuh_tempo','dibatalkan');

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  discount_total numeric(18,2) NOT NULL DEFAULT 0,
  tax_total numeric(18,2) NOT NULL DEFAULT 0,
  grand_total numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Staff update invoices" ON public.invoices FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin_keuangan') OR public.has_role(auth.uid(),'super_admin')
);
CREATE POLICY "Staff delete invoices" ON public.invoices FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'super_admin')
);

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoice items
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  qty numeric(18,3) NOT NULL DEFAULT 1,
  unit text,
  price numeric(18,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view invoice_items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert invoice_items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update invoice_items" ON public.invoice_items FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin_keuangan') OR public.has_role(auth.uid(),'super_admin')
);
CREATE POLICY "Staff delete invoice_items" ON public.invoice_items FOR DELETE TO authenticated USING (true);

-- Auto invoice number generator: INV-YYYYMM-XXXX (sequential per month)
CREATE OR REPLACE FUNCTION public.next_invoice_number(_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  next_seq int;
  candidate text;
BEGIN
  prefix := 'INV-' || to_char(_date, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(substring(invoice_number from '([0-9]+)$') AS int)), 0) + 1
    INTO next_seq
    FROM public.invoices
   WHERE invoice_number LIKE prefix || '%';
  candidate := prefix || lpad(next_seq::text, 4, '0');
  RETURN candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number(date) TO authenticated;
