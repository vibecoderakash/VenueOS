import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getVerifiedCaller, getAdminClient } from '@/lib/supabase/admin';
import { SAFE_IDENTITY_ERRORS, sanitizeErrorMessage } from '@/lib/validations/identity';

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

    // 3. Authorize caller role (STRICTLY Owner or Admin)
    const callerRole = caller.role;
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only the Venue Owner has permission to delete team members.' },
        { status: 403 }
      );
    }

    // 4. Parse input memberId
    let memberId: string | null = null;
    try {
      const body = await req.json();
      memberId = body?.memberId;
    } catch {
      // If JSON body parse fails, attempt to read from URL search params
      const url = new URL(req.url);
      memberId = url.searchParams.get('memberId');
    }

    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json({ error: 'Target member ID is required.' }, { status: 400 });
    }

    // 5. Self-deletion prevention
    if (memberId === caller.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account.' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE }, { status: 500 });
    }

    // 6. Fetch target profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.MEMBER_NOT_FOUND }, { status: 404 });
    }

    // 7. Security check: Owner can never be deleted
    if (targetProfile.role === 'owner') {
      return NextResponse.json(
        { error: 'The Owner account cannot be deleted.' },
        { status: 400 }
      );
    }

    // 9. Unassign any leads assigned to this member to prevent dangling relations
    await supabase
      .from('leads')
      .update({ owner_id: null, updated_at: new Date().toISOString() })
      .eq('owner_id', memberId);

    // 10. Admin client operations: delete from Supabase Auth & public.profiles
    const admin = getAdminClient();
    if (admin) {
      // Delete user from Supabase Auth
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(memberId);
      if (authDeleteError) {
        console.warn('Auth admin delete user note:', authDeleteError.message);
      }

      // Delete from public.profiles
      const { error: profileDeleteError } = await admin
        .from('profiles')
        .delete()
        .eq('id', memberId);

      if (profileDeleteError) {
        console.warn('Profile delete error:', profileDeleteError.message);
      }
    } else {
      // Fallback with regular server client
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId);

      if (profileDeleteError) {
        const safeMsg = sanitizeErrorMessage(profileDeleteError, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
        return NextResponse.json({ error: safeMsg }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${targetProfile.full_name || targetProfile.name || 'Team member'} has been permanently deleted.`,
    });
  } catch (err) {
    const safeError = sanitizeErrorMessage(err, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
