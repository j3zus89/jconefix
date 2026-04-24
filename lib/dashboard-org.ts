import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Organización activa del usuario (una sola; orden estable por `organization_id`).
 * Todo el dashboard debe filtrar tickets/clientes/inventario con este id — no usar solo `user_id`.
 */
export async function getActiveOrganizationId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Preferir RPC: SECURITY DEFINER + misma lógica que user_belongs_to_org (miembro activo o dueño).
  const { data: rpcOrgId, error: rpcError } = await supabase.rpc(
    'get_user_organization_id'
  );
  if (!rpcError && rpcOrgId != null && String(rpcOrgId).length > 0) {
    return String(rpcOrgId);
  }

  const { data: rows, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('organization_id', { ascending: true })
    .limit(1);
  if (!error && rows?.length) {
    return (rows[0] as { organization_id: string }).organization_id ?? null;
  }
  // Usuarios creados antes de organization_members o datos desincronizados
  const { data: prof } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  const oid = (prof as { organization_id?: string } | null)?.organization_id;
  if (oid) return oid;

  const { data: owned } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (owned as { id?: string } | null)?.id ?? null;
}
