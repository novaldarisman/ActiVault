-- ====================================================================
-- VERIFICATION: Check multi-tenant infrastructure
-- ====================================================================

-- 1. Check if triggers exist
SELECT 'trg_customers_tenant' as name, count(*) > 0 as exists
FROM pg_trigger WHERE tgname = 'trg_customers_tenant'
UNION ALL
SELECT 'trg_invoices_tenant', count(*) > 0
FROM pg_trigger WHERE tgname = 'trg_invoices_tenant'
UNION ALL
SELECT 'trg_receipts_tenant', count(*) > 0
FROM pg_trigger WHERE tgname = 'trg_receipts_tenant'
UNION ALL
SELECT 'trg_documents_tenant', count(*) > 0
FROM pg_trigger WHERE tgname = 'trg_documents_tenant';

-- 2. Check if functions exist
SELECT 'get_my_tenant_id' as name, count(*) > 0 as exists
FROM pg_proc WHERE proname = 'get_my_tenant_id'
UNION ALL
SELECT 'is_platform_admin', count(*) > 0
FROM pg_proc WHERE proname = 'is_platform_admin'
UNION ALL
SELECT 'auto_set_row_tenant_id', count(*) > 0
FROM pg_proc WHERE proname = 'auto_set_row_tenant_id';

-- 3. Check enum values
SELECT unnest(enum_range(null::public.app_role)) as app_role;

-- 4. Check tenant_id column exists
SELECT 'customers has tenant_id' as check_name, count(*) > 0 as ok
FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'tenant_id';

-- 5. Check current user's tenant_id (run as the tenant admin)
-- SELECT public.get_my_tenant_id();