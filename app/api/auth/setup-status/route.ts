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

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .limit(1);

    if (error) {
      console.warn('Setup status query note:', error.message);
      return NextResponse.json({ ownerExists: false }, { status: 200 });
    }

    const exists = Array.isArray(data) && data.length > 0;
    return NextResponse.json({ ownerExists: exists }, { status: 200 });
  } catch (err) {
    console.error('Setup status check error:', err);
    return NextResponse.json({ ownerExists: false }, { status: 200 });
  }
}
