import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSafeErrorResponse, API_ERROR_CODES, sanitizeErrorMessage } from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await req.json().catch(() => ({}));
    const { assigned_to } = body;

    if (!assigned_to) {
      return createSafeErrorResponse('Missing required field: assigned_to', API_ERROR_CODES.VALIDATION_ERROR, 400);
    }

    const supabase = await createClient();
    if (!supabase) {
      return createSafeErrorResponse('Database client unconfigured', API_ERROR_CODES.DATABASE_UNAVAILABLE, 500);
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return createSafeErrorResponse('Unauthorized. Please sign in.', API_ERROR_CODES.UNAUTHORIZED, 401);
    }

    // Call the atomic RPC function
    const { error: rpcError } = await supabase.rpc('assign_lead', {
      p_lead_id: leadId,
      p_assigned_to: assigned_to,
    });

    if (rpcError) {
      // The RPC raises exceptions for unauthorized or invalid assignments
      const safeMsg = sanitizeErrorMessage(rpcError, 'Failed to reassign lead.');
      return createSafeErrorResponse(safeMsg, API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE, 403);
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return createSafeErrorResponse(message, API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}
