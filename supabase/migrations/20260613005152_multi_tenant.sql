-- ====================================================================
-- TRANSFORMASI MULTI-TENANT
-- DocTiva Smart Digital Administration
-- NOTE: ALTER TYPE statements already in migration 20260613005151
-- ====================================================================

-- 1. Tabel tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Perusahaan',
  company_name text,
  logo_url text,
  email text,
  phone text,
  address text,
  npwp text,
  is_active boolean NOT NULL DEFAULT true,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform super admin manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_super_admin'));

CREATE POLICY "Users view own tenant" ON public.tenants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'tenant_super_admin' OR ur.role = 'owner' OR ur.role = 'admin_keuangan' OR ur.role = 'super_admin')));

-- 2. Tenant subscriptions
CREATE TABLE public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tenant_subscriptions TO authenticated;
GRANT ALL ON public.tenant_subscriptions TO service_role;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform super admin manage subscriptions" ON public.tenant_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_super_admin'));

-- 3. Platform audit logs
CREATE TABLE public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.platform_audit_logs TO authenticated;
GRANT ALL ON public.platform_audit_logs TO service_role;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform super admin view platform audit" ON public.platform_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_super_admin'));

CREATE POLICY "Auth insert platform audit" ON public.platform_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Tambahkan tenant_id ke seluruh tabel operasional

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON public.invoice_items(tenant_id);

ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_receipts_tenant ON public.receipts(tenant_id);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_id);

ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant ON public.document_templates(tenant_id);

ALTER TABLE public.document_types ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.document_signatories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.document_status_histories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_tenant ON public.app_settings(tenant_id) WHERE tenant_id IS NOT NULL;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);

ALTER TABLE public.customer_import_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.document_archives ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_document_archives_tenant ON public.document_archives(tenant_id);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 5. Helper function: get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;

-- 6. Helper function: check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'platform_super_admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 7. Updated RLS policies for tenant isolation

-- customers
DROP POLICY IF EXISTS "Authenticated view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated insert customers" ON public.customers;
DROP POLICY IF EXISTS "Staff update customers" ON public.customers;
DROP POLICY IF EXISTS "Staff delete customers" ON public.customers;

CREATE POLICY "Tenant view customers" ON public.customers FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant insert customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant update customers" ON public.customers FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant delete customers" ON public.customers FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());

-- invoices
DROP POLICY IF EXISTS "Auth view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Auth insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff delete invoices" ON public.invoices;

CREATE POLICY "Tenant view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant insert invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Tenant update invoices" ON public.invoices FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant delete invoices" ON public.invoices FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());

-- receipts
DROP POLICY IF EXISTS "auth read receipts" ON public.receipts;
DROP POLICY IF EXISTS "auth insert receipts" ON public.receipts;
DROP POLICY IF EXISTS "auth update receipts" ON public.receipts;
DROP POLICY IF EXISTS "auth delete receipts" ON public.receipts;

CREATE POLICY "Tenant view receipts" ON public.receipts FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant insert receipts" ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Tenant update receipts" ON public.receipts FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant delete receipts" ON public.receipts FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());

-- documents
DROP POLICY IF EXISTS "Auth view documents" ON public.documents;
DROP POLICY IF EXISTS "Auth insert documents" ON public.documents;
DROP POLICY IF EXISTS "Staff update documents" ON public.documents;
DROP POLICY IF EXISTS "Staff delete documents" ON public.documents;

CREATE POLICY "Tenant view documents" ON public.documents FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant insert documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant update documents" ON public.documents FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant delete documents" ON public.documents FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());

-- templates
DROP POLICY IF EXISTS "Auth view templates" ON public.document_templates;
DROP POLICY IF EXISTS "Auth insert templates" ON public.document_templates;
DROP POLICY IF EXISTS "Auth update templates" ON public.document_templates;
DROP POLICY IF EXISTS "Auth delete templates" ON public.document_templates;

CREATE POLICY "Tenant view templates" ON public.document_templates FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant insert templates" ON public.document_templates FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant update templates" ON public.document_templates FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant delete templates" ON public.document_templates FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());

-- settings
DROP POLICY IF EXISTS "auth read settings" ON public.app_settings;
DROP POLICY IF EXISTS "auth insert settings" ON public.app_settings;
DROP POLICY IF EXISTS "auth update settings" ON public.app_settings;

CREATE POLICY "Tenant view settings" ON public.app_settings FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant insert settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant update settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());

-- audit logs
DROP POLICY IF EXISTS "auth read audit" ON public.audit_logs;
DROP POLICY IF EXISTS "auth insert audit" ON public.audit_logs;

CREATE POLICY "Tenant view audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant insert audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());

-- archives
DROP POLICY IF EXISTS "auth read archives" ON public.document_archives;
DROP POLICY IF EXISTS "auth insert archives" ON public.document_archives;
DROP POLICY IF EXISTS "auth delete archives" ON public.document_archives;

CREATE POLICY "Tenant view archives" ON public.document_archives FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant insert archives" ON public.document_archives FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());
CREATE POLICY "Tenant delete archives" ON public.document_archives FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_platform_admin());

-- profiles
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin delete profile" ON public.profiles;

CREATE POLICY "Tenant view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR auth.uid() = id OR public.is_platform_admin());
CREATE POLICY "Tenant update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR auth.uid() = id OR public.is_platform_admin());
CREATE POLICY "Tenant insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR auth.uid() = id OR public.is_platform_admin());
CREATE POLICY "Tenant delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR public.has_role(auth.uid(), 'tenant_super_admin'));

-- user_roles
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin manage roles" ON public.user_roles;

CREATE POLICY "View own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_platform_admin() OR
    (tenant_id = public.get_my_tenant_id() AND public.has_role(auth.uid(), 'tenant_super_admin')));
CREATE POLICY "Manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_platform_admin() OR
    (tenant_id = public.get_my_tenant_id() AND public.has_role(auth.uid(), 'tenant_super_admin')))
  WITH CHECK (public.is_platform_admin() OR
    (tenant_id = public.get_my_tenant_id() AND public.has_role(auth.uid(), 'tenant_super_admin')));


-- 8. Auto-assign tenant_id saat user_roles dibuat
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    RETURN NEW;
  END IF;
  v_tenant_id := NEW.raw_user_meta_data->>'tenant_id';
  IF v_tenant_id IS NOT NULL THEN
    UPDATE public.profiles SET tenant_id = v_tenant_id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_tenant ON auth.users;
CREATE TRIGGER on_auth_user_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tenant();

-- 9. Auto-set tenant_id dari user yang login
CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF public.is_platform_admin() THEN RETURN NEW; END IF;
  NEW.tenant_id := public.get_my_tenant_id();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_tenant ON public.user_roles;
CREATE TRIGGER trg_user_roles_tenant BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- 10. Auto-set tenant_id on operational table inserts
CREATE OR REPLACE FUNCTION public.auto_set_row_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NOT public.is_platform_admin() THEN
    NEW.tenant_id := public.get_my_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_tenant ON public.customers;
CREATE TRIGGER trg_customers_tenant BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.auto_set_row_tenant_id();

DROP TRIGGER IF EXISTS trg_invoices_tenant ON public.invoices;
CREATE TRIGGER trg_invoices_tenant BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.auto_set_row_tenant_id();

DROP TRIGGER IF EXISTS trg_receipts_tenant ON public.receipts;
CREATE TRIGGER trg_receipts_tenant BEFORE INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.auto_set_row_tenant_id();

DROP TRIGGER IF EXISTS trg_documents_tenant ON public.documents;
CREATE TRIGGER trg_documents_tenant BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.auto_set_row_tenant_id();

DROP TRIGGER IF EXISTS trg_document_templates_tenant ON public.document_templates;
CREATE TRIGGER trg_document_templates_tenant BEFORE INSERT ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.auto_set_row_tenant_id();

DROP TRIGGER IF EXISTS trg_audit_logs_tenant ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_tenant BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.auto_set_row_tenant_id();

DROP TRIGGER IF EXISTS trg_document_archives_tenant ON public.document_archives;
CREATE TRIGGER trg_document_archives_tenant BEFORE INSERT ON public.document_archives FOR EACH ROW EXECUTE FUNCTION public.auto_set_row_tenant_id();

DROP TRIGGER IF EXISTS trg_app_settings_tenant ON public.app_settings;
CREATE TRIGGER trg_app_settings_tenant BEFORE INSERT ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.auto_set_row_tenant_id();

-- 11. Function: create tenant + super admin
CREATE OR REPLACE FUNCTION public.create_tenant_with_admin(
  p_tenant_name text,
  p_tenant_type text DEFAULT 'Perusahaan',
  p_company_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_admin_full_name text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_admin_password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform super admin can create tenants';
  END IF;

  INSERT INTO public.tenants (name, type, company_name, email, phone, address, is_active, activated_at)
  VALUES (p_tenant_name, p_tenant_type, p_company_name, p_email, p_phone, p_address, true, now())
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.app_settings (tenant_id, company_name)
  VALUES (v_tenant_id, COALESCE(p_company_name, p_tenant_name));

  IF p_admin_email IS NOT NULL AND p_admin_password IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_admin_email;
    IF v_user_id IS NULL THEN
      INSERT INTO auth.users (
        instance_id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, role
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        p_admin_email,
        crypt(p_admin_password, gen_salt('bf')),
        now(),
        jsonb_build_object('full_name', p_admin_full_name, 'tenant_id', v_tenant_id),
        'authenticated'
      )
      ON CONFLICT (email) DO UPDATE SET
        raw_user_meta_data = auth.users.raw_user_meta_data || jsonb_build_object('tenant_id', v_tenant_id)
      RETURNING id INTO v_user_id;

      INSERT INTO public.profiles (id, full_name, tenant_id)
      VALUES (v_user_id, COALESCE(p_admin_full_name, p_admin_email), v_tenant_id)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (v_user_id, 'tenant_super_admin', v_tenant_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('tenant_id', v_tenant_id, 'user_id', v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tenant_with_admin(text, text, text, text, text, text, text, text, text) TO service_role;

-- 12. Backfill existing data with default tenant
DO $$
DECLARE
  v_default_tenant_id uuid;
BEGIN
  INSERT INTO public.tenants (id, name, type, company_name, is_active, activated_at)
  VALUES (gen_random_uuid(), 'Default Company', 'Perusahaan', 'Default Company', true, now())
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_default_tenant_id;

  IF v_default_tenant_id IS NULL THEN
    SELECT id INTO v_default_tenant_id FROM public.tenants LIMIT 1;
  END IF;

  UPDATE public.customers SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.invoices SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.invoice_items SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.receipts SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.documents SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.document_templates SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.document_archives SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.audit_logs SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.app_settings SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.user_roles SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.profiles SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
END $$;

