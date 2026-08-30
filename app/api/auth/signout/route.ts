import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in route handler context
            }
          },
        },
      });

      // Sign out from Supabase on the server
      await supabase.auth.signOut().catch(() => {});
    }

    // Explicitly delete any sb- cookies
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name.includes('supabase')) {
        cookieStore.delete(c.name);
      }
    }

    return NextResponse.json({ success: true, message: 'Signed out successfully.' });
  } catch (err) {
    console.error('Sign out route error:', err);
    return NextResponse.json({ success: true });
  }
}
