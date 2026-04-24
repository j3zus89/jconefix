/**
 * IMEI en formularios: solo dígitos, máximo 15; vacío permitido.
 */

export function formatImeiInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 15);
}

export function imeiFieldError(displayed: string): string | null {
  const d = displayed.replace(/\D/g, '');
  if (!d) return null;
  if (d.length !== 15) {
    return 'El IMEI debe tener exactamente 15 dígitos (o dejalo vacío si no lo tenés).';
  }
  return null;
}

export function normalizeImeiForDb(displayed: string): string | null {
  const d = formatImeiInput(displayed);
  return d.length ? d : null;
}
