-- ============================================================================
-- VENUE OS V1 - Authentication & User Profile Database Schema (Single Organization)
-- ============================================================================

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Create or verify PROFILES table (Linked 1:1 to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff', 'admin', 'sales', 'front_desk')) DEFAULT 'staff',
    is_active BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward compatibility columns if migrated from earlier schema
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id') THEN
        ALTER TABLE public.profiles ALTER COLUMN organization_id DROP NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') THEN
            UPDATE public.profiles SET full_name = name WHERE full_name IS NULL;
        ELSE
            ALTER TABLE public.profiles ADD COLUMN full_name TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') THEN
        ALTER TABLE public.profiles ADD COLUMN name TEXT;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
            UPDATE public.profiles SET name = full_name WHERE name IS NULL;
        ELSE
            ALTER TABLE public.profiles ADD COLUMN name TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'active') THEN
            UPDATE public.profiles SET is_active = active WHERE is_active IS NULL;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'active') THEN
        ALTER TABLE public.profiles ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 3. Case-Insensitive Unique Index for Email Uniqueness & Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_email ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profile count for setup check" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own personal details" ON public.profiles;
DROP POLICY IF EXISTS "Owners and managers can manage team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profile during setup" ON public.profiles;

-- Anyone authenticated can view active profiles (needed to display owner, team members, and assignees)
CREATE POLICY "Authenticated users can read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Allow public check if owner exists (for /setup page access validation)
CREATE POLICY "Public can view profile count for setup check"
    ON public.profiles FOR SELECT
    TO anon
    USING (role = 'owner');

-- Users can update their own personal info (name, phone)
CREATE POLICY "Users can update own personal details"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Helper function to fetch role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
    RETURN COALESCE(user_role, 'staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Owners and Managers can insert/update other staff profiles
CREATE POLICY "Owners and managers can manage team profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.get_auth_role() IN ('owner', 'manager', 'admin'));

-- Allow profile insert during sign-up trigger
CREATE POLICY "Allow insert profile during setup"
    ON public.profiles FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 6. Trigger: Automatically insert profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    owner_exists BOOLEAN;
    assigned_role TEXT;
    user_name TEXT;
    user_phone TEXT;
    normalized_email TEXT;
BEGIN
    normalized_email := LOWER(TRIM(NEW.email));

    -- Check if an owner already exists in the system
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'owner') INTO owner_exists;
    
    -- If no owner exists yet, the first user is granted the 'owner' role
    IF NOT owner_exists THEN
        assigned_role := 'owner';
    ELSE
        -- Otherwise default to metadata role if set by admin, or fallback to 'staff'
        assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
        -- Prevent unauthorized self-granting of owner role
        IF assigned_role = 'owner' THEN
            assigned_role := 'staff';
        END IF;
    END IF;

    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(normalized_email, '@', 1)
    );
    
    user_phone := NEW.raw_user_meta_data->>'phone';

    INSERT INTO public.profiles (
        id,
        full_name,
        name,
        email,
        phone,
        role,
        is_active,
        active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        user_name,
        user_name,
        normalized_email,
        user_phone,
        assigned_role,
        true,
        true,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 7. Trigger: Security check preventing non-owners from promoting themselves or creating extra owners
CREATE OR REPLACE FUNCTION public.check_profile_security()
RETURNS TRIGGER AS $$
DECLARE
    calling_user_role TEXT;
    existing_owner_count INT;
BEGIN
    -- Normalize email to lowercase
    NEW.email := LOWER(TRIM(NEW.email));

    -- Single owner constraint
    IF NEW.role = 'owner' THEN
        SELECT COUNT(*) INTO existing_owner_count 
        FROM public.profiles 
        WHERE role = 'owner' AND id != NEW.id;

        IF existing_owner_count > 0 THEN
            RAISE EXCEPTION 'Only one Owner account is permitted in Venue OS.';
        END IF;
    END IF;

    -- On UPDATE: check role elevation attempts
    IF TG_OP = 'UPDATE' AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        -- Get role of the authenticated caller
        SELECT role INTO calling_user_role FROM public.profiles WHERE id = auth.uid();

        -- If calling user is authenticated and not owner/service_role
        IF auth.uid() IS NOT NULL THEN
            -- Normal staff cannot change roles or activate/deactivate
            IF calling_user_role IS NULL OR calling_user_role = 'staff' THEN
                NEW.role := OLD.role;
                NEW.is_active := OLD.is_active;
                NEW.active := OLD.active;
            END IF;

            -- Managers cannot modify the Owner, create Owners, or promote to Manager
            IF calling_user_role = 'manager' THEN
                IF OLD.role = 'owner' OR NEW.role = 'owner' OR (OLD.role != 'manager' AND NEW.role = 'manager') THEN
                    RAISE EXCEPTION 'Managers cannot create, promote, or alter Owner/Manager roles.';
                END IF;
            END IF;
        END IF;
    END IF;

    -- Keep active and is_active in sync
    IF NEW.is_active IS NOT NULL THEN
        NEW.active := NEW.is_active;
    ELSIF NEW.active IS NOT NULL THEN
        NEW.is_active := NEW.active;
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_security ON public.profiles;
CREATE TRIGGER trg_profile_security
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_security();

-- 8. Trigger: Prevent deletion of Owner account at DB level
CREATE OR REPLACE FUNCTION public.check_profile_delete_security()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'owner' AND current_setting('app.organization_deletion', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'The Owner account cannot be deleted.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_delete_security ON public.profiles;
CREATE TRIGGER trg_profile_delete_security
    BEFORE DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_delete_security();
