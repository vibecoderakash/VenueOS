import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSafeErrorResponse, API_ERROR_CODES, sanitizeErrorMessage } from '@/lib/validations/identity';
import { getVerifiedCaller } from '@/lib/supabase/admin';

export async function DELETE(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const { caller, error: authError, statusCode } = await getVerifiedCaller(req);
  if (authError || !caller) return createSafeErrorResponse(authError || 'Authentication required.', API_ERROR_CODES.UNAUTHORIZED, statusCode || 401);
  if (!['owner', 'manager', 'admin'].includes(caller.role)) {
    return createSafeErrorResponse('Only the Venue Owner or Manager can delete leads.', API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE, 403);
  }
  if (!caller.isActive) return createSafeErrorResponse('Your account is inactive.', API_ERROR_CODES.FORBIDDEN_DEACTIVATED, 403);

  const supabase = await createClient();
  if (!supabase) return createSafeErrorResponse('Supabase is not configured.', API_ERROR_CODES.DATABASE_UNAVAILABLE, 503);
  const { error } = await supabase.from('leads').delete().eq('id', leadId).eq('organization_id', caller.profile.organization_id);
  if (error) return createSafeErrorResponse(sanitizeErrorMessage(error, 'Unable to delete lead.'), API_ERROR_CODES.DATABASE_UNAVAILABLE, 400);
  return NextResponse.json({ success: true });
}
