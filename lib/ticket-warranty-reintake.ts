/**
 * Texto estándar para el inicio de la descripción en un reingreso por garantía.
 */
export function warrantyReintakeDescriptionPreamble(opts: {
  parentTicketNumber: string;
  parentCreatedAt: string;
  /** Si true, usa «orden»; si false, «ticket». */
  isArgentina?: boolean;
}): string {
  const d = new Date(opts.parentCreatedAt);
  const ds = Number.isNaN(d.getTime())
    ? 'fecha desconocida'
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const ref = opts.isArgentina ? 'orden' : 'ticket';
  return `Reingreso / garantía vinculado al ${ref} #${opts.parentTicketNumber} (ingreso anterior ${ds}).\n\n`;
}

/** Normaliza búsqueda por número de ticket/orden (acepta #T-123, T123, etc.). */
export function normalizeBoletoSearchInput(raw: string): string {
  return raw.replace(/^#/, '').replace(/^T-?/i, '').trim();
}
