import { NextResponse } from 'next/server';
import { getVerifiedCaller } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { 
  createSafeErrorResponse, 
  API_ERROR_CODES, 
  SAFE_IDENTITY_ERRORS, 
  sanitizeErrorMessage 
} from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request) {
  try {
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

    if (caller.role !== 'owner') {
      return createSafeErrorResponse(
        'Only the Venue Owner can delete the organization.',
        API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
        403
      );
    }

    const body = await req.json().catch(() => ({}));
    const organizationId = caller.profile.organization_id;
    const confirmation = typeof body?.confirmation === 'string' ? body.confirmation.trim() : '';
    const organizationName = typeof body?.organizationName === 'string' ? body.organizationName.trim() : '';

    if (!organizationId || !organizationName || confirmation !== organizationName) {
      return createSafeErrorResponse(
        'The organization name confirmation did not match.',
        API_ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // The SQL function performs the owner check, logs an immutable audit trail into system_audit_logs,
    // and deletes the organization, all cascaded tenant data, and the current Supabase Auth user together.
    const client = await createServerSupabaseClient();
    if (!client) {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE,
        API_ERROR_CODES.DATABASE_UNAVAILABLE,
        500
      );
    }

    const { error } = await client.rpc('delete_current_organization', { p_organization_id: organizationId });

    if (error) {
      const safeMsg = sanitizeErrorMessage(error, 'Failed to delete organization.');
      return createSafeErrorResponse(safeMsg, API_ERROR_CODES.INTERNAL_ERROR, 400);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Organization and all related data were permanently deleted.' 
    });
  } catch (error) {
    const safeMsg = sanitizeErrorMessage(error, 'Unable to delete organization.');
    return createSafeErrorResponse(safeMsg, API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
