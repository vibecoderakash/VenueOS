import { NextResponse } from 'next/server';
import { getVerifiedCaller } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request) {
  try {
    const { caller, error: authError, statusCode } = await getVerifiedCaller(req);
    if (authError || !caller) {
      return NextResponse.json({ error: authError || 'Unauthorized. Please sign in.' }, { status: statusCode || 401 });
    }

    if (!caller.isActive || caller.role !== 'owner') {
      return NextResponse.json({ error: 'Only the Venue Owner can delete the organization.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const organizationId = caller.profile.organization_id;
    const confirmation = typeof body?.confirmation === 'string' ? body.confirmation.trim() : '';
    const organizationName = typeof body?.organizationName === 'string' ? body.organizationName.trim() : '';

    if (!organizationId || !organizationName || confirmation !== organizationName) {
      return NextResponse.json({ error: 'The organization name confirmation did not match.' }, { status: 400 });
    }

    // The SQL function performs the owner check and deletes the organization,
    // all cascaded tenant data, and the current Supabase Auth user together.
    const client = await createServerSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 500 });
    }
    const { error } = await client.rpc('delete_current_organization', { p_organization_id: organizationId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Organization and all related data were permanently deleted.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete organization.' }, { status: 500 });
  }
}
