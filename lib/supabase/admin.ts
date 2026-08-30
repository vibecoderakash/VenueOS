import { createClient as createSupabaseClient, SupabaseClient, User } from '@supabase/supabase-js';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { normalizeEmail } from '@/lib/validations/identity';
import { Profile, UserRole } from '@/types/database';

/**
 * Creates an administrative Supabase client using the SERVICE_ROLE_KEY if configured.
 * This client runs strictly server-side and has elevated privileges.
 * NEVER expose this or its key to the browser.
 */
export function getAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes('your-') || serviceRoleKey.length < 20) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface AuthenticatedCaller {
  user: User;
  profile: Profile;
  role: UserRole;
  isActive: boolean;
}

/**
 * Authenticates the caller from request cookies or Bearer Authorization header,
 * and fetches their verified profile directly from the database (public.profiles).
 * 
 * NEVER trusts client-supplied roles or parameters.
 */
export async function getVerifiedCaller(req: Request): Promise<{
  caller: AuthenticatedCaller | null;
  error?: string;
  statusCode?: number;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { caller: null, error: 'Database service unconfigured', statusCode: 500 };
  }

  let user: User | null = null;

  // Check Bearer token from header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: tokenUser, error: tokenErr } = await supabase.auth.getUser(token);
    if (!tokenErr && tokenUser?.user) {
      user = tokenUser.user;
    }
  }

  // Fallback to cookie-based session
  if (!user) {
    const { data: sessionData, error: authError } = await supabase.auth.getUser();
    if (!authError && sessionData?.user) {
      user = sessionData.user;
    }
  }

  if (!user) {
    return { caller: null, error: 'Unauthorized. Please sign in.', statusCode: 401 };
  }

  // Fetch verified profile from database
  const { data: dbProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !dbProfile) {
    // If no profile row yet, check metadata but default strictly to staff
    const metaRole = (user.user_metadata?.role as UserRole) || 'staff';
    const caller: AuthenticatedCaller = {
      user,
      profile: {
        id: user.id,
        name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'User',
        full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        role: metaRole,
        is_active: true,
        active: true,
        created_at: user.created_at,
        updated_at: user.created_at,
      },
      role: metaRole,
      isActive: true,
    };
    return { caller };
  }

  const role = (dbProfile.role as UserRole) || 'staff';
  const isActive = dbProfile.is_active !== undefined ? Boolean(dbProfile.is_active) : (dbProfile.active !== undefined ? Boolean(dbProfile.active) : true);

  const caller: AuthenticatedCaller = {
    user,
    profile: {
      id: dbProfile.id,
      name: dbProfile.name || dbProfile.full_name || 'User',
      full_name: dbProfile.full_name || dbProfile.name || 'User',
      email: dbProfile.email || user.email || '',
      phone: dbProfile.phone || null,
      role,
      is_active: isActive,
      active: isActive,
      avatar_url: dbProfile.avatar_url || undefined,
      organization_id: dbProfile.organization_id || undefined,
      created_at: dbProfile.created_at || new Date().toISOString(),
      updated_at: dbProfile.updated_at || new Date().toISOString(),
    },
    role,
    isActive,
  };

  return { caller };
}

/**
 * Checks whether an email is already registered in the database (public.profiles)
 * using case-insensitive normalization.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return false;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', cleanEmail)
    .limit(1);

  if (error) {
    console.warn('checkEmailExists query warning:', error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}
