import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) return NextResponse.json({ configured: false }, { status: 400 });

    const admin = getAdminClient();
    if (!admin) return NextResponse.json({ configured: false });

    // The Auth admin API does not provide a direct email lookup. Keep this
    // bounded because this endpoint is only a development-account diagnostic.
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return NextResponse.json({ configured: false });
      if (data.users.some((user) => user.email?.toLowerCase() === email)) {
        return NextResponse.json({ configured: true, exists: true });
      }
      if (data.users.length < 1000) break;
    }

    return NextResponse.json({ configured: true, exists: false });
  } catch {
    return NextResponse.json({ configured: false });
  }
}
