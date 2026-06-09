
-- Replace permissive customer policies
DROP POLICY IF EXISTS "Authenticated update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated delete customers" ON public.customers;

CREATE POLICY "Staff update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin_keuangan')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Staff delete customers" ON public.customers
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
