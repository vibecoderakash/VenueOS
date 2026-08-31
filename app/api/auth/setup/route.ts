import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { checkEmailExists } from '@/lib/supabase/admin';
import { 
  normalizeEmail, 
  isValidEmail, 
  SAFE_IDENTITY_ERRORS, 
  sanitizeErrorMessage,
  createSafeErrorResponse,
  API_ERROR_CODES 
} from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return createSafeErrorResponse('Invalid JSON payload.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const { full_name, email, phone, password, venue_name } = body;

    if (typeof venue_name !== 'string' || !venue_name.trim()) {
      return createSafeErrorResponse('Banquet or venue name is required.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    // 1. Validation
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.INVALID_NAME, API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.INVALID_EMAIL_FORMAT, API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return createSafeErrorResponse('Password must be at least 8 characters long.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const cleanName = full_name.trim();
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!cleanPhone) {
      return createSafeErrorResponse('Phone number is required.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE, API_ERROR_CODES.DATABASE_UNAVAILABLE, 500);
    }

    // 2. Atomic check: Verify no Owner account exists via RPC or query
    const { data: rpcHasOwner, error: rpcErr } = await supabase.rpc('check_has_owner');
    if (!rpcErr && rpcHasOwner === true) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.OWNER_ALREADY_EXISTS, API_ERROR_CODES.CONFLICT_OWNER_EXISTS, 403);
    }

    const { data: existingOwners, error: queryError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .not('organization_id', 'is', null)
      .limit(1);

    if (queryError) {
      console.warn('Owner query note:', queryError.message);
    }

    if (Array.isArray(existingOwners) && existingOwners.length > 0) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.OWNER_ALREADY_EXISTS, API_ERROR_CODES.CONFLICT_OWNER_EXISTS, 403);
    }

    // 3. Email Uniqueness Pre-Check
    const alreadyExists = await checkEmailExists(cleanEmail);
    if (alreadyExists) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS, API_ERROR_CODES.CONFLICT_EMAIL_EXISTS, 409);
    }

    // 4. Create User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          name: cleanName,
          phone: cleanPhone,
          role: 'owner',
          venue_name: venue_name.trim(),
        },
      },
    });

    if (authError) {
      if (authError.status === 409 || authError.status === 422) {
        return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS, API_ERROR_CODES.CONFLICT_EMAIL_EXISTS, 409);
      }
      const safeMsg = sanitizeErrorMessage(authError, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
      return createSafeErrorResponse(safeMsg, API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    if (!authData.user) {
      return createSafeErrorResponse('Failed to create owner account in Supabase Auth.', API_ERROR_CODES.INTERNAL_ERROR, 500);
    }

    const userId = authData.user.id;

    return NextResponse.json({
      success: true,
      message: 'Venue OS Owner account and organization created successfully.',
      user: {
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'owner',
      },
    });
  } catch (err) {
    const safeMsg = sanitizeErrorMessage(err, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
    return createSafeErrorResponse(safeMsg, API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
