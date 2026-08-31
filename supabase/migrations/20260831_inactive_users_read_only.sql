-- Inactive users may read their organization but cannot write any business data.
-- Apply after 20260831_security_and_rls_hardening.sql.

CREATE OR REPLACE FUNCTION public.get_auth_is_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COALESCE(is_active, active, true) FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.get_auth_is_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_is_active() TO authenticated;

-- Organizations
DROP POLICY IF EXISTS "Owners and Admins can update their organization" ON public.organizations;
CREATE POLICY "Owners and Admins can update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.get_auth_org_id() AND public.get_auth_is_active() AND public.get_auth_role() IN ('owner', 'admin'))
  WITH CHECK (id = public.get_auth_org_id());

-- Profiles: self-edit and owner/admin team management are both write operations.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and Owners can manage organization profiles" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.get_auth_is_active())
  WITH CHECK (id = auth.uid());
CREATE POLICY "Admins and Owners can manage organization profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (organization_id = public.get_auth_org_id() AND public.get_auth_is_active() AND public.get_auth_role() IN ('owner', 'admin'))
  WITH CHECK (organization_id = public.get_auth_org_id());

-- Leads
DROP POLICY IF EXISTS "Users can insert leads into their organization" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads in their organization" ON public.leads;
CREATE POLICY "Users can insert leads into their organization"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.get_auth_is_active() AND organization_id = public.get_auth_org_id());
CREATE POLICY "Users can update leads in their organization"
  ON public.leads FOR UPDATE TO authenticated
  USING (public.get_auth_is_active() AND organization_id = public.get_auth_org_id())
  WITH CHECK (organization_id = public.get_auth_org_id());

-- Discussions
DROP POLICY IF EXISTS "Users can add discussions to organization leads" ON public.lead_discussions;
DROP POLICY IF EXISTS "Authors and Admins can update discussions" ON public.lead_discussions;
DROP POLICY IF EXISTS "Authors and Admins can delete discussions" ON public.lead_discussions;
CREATE POLICY "Users can add discussions to organization leads"
  ON public.lead_discussions FOR INSERT TO authenticated
  WITH CHECK (public.get_auth_is_active() AND organization_id = public.get_auth_org_id() AND author_id = auth.uid());
CREATE POLICY "Authors and Admins can update discussions"
  ON public.lead_discussions FOR UPDATE TO authenticated
  USING (public.get_auth_is_active() AND organization_id = public.get_auth_org_id() AND (author_id = auth.uid() OR public.get_auth_role() IN ('owner', 'admin')))
  WITH CHECK (organization_id = public.get_auth_org_id());
CREATE POLICY "Authors and Admins can delete discussions"
  ON public.lead_discussions FOR DELETE TO authenticated
  USING (public.get_auth_is_active() AND organization_id = public.get_auth_org_id() AND (author_id = auth.uid() OR public.get_auth_role() IN ('owner', 'admin')));

-- Activity is append-only from the client.
DROP POLICY IF EXISTS "Users can insert activity logs into their organization" ON public.lead_activity;
CREATE POLICY "Users can insert activity logs into their organization"
  ON public.lead_activity FOR INSERT TO authenticated
  WITH CHECK (public.get_auth_is_active() AND organization_id = public.get_auth_org_id());

-- Some installations do not include assignment history yet. Do not fail the
-- migration just because that optional table has not been created.
DO $$
BEGIN
  IF to_regclass('public.lead_assignment_history') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert assignment logs into their organization" ON public.lead_assignment_history';
    EXECUTE 'CREATE POLICY "Users can insert assignment logs into their organization" ON public.lead_assignment_history FOR INSERT TO authenticated WITH CHECK (public.get_auth_is_active() AND organization_id = public.get_auth_org_id())';
  END IF;
END
$$;
