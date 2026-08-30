import { NextResponse } from 'next/server';
import { getAdminClient, getVerifiedCaller } from '@/lib/supabase/admin';
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

    const admin = getAdminClient();
    let error;

    if (admin) {
      // All organization-owned tables use ON DELETE CASCADE from organizations.
      // This removes leads, discussions, activity, assignment history, and profiles
      // atomically from the tenant boundary. The auth user itself is intentionally
      // preserved so the owner can be invited or linked to a new organization later.
      ({ error } = await admin.from('organizations').delete().eq('id', organizationId));
    } else {
      // The SQL migration provides a SECURITY DEFINER function for deployments
      // that intentionally do not expose a service-role key to the app server.
      const client = await createServerSupabaseClient();
      if (!client) {
        return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 500 });
      }
      ({ error } = await client.rpc('delete_current_organization', { p_organization_id: organizationId }));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Organization and all related data were permanently deleted.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete organization.' }, { status: 500 });
  }
}
