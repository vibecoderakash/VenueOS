/**
 * Safe Supabase Environment Configuration Helper
 * Returns sanitized connection status and configuration indicators
 * without ever exposing keys or private secrets.
 */

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  urlPreview: string | null;
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const hasUrl = Boolean(url && url.startsWith('http') && !url.includes('your-supabase-project'));
  const hasAnonKey = Boolean(anonKey && anonKey.length > 20 && !anonKey.includes('your-supabase-anon-key'));

  let urlPreview: string | null = null;
  if (hasUrl) {
    try {
      const parsed = new URL(url);
      urlPreview = `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      urlPreview = null;
    }
  }

  return {
    isConfigured: hasUrl && hasAnonKey,
    hasUrl,
    hasAnonKey,
    urlPreview,
  };
}
