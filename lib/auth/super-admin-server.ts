import { createClient as createSupabaseClient, type User } from '@supabase/supabase-js';
import { isUserRecordSuperAdmin } from '@/lib/auth/super-admin-allowlist';
import {
  createSupabaseServerClient,
  createSupabaseServerClientFromRequest,
} from '@/lib/supabase/server';

function superAdminDecision(user: User) {
  const isSuper = isUserRecordSuperAdmin(user);
  return isSuper
    ? { ok: true as const, status: 200 as const, user }
    : { ok: false as const, status: 403 as const, user: null };
}

export async function requireSuperAdminServer() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { ok: false as const, status: 401 as const, user: null };
  }
  return superAdminDecision(data.user);
}

export async function requireSuperAdminFromRequest(req: Request) {
  // 1) Bearer: mismo token que acaba de validar el cliente con getSession (fuente de verdad en el panel admin)
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
  if (token) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      return superAdminDecision(data.user);
    }
  }

  // 2) Cookies de la petición (si no hubo Bearer o el JWT ya caducó)
  const fromRequest = createSupabaseServerClientFromRequest(req);
  const rCookie = await fromRequest.auth.getUser();
  if (!rCookie.error && rCookie.data?.user) {
    return superAdminDecision(rCookie.data.user);
  }

  // 3) cookies() de Next
  return requireSuperAdminServer();
}

