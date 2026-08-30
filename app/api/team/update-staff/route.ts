import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getVerifiedCaller } from '@/lib/supabase/admin';
import { SAFE_IDENTITY_ERRORS, sanitizeErrorMessage } from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
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

    // 3. Authorize caller role
    const callerRole = caller.role;
    if (callerRole !== 'owner' && callerRole !== 'manager' && callerRole !== 'admin') {
      return NextResponse.json(
        { error: SAFE_IDENTITY_ERRORS.INSUFFICIENT_PERMISSIONS },
        { status: 403 }
      );
    }

    // 4. Parse input
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { memberId, full_name, phone, role, is_active } = body;

    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json({ error: 'Target member ID is required.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE }, { status: 500 });
    }

    // 5. Fetch target member profile from database
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: SAFE_IDENTITY_ERRORS.MEMBER_NOT_FOUND }, { status: 404 });
    }

    // 6. Security constraints & role elevation prevention
    // Owner cannot deactivate themselves
    if (targetProfile.id === caller.user.id && is_active === false) {
      return NextResponse.json(
        { error: SAFE_IDENTITY_ERRORS.OWNER_DEACTIVATION_FORBIDDEN },
        { status: 400 }
      );
    }

    // Never allow promoting anyone to Owner
    if (role === 'owner' && targetProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Cannot promote another user to Owner.' },
        { status: 400 }
      );
    }

    // Users cannot change their own role
    if (targetProfile.id === caller.user.id && role !== undefined && role !== targetProfile.role) {
      return NextResponse.json(
        { error: 'You cannot change your own role.' },
        { status: 400 }
      );
    }

    // Manager restrictions:
    // Managers cannot modify Owners or other Managers, and can only assign 'staff' role
    if (callerRole === 'manager') {
      if (targetProfile.role === 'owner' || targetProfile.role === 'manager' || targetProfile.role === 'admin') {
        return NextResponse.json(
          { error: 'Managers cannot modify Owner or Manager profiles.' },
          { status: 403 }
        );
      }
      if (role && role !== 'staff') {
        return NextResponse.json(
          { error: 'Managers can only assign the Staff role.' },
          { status: 403 }
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

    // Only owner/admin can change role to manager or staff
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
      return NextResponse.json({ error: safeMsg }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Team member updated successfully.',
      member: updatedData,
    });
  } catch (err) {
    const safeError = sanitizeErrorMessage(err, SAFE_IDENTITY_ERRORS.GENERIC_ERROR);
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
