/**
 * Emails con acceso SUPER_ADMIN (cliente y servidor).
 *
 * Opcional: SUPER_ADMIN_EMAILS o NEXT_PUBLIC_SUPER_ADMIN_EMAILS (separados por coma)
 * suman cuentas extra; no sustituyen al propietario.
 */

/** Propietario del sistema — no eliminar ni cambiar en código sin decisión explícita. */
export const OWNER_SUPER_ADMIN_EMAIL = 'sr.gonzalezcala89@gmail.com';

/** Cuentas adicionales con el mismo rol por defecto (histórico / respaldo). */
const ADDITIONAL_DEFAULT_EMAILS = ['sr.gonzalezcala@gmail.com'];

function envExtraEmails(): string[] {
  if (typeof process === 'undefined') return [];
  const raw =
    process.env.SUPER_ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS ||
    '';
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getSuperAdminEmails(): Set<string> {
  return new Set([
    OWNER_SUPER_ADMIN_EMAIL.toLowerCase(),
    ...ADDITIONAL_DEFAULT_EMAILS.map((e) => e.toLowerCase()),
    ...envExtraEmails(),
  ]);
}

export function isEmailSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getSuperAdminEmails().has(email.trim().toLowerCase());
}

/** Misma regla en cliente y en APIs (email allowlist + flags en metadata). */
export function isUserRecordSuperAdmin(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}): boolean {
  if (isEmailSuperAdmin(user.email)) return true;
  if (user.user_metadata?.is_super_admin === true) return true;
  if (user.app_metadata?.is_super_admin === true) return true;
  return false;
}
