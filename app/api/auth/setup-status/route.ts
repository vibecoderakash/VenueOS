import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { ownerExists: false, error: 'Database client unconfigured' },
        { status: 200 }
      );
    }

    // 1. Preferred Secure RPC: Returns boolean without exposing profile rows
    const { data: rpcData, error: rpcError } = await supabase.rpc('check_has_owner');
    
    if (!rpcError && typeof rpcData === 'boolean') {
      return NextResponse.json({ ownerExists: rpcData }, { status: 200 });
    }

    // 2. Safe Fallback: Direct query checking for existing owner
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .not('organization_id', 'is', null)
      .limit(1);

    if (error) {
      console.warn('Setup status check note:', error.message);
      return NextResponse.json({ ownerExists: false }, { status: 200 });
    }

    const exists = Array.isArray(data) && data.length > 0;
    return NextResponse.json({ ownerExists: exists }, { status: 200 });
  } catch (err) {
    console.error('Setup status check error:', err);
    return NextResponse.json({ ownerExists: false }, { status: 200 });
  }
}
