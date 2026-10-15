import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'cctv-snapshots';

let _client: SupabaseClient | null = null;

/**
 * Lazily creates the Supabase client on first use.
 * This way the server boots even if .env is not yet filled in —
 * the error only surfaces when an actual upload request is made.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !supabaseServiceKey ||
    supabaseUrl.includes('your-project-ref') ||
    supabaseServiceKey.includes('your-service-role-key')
  ) {
    throw new Error(
      '[Supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set with real values in the .env file.'
    );
  }

  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _client;
}
