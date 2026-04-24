import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Sesión en cookies (legible por middleware y API con @supabase/ssr).
 * No usar storageKey en localStorage: el edge no lo ve y el corte de trial/licencia fallaba.
 */
export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined' && browserClient) {
    return browserClient;
  }
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  if (typeof window !== 'undefined') {
    browserClient = client;
  }
  return client;
}
