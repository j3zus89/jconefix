/** Utilidades compartidas para el panel «Presupuestos» (lista de tickets en estado presupuesto). */

export function daysSinceIsoDate(iso: string | null | undefined): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
}

/** Fondo de fila según antigüedad (días desde creación del ticket). */
export function budgetStaleRowClass(openDays: number): string {
  if (openDays >= 14) return 'bg-red-50/80 hover:bg-red-50';
  if (openDays >= 7) return 'bg-amber-50/70 hover:bg-amber-50/90';
  if (openDays >= 3) return 'bg-yellow-50/60 hover:bg-yellow-50/80';
  return 'hover:bg-gray-50/80';
}

export type BudgetValidUntilUi = {
  label: string;
  badgeClass: string;
};

/** Texto y estilo para la columna «Válido hasta» (columna date YYYY-MM-DD o null). */
export function budgetValidUntilUi(validUntil: string | null | undefined): BudgetValidUntilUi {
  if (validUntil == null || String(validUntil).trim() === '') {
    return { label: 'Sin fecha', badgeClass: 'text-gray-400 font-normal' };
  }
  const raw = String(validUntil).slice(0, 10);
  const [y, m, d] = raw.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) {
    return { label: 'Sin fecha', badgeClass: 'text-gray-400 font-normal' };
  }
  const end = new Date(y, m - 1, d);
  if (Number.isNaN(end.getTime())) {
    return { label: 'Sin fecha', badgeClass: 'text-gray-400 font-normal' };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const label = end.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (end < today) {
    return { label: `Venció ${label}`, badgeClass: 'text-red-700 font-medium' };
  }
  if (end.getTime() === today.getTime()) {
    return { label: `Hoy · ${label}`, badgeClass: 'text-amber-800 font-medium' };
  }
  return { label, badgeClass: 'text-gray-800 font-medium' };
}

export function buildBudgetReminderMessage(args: {
  customerName: string | null | undefined;
  ticketNumber: string;
  deviceLine: string;
  validUntilLabel?: string | null;
}): string {
  const name = args.customerName?.trim() || 'Cliente';
  const first = name.split(/\s+/)[0] || 'Cliente';
  const dev = args.deviceLine.trim() || 'tu equipo';
  let body = `Hola ${first}, te escribimos del taller respecto al presupuesto del ticket ${args.ticketNumber} (${dev}).`;
  const ref = args.validUntilLabel?.trim();
  if (ref && ref !== 'Sin fecha') {
    body += ` Referencia de validez: ${ref}.`;
  }
  body += ' ¿Podemos ayudarte con alguna duda o confirmación?';
  return body;
}
