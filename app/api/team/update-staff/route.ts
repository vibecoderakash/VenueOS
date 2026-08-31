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

export async function PATCH(req: Request) {
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

    // 3. Authorize caller role
    const callerRole = caller.role;
    if (callerRole !== 'owner' && callerRole !== 'manager' && callerRole !== 'admin') {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.INSUFFICIENT_PERMISSIONS,
        API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
        403
      );
    }

    // 4. Parse input
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return createSafeErrorResponse('Invalid JSON request body.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const { memberId, full_name, phone, role, is_active } = body;

    if (!memberId || typeof memberId !== 'string') {
      return createSafeErrorResponse('Target member ID is required.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE, API_ERROR_CODES.DATABASE_UNAVAILABLE, 500);
    }

    // 5. Fetch target member profile from database
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.MEMBER_NOT_FOUND, API_ERROR_CODES.RESOURCE_NOT_FOUND, 404);
    }

    // Ensure member belongs to the same organization
    if (targetProfile.organization_id && targetProfile.organization_id !== caller.profile.organization_id) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.INSUFFICIENT_PERMISSIONS, API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE, 403);
    }

    // 6. Security constraints & role elevation prevention
    // Owner cannot deactivate themselves
    if (targetProfile.id === caller.user.id && is_active === false) {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.OWNER_DEACTIVATION_FORBIDDEN,
        API_ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Never allow promoting anyone to Owner
    if (role === 'owner' && targetProfile.role !== 'owner') {
      return createSafeErrorResponse('Cannot promote another user to Owner.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    // Users cannot change their own role
    if (targetProfile.id === caller.user.id && role !== undefined && role !== targetProfile.role) {
      return createSafeErrorResponse('You cannot change your own role.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    // Manager restrictions:
    if (callerRole === 'manager') {
      if (targetProfile.role === 'owner' || targetProfile.role === 'manager' || targetProfile.role === 'admin') {
        return createSafeErrorResponse(
          'Managers cannot modify Owner or Manager profiles.',
          API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
          403
        );
      }
      if (role && role !== 'staff') {
        return createSafeErrorResponse(
          'Managers can only assign the Staff role.',
          API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
          403
        );
      }
    }

    // 7. Build sanitized updates
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined && typeof full_name === 'string' && full_name.trim().length >= 2) {
      updates.full_name = full_name.trim();
      updates.name = full_name.trim();
    }

    if (phone !== undefined) {
      updates.phone = phone ? String(phone).trim() : null;
    }

    if (role !== undefined && (callerRole === 'owner' || callerRole === 'admin')) {
      if (['manager', 'staff'].includes(String(role).toLowerCase())) {
        updates.role = String(role).toLowerCase();
      }
    }

    if (is_active !== undefined) {
      const activeVal = Boolean(is_active);
      updates.is_active = activeVal;
      updates.active = activeVal;
    }

    const { data: updatedData, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      const safeMsg = sanitizeErrorMessage(updateError, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
      return createSafeErrorResponse(safeMsg, API_ERROR_CODES.INTERNAL_ERROR, 500);
    }

    return NextResponse.json({
      success: true,
      message: 'Team member updated successfully.',
      member: updatedData,
    });
  } catch (err) {
    const safeError = sanitizeErrorMessage(err, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
    return createSafeErrorResponse(safeError, API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
