-- Atomic first-owner setup for the single development environment.
-- This trigger runs as part of the auth.users INSERT transaction. If the
-- organization or profile insert fails, the Auth user insert also rolls back.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_exists BOOLEAN;
  assigned_role public.profiles.role%TYPE;
  user_name TEXT;
  user_phone TEXT;
  normalized_email TEXT;
  venue_name TEXT;
  new_org_id UUID;
BEGIN
  normalized_email := LOWER(TRIM(NEW.email));
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(normalized_email, '@', 1)
  );
  user_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  venue_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'venue_name', '')), '');

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'owner' AND organization_id IS NOT NULL)
  INTO owner_exists;

  IF NOT owner_exists THEN
    assigned_role := 'owner';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
    IF assigned_role = 'owner' THEN
      assigned_role := 'staff';
    END IF;
  END IF;

  IF assigned_role = 'owner' THEN
    IF venue_name IS NULL THEN
      RAISE EXCEPTION 'A venue name is required for the Owner account';
    END IF;

    INSERT INTO public.organizations (name, slug, email, phone, currency)
    VALUES (
      venue_name,
      'venue-' || REPLACE(NEW.id::TEXT, '-', ''),
      normalized_email,
      user_phone,
      'INR'
    )
    RETURNING id INTO new_org_id;
  END IF;

  INSERT INTO public.profiles (
    id, organization_id, full_name, name, email, phone, role,
    is_active, active, created_at, updated_at
  ) VALUES (
    NEW.id, new_org_id, user_name, user_name, normalized_email, user_phone,
    assigned_role, true, true, timezone('utc'::TEXT, now()), timezone('utc'::TEXT, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
