import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase client for browser-side usage.
 * Returns null if Supabase environment variables are not configured.
 */
export function createClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase-project')) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export { createClient as createBrowserClient };

/**
 * Helper to check if the browser client is initialized and ready.
 */
export function isSupabaseClientReady(): boolean {
  return createClient() !== null;
}
