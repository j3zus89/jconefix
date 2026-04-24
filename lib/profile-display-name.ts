/**
 * Nombre visible coherente con `UserMenu` / perfil (información personal).
 */

export type ProfileNameFields = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
};

export function profileDisplayName(
  profile: ProfileNameFields | null | undefined,
  opts?: {
    email?: string | null;
    metadataFullName?: string | null;
  }
): string {
  const fn = (profile?.first_name ?? '').trim();
  const ln = (profile?.last_name ?? '').trim();
  const combined = [fn, ln].filter(Boolean).join(' ').trim();
  const fromFull = (profile?.full_name ?? '').trim();
  const meta = (opts?.metadataFullName ?? '').trim();
  const emailLocal = opts?.email?.split('@')[0]?.trim() ?? '';

  return combined || fromFull || meta || emailLocal || 'Usuario';
}

/**
 * Handle sin espacios para @menciones (regex en `ChatMessageBody`).
 * Prioriza el primer nombre; si no hay, la parte local del correo.
 */
export function profileMentionHandle(
  profile: ProfileNameFields | null | undefined,
  email?: string | null
): string {
  const fn = (profile?.first_name ?? '').trim().toLowerCase();
  if (fn) {
    return fn.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  const local = email?.split('@')[0]?.trim().toLowerCase() ?? '';
  return local || 'usuario';
}
