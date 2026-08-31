import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getVerifiedCaller } from '@/lib/supabase/admin';
import { 
  SAFE_IDENTITY_ERRORS, 
  sanitizeErrorMessage, 
  createSafeErrorResponse, 
  API_ERROR_CODES 
} from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Authenticate caller and resolve database permissions
    const { caller, error: authError, statusCode } = await getVerifiedCaller(req);
    if (authError || !caller) {
      return createSafeErrorResponse(
        authError || SAFE_IDENTITY_ERRORS.UNAUTHORIZED,
        API_ERROR_CODES.UNAUTHORIZED,
        statusCode || 401
      );
    }

    if (!caller.isActive) {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.FORBIDDEN_DEACTIVATED,
        API_ERROR_CODES.FORBIDDEN_DEACTIVATED,
        403
      );
    }

    const callerRole = caller.role;
    if (callerRole !== 'owner' && callerRole !== 'manager' && callerRole !== 'admin') {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.INSUFFICIENT_PERMISSIONS,
        API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
        403
      );
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE,
        API_ERROR_CODES.DATABASE_UNAVAILABLE,
        500
      );
    }

    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', caller.profile.organization_id)
      .order('created_at', { ascending: true });

    if (membersError) {
      const safeMsg = sanitizeErrorMessage(membersError, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
      return createSafeErrorResponse(safeMsg, API_ERROR_CODES.INTERNAL_ERROR, 500);
    }

    const normalizedMembers = (members || []).map((m) => ({
      id: m.id,
      name: m.name || m.full_name || 'Staff User',
      full_name: m.full_name || m.name || 'Staff User',
      email: m.email || '',
      phone: m.phone || null,
      role: m.role || 'staff',
      active: m.is_active !== undefined ? Boolean(m.is_active) : (m.active !== undefined ? Boolean(m.active) : true),
      is_active: m.is_active !== undefined ? Boolean(m.is_active) : (m.active !== undefined ? Boolean(m.active) : true),
      created_at: m.created_at || new Date().toISOString(),
      updated_at: m.updated_at || new Date().toISOString(),
    }));

    return NextResponse.json({ members: normalizedMembers });
  } catch (err) {
    const safeError = sanitizeErrorMessage(err, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
    return createSafeErrorResponse(safeError, API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
