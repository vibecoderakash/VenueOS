-- Allow only active Owners and Managers to permanently delete organization leads.
DROP POLICY IF EXISTS "Owners and managers can delete organization leads" ON public.leads;
CREATE POLICY "Owners and managers can delete organization leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_auth_org_id()
    AND public.get_auth_is_active()
    AND public.get_auth_role() IN ('owner', 'manager', 'admin')
  );
