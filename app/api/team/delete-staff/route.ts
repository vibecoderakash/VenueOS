import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getVerifiedCaller, getAdminClient } from '@/lib/supabase/admin';
import { 
  SAFE_IDENTITY_ERRORS, 
  sanitizeErrorMessage,
  createSafeErrorResponse,
  API_ERROR_CODES 
} from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleDeleteStaff(req);
}

export async function DELETE(req: Request) {
  return handleDeleteStaff(req);
}

async function handleDeleteStaff(req: Request) {
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

    // 2. Validate caller active status
    if (!caller.isActive) {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.FORBIDDEN_DEACTIVATED,
        API_ERROR_CODES.FORBIDDEN_DEACTIVATED,
        403
      );
    }

    // 3. Authorize caller role (STRICTLY Owner or Admin)
    const callerRole = caller.role;
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      return createSafeErrorResponse(
        'Only the Venue Owner has permission to delete team members.',
        API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
        403
      );
    }

    // 4. Parse input memberId
    let memberId: string | null = null;
    try {
      const body = await req.json();
      memberId = body?.memberId;
    } catch {
      const url = new URL(req.url);
      memberId = url.searchParams.get('memberId');
    }

    if (!memberId || typeof memberId !== 'string') {
      return createSafeErrorResponse('Target member ID is required.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    // 5. Self-deletion prevention
    if (memberId === caller.user.id) {
      return createSafeErrorResponse('You cannot delete your own account.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE, API_ERROR_CODES.DATABASE_UNAVAILABLE, 500);
    }

    // 6. Fetch target profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.MEMBER_NOT_FOUND, API_ERROR_CODES.RESOURCE_NOT_FOUND, 404);
    }

    // 7. Security check: Owner can never be deleted
    if (targetProfile.role === 'owner') {
      return createSafeErrorResponse('The Owner account cannot be deleted.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    // 8. Ensure target profile belongs to the caller's organization
    if (targetProfile.organization_id && targetProfile.organization_id !== caller.profile.organization_id) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.INSUFFICIENT_PERMISSIONS, API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE, 403);
    }

    // 9. Unassign any leads assigned to this member to prevent dangling relations
    await supabase
      .from('leads')
      .update({ owner_id: null, updated_at: new Date().toISOString() })
      .eq('owner_id', memberId);

    // 10. Admin client operations: delete from Supabase Auth & public.profiles
    const admin = getAdminClient();
    if (admin) {
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(memberId);
      if (authDeleteError) {
        console.warn('Auth admin delete user note:', authDeleteError.message);
      }

      const { error: profileDeleteError } = await admin
        .from('profiles')
        .delete()
        .eq('id', memberId);

      if (profileDeleteError) {
        console.warn('Profile delete error:', profileDeleteError.message);
      }
    } else {
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId);

      if (profileDeleteError) {
        const safeMsg = sanitizeErrorMessage(profileDeleteError, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
        return createSafeErrorResponse(safeMsg, API_ERROR_CODES.INTERNAL_ERROR, 500);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${targetProfile.full_name || targetProfile.name || 'Team member'} has been permanently deleted.`,
    });
  } catch (err) {
    const safeError = sanitizeErrorMessage(err, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
    return createSafeErrorResponse(safeError, API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
