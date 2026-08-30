import { createClient as createBrowserSupabaseClient } from './client';
import { getSupabaseConfigStatus } from './config';

export interface ConnectionTestResult {
  success: boolean;
  status: 'connected' | 'unconfigured' | 'error';
  message: string;
  timestamp: string;
}

/**
 * Safely tests Supabase connectivity in development without exposing secrets.
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const config = getSupabaseConfigStatus();

  if (!config.isConfigured) {
    return {
      success: false,
      status: 'unconfigured',
      message:
        'Supabase environment variables are not configured. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const client = createBrowserSupabaseClient();
    if (!client) {
      return {
        success: false,
        status: 'unconfigured',
        message: 'Unable to initialize Supabase client with current credentials.',
        timestamp: new Date().toISOString(),
      };
    }

    // Minimal safe ping: check auth session status without mutating any state
    const { error } = await client.auth.getSession();

    if (error) {
      return {
        success: false,
        status: 'error',
        message: `Supabase responded with an issue: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      status: 'connected',
      message: 'Supabase client connected and initialized successfully.',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown connection error';
    return {
      success: false,
      status: 'error',
      message: `Failed to reach Supabase project: ${errorMsg}`,
      timestamp: new Date().toISOString(),
    };
  }
}
