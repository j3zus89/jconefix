import type { SupabaseClient } from '@supabase/supabase-js';

/** user_id de miembros activos del taller (misma visión de órdenes para todo el equipo). */
export async function fetchActiveOrgMemberUserIds(
  supabase: SupabaseClient,
  orgId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('is_active', true);
  if (error || !data?.length) return [];
  return Array.from(new Set(data.map((r: { user_id: string }) => r.user_id).filter(Boolean)));
}

/**
 * PostgREST `.or(...)`: tickets del taller con organization_id = orgId, más filas legacy
 * (organization_id nulo) creadas por un miembro activo. Así recepción/técnicos ven lo mismo
 * que el administrador aunque las órdenes antiguas no tuvieran organization_id rellenado.
 */
export function repairTicketsOrgScopeOr(orgId: string, memberUserIds: string[]): string {
  const ids = Array.from(new Set(memberUserIds.filter(Boolean)));
  if (ids.length === 0) {
    return `organization_id.eq.${orgId}`;
  }
  return `organization_id.eq.${orgId},and(organization_id.is.null,user_id.in.(${ids.join(',')}))`;
}

/**
 * Misma regla que los tickets: clientes del taller (`organization_id`) más filas legacy
 * (`organization_id` nulo) si las creó un miembro activo. Sin esto, admin/recepción/técnico
 * no ven los clientes unos de otros aunque compartan organización.
 */
export function customersOrgScopeOr(orgId: string, memberUserIds: string[]): string {
  return repairTicketsOrgScopeOr(orgId, memberUserIds);
}
