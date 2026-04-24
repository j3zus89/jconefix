import type { SupabaseClient } from '@supabase/supabase-js';

export function pickProfileDisplayName(p: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null | undefined): string {
  if (!p) return '';
  const fn = p.full_name?.trim();
  if (fn) return fn;
  const parts = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return '';
}

/**
 * `user_id` → nombre visible (perfil) para miembros activos de la organización.
 */
export async function loadOrgMemberDisplayNameByUserId(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data: members, error } = await (supabase as any)
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  if (error) {
    console.warn('[loadOrgMemberDisplayNameByUserId] members:', error.message);
    return map;
  }
  const ids = Array.from(
    new Set((members || []).map((m: { user_id: string }) => m.user_id).filter(Boolean))
  );
  if (ids.length === 0) return map;
  const { data: profiles, error: pErr } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, first_name, last_name')
    .in('id', ids);
  if (pErr) {
    console.warn('[loadOrgMemberDisplayNameByUserId] profiles:', pErr.message);
    return map;
  }
  for (const row of profiles || []) {
    const id = (row as { id: string }).id;
    const label = pickProfileDisplayName(row as any);
    if (id && label) map.set(id, label);
  }
  return map;
}

/** `user_id` → URL de foto de perfil (solo filas con `avatar_url` no vacío). */
export async function loadProfileAvatarUrlByUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)));
  if (ids.length === 0) return map;
  const { data: profiles, error } = await (supabase as any)
    .from('profiles')
    .select('id, avatar_url')
    .in('id', ids);
  if (error) {
    console.warn('[loadProfileAvatarUrlByUserIds]', error.message);
    return map;
  }
  for (const row of profiles || []) {
    const id = (row as { id: string }).id;
    const u = String((row as { avatar_url?: string | null }).avatar_url || '').trim();
    if (id && u) map.set(id, u);
  }
  return map;
}

/** Línea de autor tipo «Recepcionista — Ana» o «Administrador — Raúl». */
export function formatActivityAuthorLabel(args: {
  userId: string;
  emailFallback: string;
  roleByUserId: Map<string, string>;
  displayNameByUserId: Map<string, string>;
}): string {
  const role = args.roleByUserId.get(args.userId)?.trim();
  const name =
    args.displayNameByUserId.get(args.userId)?.trim() ||
    args.emailFallback.trim() ||
    'Usuario';
  if (role) return `${role} — ${name}`;
  return name;
}

/** Prefijo «persona» de un `author_name` guardado (antes de « — » si existía). */
export function legacyStoredAuthorPersonPrefix(authorName: string): string {
  const t = (authorName || '').trim();
  if (!t) return '';
  const idx = t.indexOf(' — ');
  return idx >= 0 ? t.slice(0, idx).trim() : t;
}

export function activityAuthorAvatarInitial(headline: string): string {
  const t = (headline || '').trim();
  if (!t) return '?';
  const idx = t.lastIndexOf(' — ');
  const person = idx >= 0 ? t.slice(idx + 3).trim() : t;
  return person[0]?.toUpperCase() || '?';
}

/** Sustituye `**prefijoLegado**` en el cuerpo por `**cabeceraNueva**` (comentarios antiguos). */
export function beautifyActivityCommentMarkdownContent(
  content: string,
  storedAuthorName: string,
  displayHeadline: string
): string {
  const c = content || '';
  const h = (displayHeadline || '').trim();
  if (!h) return c;
  const legacyPerson = legacyStoredAuthorPersonPrefix(storedAuthorName);
  if (!legacyPerson || legacyPerson === h) return c;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return c.replace(new RegExp(`\\*\\*${esc(legacyPerson)}\\*\\*`, 'g'), `**${h}**`);
}
