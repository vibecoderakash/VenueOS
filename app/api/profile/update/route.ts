import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient, getVerifiedCaller } from '@/lib/supabase/admin';
import {
  API_ERROR_CODES,
  SAFE_IDENTITY_ERRORS,
  createSafeErrorResponse,
  sanitizeErrorMessage,
} from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const { caller, error: authError, statusCode } = await getVerifiedCaller(req);
    if (authError || !caller) {
      return createSafeErrorResponse(authError || SAFE_IDENTITY_ERRORS.UNAUTHORIZED, API_ERROR_CODES.UNAUTHORIZED, statusCode || 401);
    }
    if (!caller.isActive) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.FORBIDDEN_DEACTIVATED, API_ERROR_CODES.FORBIDDEN_DEACTIVATED, 403);
    }

    const body = await req.json() as Record<string, unknown>;
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : undefined;
    const phone = body.phone === undefined ? undefined : (body.phone ? String(body.phone).trim() : null);
    const password = typeof body.password === 'string' ? body.password : undefined;

    if (fullName !== undefined && fullName.length < 2) {
      return createSafeErrorResponse('Name must contain at least 2 characters.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }
    if (password !== undefined && password.length < 8) {
      return createSafeErrorResponse('Password must contain at least 8 characters.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }
    if (fullName === undefined && phone === undefined && password === undefined) {
      return createSafeErrorResponse('Provide a name, phone number, or password to update.', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const adminClient = getAdminClient();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.DATABASE_UNAVAILABLE, API_ERROR_CODES.DATABASE_UNAVAILABLE, 500);
    }

    if (password !== undefined) {
      if (adminClient) {
        const { error } = await adminClient.auth.admin.updateUserById(caller.user.id, { password });
        if (error) { console.error('Profile password update failed:', error); return createSafeErrorResponse(sanitizeErrorMessage(error, SAFE_IDENTITY_ERRORS.GENERIC_ERROR), API_ERROR_CODES.INTERNAL_ERROR, 500); }
      } else {
        const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
        if (!token) return createSafeErrorResponse(SAFE_IDENTITY_ERRORS.UNAUTHORIZED, API_ERROR_CODES.UNAUTHORIZED, 401);
        const authResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });
        if (!authResponse.ok) {
          const error = await authResponse.text();
          console.error('Profile password update failed:', error);
          return createSafeErrorResponse(sanitizeErrorMessage(error, SAFE_IDENTITY_ERRORS.GENERIC_ERROR), API_ERROR_CODES.INTERNAL_ERROR, 500);
        }
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fullName !== undefined) {
      updates.full_name = fullName;
      updates.name = fullName;
    }
    if (phone !== undefined) updates.phone = phone;

    let updatedProfile = caller.profile;
    if (Object.keys(updates).length > 1) {
      const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
      const tokenDb = bearerToken
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
          )
        : null;
      const db = adminClient || tokenDb || supabase;
      const { data, error } = await db.from('profiles').update(updates).eq('id', caller.user.id).select().single();
      if (error) { console.error('Profile database update failed:', error); return createSafeErrorResponse(sanitizeErrorMessage(error, SAFE_IDENTITY_ERRORS.GENERIC_ERROR), API_ERROR_CODES.INTERNAL_ERROR, 500); }
      updatedProfile = data;
    }

    return NextResponse.json({ success: true, message: 'Your profile was updated successfully.', profile: updatedProfile });
  } catch (error) {
    console.error('Profile update request failed:', error);
    return createSafeErrorResponse(sanitizeErrorMessage(error, SAFE_IDENTITY_ERRORS.GENERIC_ERROR), API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
