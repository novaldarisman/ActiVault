-- ====================================================================
-- ADD PLATFORM + TENANT SUPER ADMIN ROLES TO app_role ENUM
-- Migration terpisah karena ALTER TYPE ADD VALUE tidak bisa dalam transaksi
-- ====================================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant_super_admin';