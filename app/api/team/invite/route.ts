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

    const { full_name, email, phone, role } = body;

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.INVALID_NAME, API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

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
      return createSafeErrorResponse('Cannot invite an additional Owner account.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    if (callerRole === 'manager' && requestedRole !== 'staff') {
      return createSafeErrorResponse('Managers are only authorized to invite Staff members.', API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE, 403);
    }

    const assignedRole: UserRole = (callerRole === 'owner' || callerRole === 'admin') && requestedRole === 'manager'
      ? 'manager'
      : 'staff';

    const adminClient = getAdminClient();
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE, API_ERROR_CODES.DATABASE_UNAVAILABLE, 500);
    }

    let createdUserId: string | null = null;
    let inviteSent = false;

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${origin}/accept-invite`;

    let inviteLink: string | null = null;

    if (adminClient) {
      // 7. Generate direct invite link via Supabase Auth Admin API
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email: cleanEmail,
        options: {
          redirectTo,
          data: {
            full_name: cleanName,
            name: cleanName,
            phone: cleanPhone,
            role: assignedRole,
            organization_id: caller.profile.organization_id || undefined,
          },
        },
      });

      if (linkData?.user) {
        createdUserId = linkData.user.id;
        inviteLink = linkData.properties?.action_link || null;
        inviteSent = true;
      } else {
        // Fallback: inviteUserByEmail
        const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo,
          data: {
            full_name: cleanName,
            name: cleanName,
            phone: cleanPhone,
            role: assignedRole,
            organization_id: caller.profile.organization_id || undefined,
          },
        });

        if (inviteErr) {
          const safeMsg = sanitizeErrorMessage(inviteErr || linkErr, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
          return createSafeErrorResponse(safeMsg, API_ERROR_CODES.VALIDATION_ERROR, 400);
        }
        createdUserId = inviteData.user.id;
        inviteSent = true;
      }
    } else {
      // Fallback standard sign up
      const tempPassword = `VenueOS@${Math.random().toString(36).slice(-8)}!2026`;
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

      if (signUpErr || !signUpData.user) {
        const safeMsg = sanitizeErrorMessage(signUpErr, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
        return createSafeErrorResponse(safeMsg, API_ERROR_CODES.VALIDATION_ERROR, 400);
      }
      createdUserId = signUpData.user.id;
    }

    // 8. Create profile record in public.profiles
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
        if (adminClient && createdUserId) {
          await adminClient.auth.admin.deleteUser(createdUserId).catch(() => {});
        }
        const safeMsg = sanitizeErrorMessage(profileErr, SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS);
        return createSafeErrorResponse(safeMsg, API_ERROR_CODES.CONFLICT_EMAIL_EXISTS, 409);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitation generated for ${cleanName} as ${assignedRole.toUpperCase()}.`,
      inviteLink,
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
