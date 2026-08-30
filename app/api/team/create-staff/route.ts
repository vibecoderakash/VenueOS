import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient, getVerifiedCaller, checkEmailExists } from '@/lib/supabase/admin';
import { normalizeEmail, isValidEmail, SAFE_IDENTITY_ERRORS, sanitizeErrorMessage } from '@/lib/validations/identity';
import { UserRole } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate caller and resolve database permissions (never trust client claims)
    const { caller, error: authError, statusCode } = await getVerifiedCaller(req);
    if (authError || !caller) {
      return NextResponse.json(
        { error: authError || SAFE_IDENTITY_ERRORS.UNAUTHORIZED },
        { status: statusCode || 401 }
      );
    }

    // 2. Validate caller active status
    if (!caller.isActive) {
      return NextResponse.json(
        { error: SAFE_IDENTITY_ERRORS.FORBIDDEN_DEACTIVATED },
        { status: 403 }
      );
    }

    // 3. Authorize caller role (only Owner, Manager, or Admin)
    const callerRole = caller.role;
    if (callerRole !== 'owner' && callerRole !== 'manager' && callerRole !== 'admin') {
      return NextResponse.json(
        { error: SAFE_IDENTITY_ERRORS.INSUFFICIENT_PERMISSIONS },
        { status: 403 }
      );
    }

    // 4. Parse and normalize input
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { full_name, email, phone, role, password } = body;

    // Validate Full Name
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.INVALID_NAME }, { status: 400 });
    }

    // Validate & Normalize Email
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.INVALID_EMAIL_FORMAT }, { status: 400 });
    }

    const cleanName = full_name.trim();
    const cleanPhone = phone ? String(phone).trim() : null;

    // 5. Pre-check: Enforce ONE EMAIL = ONE ACCOUNT
    // Reject immediately if the email already belongs to any Venue OS profile
    const alreadyExists = await checkEmailExists(cleanEmail);
    if (alreadyExists) {
      return NextResponse.json(
        { error: SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS },
        { status: 409 }
      );
    }

    // 6. Role validation and strict assignment enforcement
    const requestedRole = String(role || 'staff').toLowerCase().trim();
    if (requestedRole === 'owner') {
      return NextResponse.json(
        { error: 'Cannot create an additional Owner account.' },
        { status: 400 }
      );
    }

    // Managers cannot create other Managers
    if (callerRole === 'manager' && requestedRole !== 'staff') {
      return NextResponse.json(
        { error: 'Managers are only authorized to add Staff members.' },
        { status: 403 }
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
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE }, { status: 500 });
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
        // Safe error masking for duplicates or auth conflicts
        const safeMsg = sanitizeErrorMessage(adminErr, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
        return NextResponse.json({ error: safeMsg }, { status: 400 });
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
        return NextResponse.json({ error: safeMsg }, { status: 400 });
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
        // Handle duplicate key / race condition
        const safeMsg = sanitizeErrorMessage(profileErr, SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS);
        return NextResponse.json({ error: safeMsg }, { status: 409 });
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
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
