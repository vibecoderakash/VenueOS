import { NextResponse } from 'next/server';
import { getSupabaseConfigStatus } from '@/lib/supabase/config';
import { testSupabaseConnection } from '@/lib/supabase/test-connection';

export async function GET() {
  const config = getSupabaseConfigStatus();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        status: 'unconfigured',
        connected: false,
        message:
          'Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
        config: {
          hasUrl: config.hasUrl,
          hasAnonKey: config.hasAnonKey,
          urlPreview: config.urlPreview,
        },
      },
      { status: 200 }
    );
  }

  const result = await testSupabaseConnection();

  return NextResponse.json(
    {
      status: result.status,
      connected: result.success,
      message: result.message,
      timestamp: result.timestamp,
    },
    { status: result.success ? 200 : 503 }
  );
}
