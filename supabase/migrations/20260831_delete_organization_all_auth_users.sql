-- Ensure permanent organization deletion removes every tenant Auth user.
-- Apply after 20260830_delete_organization.sql.

CREATE OR REPLACE FUNCTION public.delete_current_organization(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_org UUID;
  caller_role TEXT;
  tenant_user_ids UUID[];
BEGIN
  SELECT organization_id, role::TEXT
    INTO caller_org, caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_org IS NULL OR caller_org <> p_organization_id OR caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the organization owner can delete this organization';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO tenant_user_ids
  FROM public.profiles
  WHERE organization_id = p_organization_id;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = auth.uid() AND organization_id = p_organization_id;

  PERFORM set_config('app.organization_deletion', 'true', true);
  DELETE FROM public.organizations WHERE id = p_organization_id;

  -- Remove all Auth identities that belonged to this organization. This also
  -- prevents deleted staff from signing in as orphan accounts.
  DELETE FROM auth.users
  WHERE id = ANY(tenant_user_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_organization(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_organization(UUID) TO authenticated;
