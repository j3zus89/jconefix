import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClientFromRequest } from '@/lib/supabase/server';

/**
 * Usuario autenticado en rutas API: primero cookies (SSR), si no hay sesión, JWT en Authorization Bearer.
 * Útil en checkout público donde a veces las cookies no llegan igual que en el cliente.
 */
export async function getAuthUserFromApiRequest(req: Request): Promise<User | null> {
  const supabase = createSupabaseServerClientFromRequest(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!error && user) return user;

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error: bearerErr } = await authClient.auth.getUser(token);
  if (bearerErr || !data.user) return null;
  return data.user;
}
