-- Secure organization deletion for the Settings danger zone.
-- The function verifies the current authenticated user is the organization owner,
-- then relies on foreign-key ON DELETE CASCADE for all tenant-owned records.
-- The trigger exception is scoped to this transaction only, so direct Owner
-- profile deletion remains blocked everywhere else.
CREATE OR REPLACE FUNCTION public.check_profile_delete_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'owner'
     AND current_setting('app.organization_deletion', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'The Owner account cannot be deleted.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_current_organization(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_org UUID;
  caller_role TEXT;
BEGIN
  SELECT organization_id, role::TEXT
    INTO caller_org, caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_org IS NULL OR caller_org <> p_organization_id OR caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the organization owner can delete this organization';
  END IF;

  PERFORM set_config('app.organization_deletion', 'true', true);
  DELETE FROM public.organizations WHERE id = p_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_organization(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_organization(UUID) TO authenticated;
