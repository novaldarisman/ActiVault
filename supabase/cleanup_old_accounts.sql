-- ====================================================================
-- CLEANUP OLD ACCOUNTS (FIXED)
-- Hapus user yang TIDAK punya tenant_id (akun lama)
-- KECUALI platform_super_admin
-- ====================================================================

DO $$
DECLARE
  r record;
BEGIN
  -- 1. Hapus user_roles yang tenant_id NULL, KECUALI platform_super_admin
  DELETE FROM public.user_roles
  WHERE tenant_id IS NULL
    AND role != 'platform_super_admin';

  -- 2. Hapus profiles yang user-nya sudah tidak punya user_roles
  DELETE FROM public.profiles
  WHERE id NOT IN (SELECT DISTINCT user_id FROM public.user_roles);

  -- 3. Hapus auth.users yang tidak punya user_roles
  FOR r IN SELECT id FROM auth.users
    WHERE id NOT IN (SELECT DISTINCT user_id FROM public.user_roles)
  LOOP
    DELETE FROM auth.users WHERE id = r.id;
  END LOOP;

  RAISE NOTICE 'Cleanup done. Platform admin + tenant users safe.';
END $$;