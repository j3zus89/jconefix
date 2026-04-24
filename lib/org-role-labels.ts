import type { SupabaseClient } from '@supabase/supabase-js';

/** Etiquetas en español para `organization_members.role` y claves de `technicians.role`. */
export const ORG_ROLE_LABEL_ES: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Encargado',
  technician: 'Técnico',
  receptionist: 'Recepcionista',
  tech_1: 'Técnico Nivel 1',
  tech_2: 'Técnico Nivel 2',
  tech_3: 'Técnico Nivel 3',
};

export function formatOrgMemberRoleLabel(role: string | null | undefined): string {
  if (role == null || String(role).trim() === '') return '';
  const k = String(role).trim().toLowerCase();
  return ORG_ROLE_LABEL_ES[k] ?? String(role).trim();
}

/**
 * Mapa `user_id` → etiqueta de rol en la organización (p. ej. para chat y comentarios).
 */
export async function loadOrgUserRoleLabelMap(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await (supabase as any)
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (error) {
    console.warn('[loadOrgUserRoleLabelMap]', error.message);
    return map;
  }

  const { data: customRows, error: customErr } = await (supabase as any)
    .from('organization_custom_roles')
    .select('role_key, name')
    .eq('organization_id', organizationId);

  const customLabelByKey = new Map<string, string>();
  if (customErr) {
    console.warn('[loadOrgUserRoleLabelMap] organization_custom_roles:', customErr.message);
  }
  for (const row of customRows || []) {
    const k = String((row as { role_key?: string }).role_key || '').trim();
    const n = String((row as { name?: string }).name || '').trim();
    if (k && n) customLabelByKey.set(k, n);
  }

  const { data: overrideRows, error: overrideErr } = await (supabase as any)
    .from('organization_role_label_overrides')
    .select('role_key, name')
    .eq('organization_id', organizationId);

  const predefinedOverrideLabelByKey = new Map<string, string>();
  if (overrideErr) {
    console.warn('[loadOrgUserRoleLabelMap] organization_role_label_overrides:', overrideErr.message);
  }
  for (const row of overrideRows || []) {
    const k = String((row as { role_key?: string }).role_key || '').trim();
    const n = String((row as { name?: string }).name || '').trim();
    if (k && n) predefinedOverrideLabelByKey.set(k, n);
  }

  for (const row of data || []) {
    const uid = row.user_id as string;
    const rawRole = String(row.role || '').trim();
    const label =
      (rawRole && customLabelByKey.get(rawRole)) ||
      (rawRole && predefinedOverrideLabelByKey.get(rawRole)) ||
      formatOrgMemberRoleLabel(rawRole);
    if (uid && label) map.set(uid, label);
  }

  return map;
}
