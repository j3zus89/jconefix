/** Normaliza cabecera Excel para comparar con sinónimos. */
export function normalizeHeaderKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Solo dígitos para emparejar teléfonos. */
export function phoneDigits(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '');
}

export function normalizeEmail(raw: string | undefined | null): string {
  return (raw ?? '').trim().toLowerCase();
}

/** Nombre de persona sin tildes, minúsculas, espacios colapsados. */
function normalizePersonName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ¿Tiene sentido fusionar dos filas del import por el mismo teléfono?
 * Evita que un número repetido (p. ej. teléfono del taller en todas las filas) unifique a todos los clientes.
 */
export function namesCompatibleForPhoneDedup(importName: string, existingName: string): boolean {
  const a = normalizePersonName(importName);
  const b = normalizePersonName(existingName);
  if (!a || !b) return true;
  if (a === b) return true;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  // Exigir al menos 5 caracteres en el prefijo corto: si no, "juan" y "juan andres" se unían
  // con el mismo teléfono del taller y desaparecía un cliente del Excel.
  if (short.length >= 5 && long.startsWith(`${short} `)) return true;
  return false;
}
