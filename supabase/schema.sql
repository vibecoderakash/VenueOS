-- ============================================================================
-- VENUE OS V1 - Multi-Tenant Banquet Hall SaaS Database Schema
-- System of Record: PostgreSQL on Supabase
-- Features: Multi-Tenancy with RLS, Leads, Discussions, Follow-ups, Audit Logs
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'sales');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_priority AS ENUM ('High', 'Medium', 'Low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_source AS ENUM (
        'Meta', 'WhatsApp', 'Instagram', 'Facebook', 'Website', 
        'Google', 'Referral', 'Walk-in', 'Phone Call', 'Google Business Profile', 'Other', 'not_provided'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE banquet_event_type AS ENUM (
        'Wedding', 'Reception', 'Birthday', 'Ring Ceremony', 
        'Anniversary', 'Corporate', 'Party', 'Other',
        'Kitty Party', 'Annaprashan', 'not_provided'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. ORGANIZATIONS TABLE (Tenant boundary)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    logo_url TEXT,
    currency TEXT DEFAULT 'INR',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PROFILES / USERS TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'sales',
    avatar_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. LEADS TABLE (Core Banquet Inquiry Record)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    source lead_source NOT NULL DEFAULT 'Other',
    event_type banquet_event_type NOT NULL DEFAULT 'not_provided',
    event_date_status TEXT NOT NULL DEFAULT 'fixed' CHECK (event_date_status IN ('fixed', 'not_fixed')),
    event_date DATE,
    guest_count_status TEXT NOT NULL DEFAULT 'fixed' CHECK (guest_count_status IN ('fixed', 'not_fixed')),
    guest_count INTEGER,
    budget NUMERIC(12, 2) CHECK (budget >= 0),
    requirement TEXT,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status lead_status NOT NULL DEFAULT 'New',
    priority lead_priority NOT NULL DEFAULT 'Medium',
    next_follow_up_at TIMESTAMPTZ,
    follow_up_note TEXT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Consistency Constraints
    CONSTRAINT chk_leads_event_date_consistency CHECK (
        (event_date_status = 'fixed' AND event_date IS NOT NULL) OR
        (event_date_status = 'not_fixed' AND event_date IS NULL)
    ),
    CONSTRAINT chk_leads_guest_count_consistency CHECK (
        (guest_count_status = 'fixed' AND guest_count IS NOT NULL AND guest_count > 0) OR
        (guest_count_status = 'not_fixed' AND guest_count IS NULL)
    )
);

-- Migration helper for existing databases
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'event_date_status') THEN
            ALTER TABLE public.leads ADD COLUMN event_date_status TEXT NOT NULL DEFAULT 'fixed' CHECK (event_date_status IN ('fixed', 'not_fixed'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'guest_count_status') THEN
            ALTER TABLE public.leads ADD COLUMN guest_count_status TEXT NOT NULL DEFAULT 'fixed' CHECK (guest_count_status IN ('fixed', 'not_fixed'));
        END IF;
    END IF;
END $$;

-- Migration helper for existing ENUM types
DO $$ 
BEGIN
    ALTER TYPE banquet_event_type ADD VALUE 'Kitty Party';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    ALTER TYPE banquet_event_type ADD VALUE 'Annaprashan';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    ALTER TYPE banquet_event_type ADD VALUE 'not_provided';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


DO $$ 
BEGIN
    ALTER TYPE lead_source ADD VALUE 'Phone Call';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    ALTER TYPE lead_source ADD VALUE 'Google Business Profile';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    ALTER TYPE lead_source ADD VALUE 'not_provided';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. LEAD DISCUSSIONS TABLE (Chronological Manual Notes)
CREATE TABLE IF NOT EXISTS public.lead_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. LEAD ASSIGNMENT HISTORY TABLE
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

-- 8. LEAD ACTIVITY TABLE (Audit Log / Activity Trail)
CREATE TABLE IF NOT EXISTS public.lead_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_phone ON public.leads(organization_id, phone);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON public.leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_org_followup ON public.leads(organization_id, next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_org_owner ON public.leads(organization_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_archived ON public.leads(organization_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_discussions_lead ON public.lead_discussions(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_lead ON public.lead_activity(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org ON public.lead_activity(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_lead ON public.lead_assignment_history(lead_id, created_at DESC);

-- Trigram Index for fuzzy customer name search
CREATE INDEX IF NOT EXISTS idx_leads_customer_name_trgm ON public.leads USING gin(customer_name gin_trgm_ops);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch current authenticated user's organization_id
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM public.profiles 
        WHERE id = auth.uid() 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to fetch current authenticated user's role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.profiles 
        WHERE id = auth.uid() 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Organization Policies
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (id = public.get_auth_org_id());

CREATE POLICY "Owners and Admins can update their organization"
    ON public.organizations FOR UPDATE
    USING (id = public.get_auth_org_id() AND public.get_auth_role() IN ('owner', 'admin'));

-- Profiles Policies
CREATE POLICY "Users can view profiles in their organization"
    ON public.profiles FOR SELECT
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Admins/Owners can manage organization profiles"
    ON public.profiles FOR ALL
    USING (organization_id = public.get_auth_org_id() AND public.get_auth_role() IN ('owner', 'admin'));

-- Leads Policies
CREATE POLICY "Users can view organization leads"
    ON public.leads FOR SELECT
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can insert leads into their organization"
    ON public.leads FOR INSERT
    WITH CHECK (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can update leads in their organization"
    ON public.leads FOR UPDATE
    USING (organization_id = public.get_auth_org_id());

-- Discussions Policies
CREATE POLICY "Users can view discussions for organization leads"
    ON public.lead_discussions FOR SELECT
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "Users can add discussions to organization leads"
    ON public.lead_discussions FOR INSERT
    WITH CHECK (organization_id = public.get_auth_org_id() AND author_id = auth.uid());

CREATE POLICY "Authors and Admins can update discussions"
    ON public.lead_discussions FOR UPDATE
    USING (organization_id = public.get_auth_org_id() AND (author_id = auth.uid() OR public.get_auth_role() IN ('owner', 'admin')));

CREATE POLICY "Authors and Admins can delete discussions"
    ON public.lead_discussions FOR DELETE
    USING (organization_id = public.get_auth_org_id() AND (author_id = auth.uid() OR public.get_auth_role() IN ('owner', 'admin')));

-- Activity Policies
CREATE POLICY "Users can view organization activity"
    ON public.lead_activity FOR SELECT
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "System/Users can insert activity logs"
    ON public.lead_activity FOR INSERT
    WITH CHECK (organization_id = public.get_auth_org_id());

-- Assignment History Policies
CREATE POLICY "Users can view organization assignment history"
    ON public.lead_assignment_history FOR SELECT
    USING (organization_id = public.get_auth_org_id());

CREATE POLICY "System can insert assignment logs"
    ON public.lead_assignment_history FOR INSERT
    WITH CHECK (organization_id = public.get_auth_org_id());

-- 11. AUTOMATED UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.lead_discussions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 12. LEAD ASSIGNMENT SECURITY AND LOGIC

-- Trigger function to enforce RLS on owner_id updates (prevent unauthorized assignments)
CREATE OR REPLACE FUNCTION public.check_lead_owner_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
        IF public.get_auth_role() NOT IN ('owner', 'manager') THEN
            RAISE EXCEPTION 'Unauthorized: Only owners and managers can reassign leads';
        END IF;
        -- V1 Rule: Manager cannot assign to Owner (prevented by checking target user role)
        IF public.get_auth_role() = 'manager' THEN
            IF (SELECT role FROM public.profiles WHERE id = NEW.owner_id LIMIT 1) = 'owner' THEN
                RAISE EXCEPTION 'Unauthorized: Managers cannot assign leads to Owners';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_lead_owner_update_auth
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.check_lead_owner_update();

-- RPC for safely executing atomic lead reassignment
CREATE OR REPLACE FUNCTION public.assign_lead(p_lead_id UUID, p_assigned_to UUID)
RETURNS void AS $$
DECLARE
    v_org_id UUID;
    v_current_owner UUID;
    v_auth_user UUID;
    v_auth_role user_role;
    v_target_role user_role;
    v_target_active BOOLEAN;
BEGIN
    v_auth_user := auth.uid();
    v_auth_role := public.get_auth_role();
    
    -- Get lead info
    SELECT organization_id, owner_id INTO v_org_id, v_current_owner
    FROM public.leads WHERE id = p_lead_id AND organization_id = public.get_auth_org_id();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found or unauthorized';
    END IF;

    IF v_current_owner = p_assigned_to THEN
        RETURN; -- Already assigned to this user
    END IF;
    
    -- Get target user info
    SELECT role, active INTO v_target_role, v_target_active
    FROM public.profiles WHERE id = p_assigned_to AND organization_id = v_org_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found in organization';
    END IF;
    
    IF NOT v_target_active THEN
        RAISE EXCEPTION 'Cannot assign lead to an inactive user';
    END IF;
    
    -- Enforce rules (The trigger also checks this, but we check here to prevent even trying)
    IF v_auth_role = 'sales' THEN
        RAISE EXCEPTION 'Staff cannot reassign leads';
    END IF;
    
    IF v_auth_role = 'manager' AND v_target_role = 'owner' THEN
        RAISE EXCEPTION 'Managers cannot assign leads to Owners';
    END IF;
    
    -- Update lead (Trigger check_lead_owner_update will fire and validate again securely)
    UPDATE public.leads
    SET owner_id = p_assigned_to, updated_at = now()
    WHERE id = p_lead_id;
    
    -- Insert history
    INSERT INTO public.lead_assignment_history
    (organization_id, lead_id, assigned_from, assigned_to, assigned_by)
    VALUES (v_org_id, p_lead_id, v_current_owner, p_assigned_to, v_auth_user);
    
    -- Insert activity log
    INSERT INTO public.lead_activity
    (organization_id, lead_id, actor_id, action_type, metadata)
    VALUES (v_org_id, p_lead_id, v_auth_user, 'lead_reassigned', 
            jsonb_build_object('assigned_from', v_current_owner, 'assigned_to', p_assigned_to));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. SYSTEM AUDIT LOGS TABLE & POLICIES
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

CREATE POLICY "Owners and Admins can view organization audit logs"
    ON public.system_audit_logs FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_auth_org_id() 
        AND public.get_auth_role() IN ('owner', 'admin')
    );

-- 14. PUBLIC / SECURE HELPER FUNCTIONS

-- Check if an Owner account exists safely without exposing PII
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

-- Delete organization with audit trail
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

