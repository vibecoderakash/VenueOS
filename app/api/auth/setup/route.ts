import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { checkEmailExists } from '@/lib/supabase/admin';
import { normalizeEmail, isValidEmail, SAFE_IDENTITY_ERRORS, sanitizeErrorMessage } from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const { full_name, email, phone, password, venue_name } = body;

    if (typeof venue_name !== 'string' || !venue_name.trim()) {
      return NextResponse.json({ error: 'Banquet or venue name is required.' }, { status: 400 });
    }

    // 1. Validation
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.INVALID_NAME }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.INVALID_EMAIL_FORMAT }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const cleanName = full_name.trim();
    const cleanPhone = phone ? String(phone).trim() : null;

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE },
        { status: 500 }
      );
    }

    // 2. Atomic check: Verify no Owner account exists
    const { data: existingOwners, error: queryError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .limit(1);

    if (queryError) {
      console.warn('Owner query note:', queryError.message);
    }

    if (Array.isArray(existingOwners) && existingOwners.length > 0) {
      return NextResponse.json(
        { error: SAFE_IDENTITY_ERRORS.OWNER_ALREADY_EXISTS },
        { status: 403 }
      );
    }

    // 3. Email Uniqueness Pre-Check
    const alreadyExists = await checkEmailExists(cleanEmail);
    if (alreadyExists) {
      return NextResponse.json(
        { error: SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS },
        { status: 409 }
      );
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
        return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS }, { status: 409 });
      }
      const safeMsg = sanitizeErrorMessage(authError, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
      return NextResponse.json({ error: safeMsg }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create owner account in Supabase Auth.' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 5. Ensure profile is saved with role = 'owner' and active = true
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: cleanName,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: 'owner',
        is_active: true,
        active: true,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      const safeMsg = sanitizeErrorMessage(profileError, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
      return NextResponse.json({ error: safeMsg }, { status: 409 });
    }

    const orgData = {
      id: 'org-' + (userId.slice(0, 8) || 'venue'),
      name: venue_name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      address: '',
      city: '',
      currency: 'INR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Venue OS Owner account created successfully.',
      user: {
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'owner',
      },
      organization: orgData,
    });
  } catch (err) {
    const safeMsg = sanitizeErrorMessage(err, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}
