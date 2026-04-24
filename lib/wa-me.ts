/**
 * Normaliza un número para enlaces wa.me (solo dígitos, con prefijo país).
 * Acepta entradas con espacios, guiones o +; no requiere APIs ni claves.
 */
export function phoneDigitsForWaMe(raw: string | null | undefined): string {
  if (raw == null || raw === undefined) return '';
  return String(raw).replace(/\D/g, '');
}

export function waMeUrlForPhone(
  raw: string | null | undefined,
  prefilledMessage?: string
): string | null {
  const d = phoneDigitsForWaMe(raw);
  if (d.length < 8) return null;
  const base = `https://wa.me/${d}`;
  const msg = prefilledMessage?.trim();
  if (msg) return `${base}?text=${encodeURIComponent(msg)}`;
  return base;
}
