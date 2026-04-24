/** Rangos ISO para informe PDF (semana / mes / 30 días). */

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type WorkshopReportKind = 'week' | 'month' | '30d';

export function workshopReportRange(kind: WorkshopReportKind): { from: string; to: string; label: string } {
  const now = new Date();
  const to = endOfDay(now);
  let from: Date;

  if (kind === 'week') {
    from = startOfDay(now);
    from.setDate(from.getDate() - 6);
  } else if (kind === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    from = startOfDay(from);
  } else {
    from = startOfDay(now);
    from.setDate(from.getDate() - 29);
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  const label =
    kind === 'week'
      ? `Última semana (${fmt(from)} — ${fmt(to)})`
      : kind === 'month'
        ? `Este mes (${fmt(from)} — ${fmt(to)})`
        : `Últimos 30 días (${fmt(from)} — ${fmt(to)})`;

  return { from: from.toISOString(), to: to.toISOString(), label };
}

export function toYmd(iso: string): string {
  return iso.slice(0, 10);
}
