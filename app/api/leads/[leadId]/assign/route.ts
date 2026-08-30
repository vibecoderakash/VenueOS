import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await req.json();
    const { assigned_to } = body;

    if (!assigned_to) {
      return NextResponse.json(
        { error: 'Missing required field: assigned_to' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the atomic RPC function
    const { error: rpcError } = await supabase.rpc('assign_lead', {
      p_lead_id: leadId,
      p_assigned_to: assigned_to,
    });

    if (rpcError) {
      // The RPC raises exceptions for unauthorized or invalid assignments
      return NextResponse.json(
        { error: rpcError.message || 'Failed to reassign lead' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
