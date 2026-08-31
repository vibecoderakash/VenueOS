import { NextRequest, NextResponse } from 'next/server';
import { createLeadSchema } from '@/lib/validations/lead';
import { createClient } from '@/lib/supabase/server';
import { createSafeErrorResponse, API_ERROR_CODES, sanitizeErrorMessage } from '@/lib/validations/identity';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 1. Strict Backend Validation with Zod (Security & Data Integrity Boundary)
    const parseResult = createLeadSchema.safeParse(body);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.flatten();
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: parseResult.error.errors[0]?.message || 'Invalid lead data provided.',
          fieldErrors: formattedErrors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;

    // Normalizing values strictly according to state
    const normalizedData = {
      ...validatedData,
      event_date_status: validatedData.event_date_status,
      event_date: validatedData.event_date_status === 'fixed' ? validatedData.event_date : null,
      guest_count_status: validatedData.guest_count_status,
      guest_count: validatedData.guest_count_status === 'fixed' ? validatedData.guest_count : null,
    };

    // 2. If Supabase is configured and user is authenticated, attempt database insertion
    const supabase = await createClient();
    if (supabase) {
      try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const { data: { user } } = token
          ? await supabase.auth.getUser(token)
          : await supabase.auth.getUser();

        if (!user) {
          return createSafeErrorResponse('Supabase session was not found by the server.', API_ERROR_CODES.UNAUTHORIZED, 401);
        }

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, is_active, active')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError || !profile?.organization_id) {
            return createSafeErrorResponse(
              'Your profile is not connected to an organization in Supabase.',
              API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE,
              403
            );
          }

          const isActive = profile.is_active !== undefined
            ? Boolean(profile.is_active)
            : profile.active !== undefined
              ? Boolean(profile.active)
              : true;

          if (!isActive) {
            return createSafeErrorResponse(
              'Your account is inactive.',
              API_ERROR_CODES.FORBIDDEN_DEACTIVATED,
              403
            );
          }

          const { data: lead, error } = await supabase
            .from('leads')
            .insert({
              organization_id: profile.organization_id,
              customer_name: normalizedData.customer_name,
              phone: normalizedData.phone,
              email: normalizedData.email || null,
              source: normalizedData.source,
              event_type: normalizedData.event_type,
              event_date_status: normalizedData.event_date_status,
              event_date: normalizedData.event_date,
              guest_count_status: normalizedData.guest_count_status,
              guest_count: normalizedData.guest_count,
              budget: normalizedData.budget || null,
              requirement: normalizedData.requirement || null,
              // V1 SECURITY: Force owner_id to the authenticated user creating the lead
              // Prevents impersonation from client-supplied payload
              owner_id: user.id,
              status: normalizedData.status || 'New',
              priority: normalizedData.priority || 'Medium',
              next_follow_up_at: normalizedData.next_follow_up_at || null,
              follow_up_note: normalizedData.follow_up_note || null,
            })
            .select()
            .single();

          if (!error && lead) {
            return NextResponse.json({ lead, success: true }, { status: 201 });
          }
          
          const safeError = sanitizeErrorMessage(error, 'Supabase rejected the lead insert.');
          return createSafeErrorResponse(safeError, API_ERROR_CODES.VALIDATION_ERROR, 400);
        }
      } catch (error) {
        console.error('Supabase lead creation failed:', error);
      }
    }

    return createSafeErrorResponse(
      'Unable to save lead to Supabase. Please verify your organization and profile setup.',
      API_ERROR_CODES.DATABASE_UNAVAILABLE,
      503
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return createSafeErrorResponse(message, API_ERROR_CODES.INTERNAL_ERROR, 500);
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/leads' });
}
