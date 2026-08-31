-- ============================================================================
-- VENUE OS V1 - Security, Multi-Tenant RLS & Audit Hardening Migration
-- Migration: 20260831_security_and_rls_hardening.sql
-- ============================================================================

-- 1. Helper Function: Check if an Owner account exists safely without exposing PII
CREATE OR REPLACE FUNCTION public.check_has_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE role = 'owner' AND organization_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_has_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_has_owner() TO anon, authenticated;

-- 2. SYSTEM AUDIT LOGS TABLE
-- Dedicated, persistent audit trail for organization lifecycle and critical security events
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID, -- Nullable so audit records survive organization deletion
    actor_id UUID,
    actor_email TEXT,
    actor_role TEXT,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_org ON public.system_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_event ON public.system_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created ON public.system_audit_logs(created_at DESC);

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Owners and Admins can view audit logs for their organization
DROP POLICY IF EXISTS "Owners and Admins can view organization audit logs" ON public.system_audit_logs;
CREATE POLICY "Owners and Admins can view organization audit logs"
    ON public.system_audit_logs FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_auth_org_id() 
        AND public.get_auth_role() IN ('owner', 'admin')
    );

-- System audit logs are append-only; direct mutations from client are blocked
DROP POLICY IF EXISTS "Block direct insert into system audit logs" ON public.system_audit_logs;
DROP POLICY IF EXISTS "Block update on system audit logs" ON public.system_audit_logs;
DROP POLICY IF EXISTS "Block delete on system audit logs" ON public.system_audit_logs;

-- 3. HARDENED PROFILES RLS POLICIES
-- Scopes profile visibility strictly to caller's organization or own profile (prevents cross-tenant leaks)
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profile count for setup check" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own personal details" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners and managers can manage team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins/Owners can manage organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profile during setup" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_auth_org_id() 
        OR id = auth.uid()
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins and Owners can manage organization profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        organization_id = public.get_auth_org_id() 
        AND public.get_auth_role() IN ('owner', 'admin')
    );

-- 4. HARDENED ORGANIZATION POLICIES
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Owners and Admins can update their organization" ON public.organizations;

CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (id = public.get_auth_org_id());

CREATE POLICY "Owners and Admins can update their organization"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (
        id = public.get_auth_org_id() 
        AND public.get_auth_role() IN ('owner', 'admin')
    );

-- 5. HARDENED LEADS & RELATED POLICIES
DROP POLICY IF EXISTS "Users can view organization leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads into their organization" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads in their organization" ON public.leads;

CREATE POLICY "Users can view organization leads"
    ON public.leads FOR SELECT
    TO authenticated
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can insert leads into their organization"
    ON public.leads FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can update leads in their organization"
    ON public.leads FOR UPDATE
    TO authenticated
    USING (organization_id = public.get_auth_org_id());

-- 6. HARDENED LEAD DISCUSSIONS POLICIES
DROP POLICY IF EXISTS "Users can view discussions for organization leads" ON public.lead_discussions;
DROP POLICY IF EXISTS "Users can add discussions to organization leads" ON public.lead_discussions;
DROP POLICY IF EXISTS "Authors and Admins can update discussions" ON public.lead_discussions;
DROP POLICY IF EXISTS "Authors and Admins can delete discussions" ON public.lead_discussions;

CREATE POLICY "Users can view discussions for organization leads"
    ON public.lead_discussions FOR SELECT
    TO authenticated
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can add discussions to organization leads"
    ON public.lead_discussions FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_auth_org_id() 
        AND author_id = auth.uid()
    );

CREATE POLICY "Authors and Admins can update discussions"
    ON public.lead_discussions FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_auth_org_id() 
        AND (author_id = auth.uid() OR public.get_auth_role() IN ('owner', 'admin'))
    );

CREATE POLICY "Authors and Admins can delete discussions"
    ON public.lead_discussions FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_auth_org_id() 
        AND (author_id = auth.uid() OR public.get_auth_role() IN ('owner', 'admin'))
    );

-- 7. HARDENED ACTIVITY & ASSIGNMENT HISTORY POLICIES
DROP POLICY IF EXISTS "Users can view organization activity" ON public.lead_activity;
DROP POLICY IF EXISTS "System/Users can insert activity logs" ON public.lead_activity;
DROP POLICY IF EXISTS "Users can view organization assignment history" ON public.lead_assignment_history;
DROP POLICY IF EXISTS "System can insert assignment logs" ON public.lead_assignment_history;

CREATE POLICY "Users can view organization activity"
    ON public.lead_activity FOR SELECT
    TO authenticated
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can insert activity logs into their organization"
    ON public.lead_activity FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can view organization assignment history"
    ON public.lead_assignment_history FOR SELECT
    TO authenticated
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can insert assignment logs into their organization"
    ON public.lead_assignment_history FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = public.get_auth_org_id());

-- 8. UPDATE ORGANIZATION DELETION FUNCTION WITH AUDIT LOGGING
CREATE OR REPLACE FUNCTION public.delete_current_organization(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_org UUID;
  caller_role TEXT;
  caller_email TEXT;
  target_org_name TEXT;
BEGIN
  SELECT organization_id, role::TEXT, email
    INTO caller_org, caller_role, caller_email
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_org IS NULL OR caller_org <> p_organization_id OR caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the organization owner can delete this organization';
  END IF;

  SELECT name INTO target_org_name
  FROM public.organizations
  WHERE id = p_organization_id;

  -- Record audit trail entry prior to deletion (persists after cascade delete)
  INSERT INTO public.system_audit_logs (
    organization_id,
    actor_id,
    actor_email,
    actor_role,
    event_type,
    metadata
  ) VALUES (
    p_organization_id,
    auth.uid(),
    caller_email,
    'owner',
    'organization_deleted',
    jsonb_build_object(
      'organization_id', p_organization_id,
      'organization_name', target_org_name,
      'deleted_by_email', caller_email,
      'deleted_at', timezone('utc'::TEXT, now())
    )
  );

  -- Safe role downgrade within transaction to satisfy older delete triggers
  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = auth.uid() AND organization_id = p_organization_id;

  PERFORM set_config('app.organization_deletion', 'true', true);
  DELETE FROM public.organizations WHERE id = p_organization_id;

  -- Delete the Auth login identity
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_organization(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_organization(UUID) TO authenticated;
