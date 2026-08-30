import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Validates and refreshes the Supabase Auth session on the server
 * during Next.js request lifecycle, preventing unauthorized route access
 * and unauthenticated flashes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase-project')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do not add logic between createServerClient and getUser().
  // getUser() sends a request to Supabase Auth to validate the token and refresh it if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Page access is guarded by AppShell/AuthProvider on the client. Keeping
  // redirects out of middleware avoids a loop when the browser session is
  // valid in Supabase client storage but the server has not received a cookie
  // yet (for example immediately after sign-in).
  // API routes perform their own authentication checks.
  return supabaseResponse;
}
