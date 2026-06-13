-- ====================================================================
-- CREATE PLATFORM SUPER ADMIN
-- Email: novaldarisman@activa.id
-- Password: 12345
-- ====================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Cek apakah user sudah ada
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'novaldarisman@activa.id';

  -- 2. Kalau belum ada, buat user baru
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'novaldarisman@activa.id',
      crypt('12345', gen_salt('bf')),
      now(),
      '{"full_name": "Noval Darisman"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- 3. Buat profile (skip jika sudah ada)
  INSERT INTO public.profiles (id, full_name, is_active)
  VALUES (v_user_id, 'Noval Darisman', true)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Assign platform_super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'platform_super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Platform Super Admin ready: %', v_user_id;
END $$;