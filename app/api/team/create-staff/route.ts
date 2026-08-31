import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient, getVerifiedCaller, checkEmailExists } from '@/lib/supabase/admin';
import { 
  normalizeEmail, 
  isValidEmail, 
  SAFE_IDENTITY_ERRORS, 
  sanitizeErrorMessage,
  createSafeErrorResponse,
  API_ERROR_CODES 
} from '@/lib/validations/identity';
import { UserRole } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate caller and resolve database permissions (never trust client claims)
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

    // 3. Authorize caller role (only Owner, Manager, or Admin)
    const callerRole = caller.role;
    if (callerRole !== 'owner' && callerRole !== 'manager' && callerRole !== 'admin') {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.INSUFFICIENT_PERMISSIONS,
        API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
        403
      );
    }

    // 4. Parse and normalize input
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return createSafeErrorResponse('Invalid JSON request body.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const { full_name, email, phone, role, password } = body;

    // Validate Full Name
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.INVALID_NAME, API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    // Validate & Normalize Email
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.INVALID_EMAIL_FORMAT, API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const cleanName = full_name.trim();
    const cleanPhone = phone ? String(phone).trim() : null;

    // 5. Pre-check: Enforce ONE EMAIL = ONE ACCOUNT
    const alreadyExists = await checkEmailExists(cleanEmail);
    if (alreadyExists) {
      return createSafeErrorResponse(
        SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS,
        API_ERROR_CODES.CONFLICT_EMAIL_EXISTS,
        409
      );
    }

    // 6. Role validation and strict assignment enforcement
    const requestedRole = String(role || 'staff').toLowerCase().trim();
    if (requestedRole === 'owner') {
      return createSafeErrorResponse(
        'Cannot create an additional Owner account.',
        API_ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Managers cannot create other Managers
    if (callerRole === 'manager' && requestedRole !== 'staff') {
      return createSafeErrorResponse(
        'Managers are only authorized to add Staff members.',
        API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
        403
      );
    }

    const assignedRole: UserRole = (callerRole === 'owner' || callerRole === 'admin') && requestedRole === 'manager'
      ? 'manager'
      : 'staff';

    // Password generation or validation
    const tempPassword = typeof password === 'string' && password.length >= 8
      ? password
      : `VenueOS@${Math.random().toString(36).slice(-8)}!2026`;

    // 7. Atomic Creation in Supabase Auth & public.profiles
    const adminClient = getAdminClient();
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE, API_ERROR_CODES.DATABASE_UNAVAILABLE, 500);
    }

    let createdUserId: string | null = null;

    if (adminClient) {
      // Use Admin API if service role key is available
      const { data: adminData, error: adminErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          name: cleanName,
          phone: cleanPhone,
          role: assignedRole,
          organization_id: caller.profile.organization_id || undefined,
        },
      });

      if (adminErr) {
        const safeMsg = sanitizeErrorMessage(adminErr, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
        return createSafeErrorResponse(safeMsg, API_ERROR_CODES.VALIDATION_ERROR, 400);
      }

      createdUserId = adminData.user.id;
    } else {
      // Fallback: standard sign up
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: tempPassword,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName,
            phone: cleanPhone,
            role: assignedRole,
            organization_id: caller.profile.organization_id || undefined,
          },
        },
      });

      if (signUpErr) {
        const safeMsg = sanitizeErrorMessage(signUpErr, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
        return createSafeErrorResponse(safeMsg, API_ERROR_CODES.VALIDATION_ERROR, 400);
      }

      createdUserId = signUpData.user?.id || null;
    }

    // 8. Ensure Profile Record is securely created / upserted with normalized email & enforced role
    if (createdUserId) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: createdUserId,
          full_name: cleanName,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: assignedRole,
          is_active: true,
          active: true,
          organization_id: caller.profile.organization_id || undefined,
          updated_at: new Date().toISOString(),
        });

      if (profileErr) {
        const safeMsg = sanitizeErrorMessage(profileErr, SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS);
        return createSafeErrorResponse(safeMsg, API_ERROR_CODES.CONFLICT_EMAIL_EXISTS, 409);
      }
    }

    // 9. Return sanitized success response
    return NextResponse.json({
      success: true,
      message: `Account created for ${cleanName} as ${assignedRole.toUpperCase()}.`,
      member: {
        id: createdUserId,
        full_name: cleanName,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: assignedRole,
        is_active: true,
      },
    });
  } catch (err) {
    const safeError = sanitizeErrorMessage(err, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
    return createSafeErrorResponse(safeError, API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
