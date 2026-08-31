-- Only the organization owner may edit business profile details.
-- Managers and staff retain read access.

DROP POLICY IF EXISTS "Owners and Admins can update their organization" ON public.organizations;
CREATE POLICY "Owners can update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (
    id = public.get_auth_org_id()
    AND public.get_auth_is_active()
    AND public.get_auth_role() = 'owner'
  )
  WITH CHECK (id = public.get_auth_org_id());
