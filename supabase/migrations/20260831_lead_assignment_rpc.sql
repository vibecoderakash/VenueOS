-- Install the assignment history table and the atomic reassignment RPC.
-- This migration is required by /api/leads/[leadId]/assign.
CREATE TABLE IF NOT EXISTS public.lead_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_from UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view organization assignment history" ON public.lead_assignment_history;
CREATE POLICY "Users can view organization assignment history"
  ON public.lead_assignment_history FOR SELECT TO authenticated
  USING (organization_id = public.get_auth_org_id());

CREATE OR REPLACE FUNCTION public.assign_lead(p_lead_id UUID, p_assigned_to UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_current_owner UUID;
  v_auth_user UUID := auth.uid();
  v_auth_role TEXT;
  v_target_role TEXT;
  v_target_active BOOLEAN;
BEGIN
  SELECT organization_id, role::TEXT
    INTO v_org_id, v_auth_role
  FROM public.profiles
  WHERE id = v_auth_user;

  IF v_auth_user IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized. Please sign in.';
  END IF;

  IF v_auth_role NOT IN ('owner', 'manager', 'admin') THEN
    RAISE EXCEPTION 'Only owners and managers can reassign leads';
  END IF;

  SELECT owner_id INTO v_current_owner
  FROM public.leads
  WHERE id = p_lead_id AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found in your organization';
  END IF;

  IF v_current_owner IS NOT DISTINCT FROM p_assigned_to THEN
    RETURN;
  END IF;

  SELECT role::TEXT, active
    INTO v_target_role, v_target_active
  FROM public.profiles
  WHERE id = p_assigned_to AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected user is not a member of this organization';
  END IF;

  IF v_target_active IS FALSE THEN
    RAISE EXCEPTION 'Cannot assign a lead to an inactive user';
  END IF;

  IF v_auth_role = 'manager' AND v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Managers cannot assign leads to the owner';
  END IF;

  UPDATE public.leads
  SET owner_id = p_assigned_to, updated_at = timezone('utc'::text, now())
  WHERE id = p_lead_id AND organization_id = v_org_id;

  INSERT INTO public.lead_assignment_history
    (organization_id, lead_id, assigned_from, assigned_to, assigned_by)
  VALUES
    (v_org_id, p_lead_id, v_current_owner, p_assigned_to, v_auth_user);

  INSERT INTO public.lead_activity
    (organization_id, lead_id, actor_id, action_type, metadata)
  VALUES
    (v_org_id, p_lead_id, v_auth_user, 'lead_reassigned',
      jsonb_build_object('assigned_from', v_current_owner, 'assigned_to', p_assigned_to,
        'details', 'Sales owner changed'));
END;
$$;

REVOKE ALL ON FUNCTION public.assign_lead(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_lead(UUID, UUID) TO authenticated;
