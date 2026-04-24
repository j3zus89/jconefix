/**
 * Período de garantía por ticket: fechas editables (inicio / fin) y etiqueta legacy `warranty_info`.
 */

/** Fecha local del dispositivo en YYYY-MM-DD */
export function localDateString(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function normWarrantyDate(s: string | null | undefined): string | null {
  if (!s || !String(s).trim()) return null;
  const t = String(s).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

function daysBetweenIso(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function formatWarrantyDateEs(iso: string): string {
  const n = normWarrantyDate(iso);
  if (!n) return '';
  const [y, m, d] = n.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export type WarrantyBadge = {
  badgeClass: string;
  label: string;
  detail: string | null;
};

/**
 * Resume el estado para badges en listas y ficha (según hoy o `now`).
 */
export function computeWarrantyBadge(input: {
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  warranty_info?: string | null;
  now?: Date;
}): WarrantyBadge {
  const today = localDateString(input.now ?? new Date());
  const start = normWarrantyDate(input.warranty_start_date);
  const end = normWarrantyDate(input.warranty_end_date);

  if (start && end) {
    if (end < start) {
      return {
        badgeClass: 'bg-red-100 text-red-800',
        label: 'Fechas inválidas',
        detail: 'La fecha fin es anterior al inicio',
      };
    }
    if (today < start) {
      const days = daysBetweenIso(today, start);
      return {
        badgeClass: 'bg-slate-100 text-slate-700',
        label: 'Pendiente de inicio',
        detail: `Empieza en ${days} día(s)`,
      };
    }
    if (today > end) {
      const days = daysBetweenIso(end, today);
      return {
        badgeClass: 'bg-gray-200 text-gray-700',
        label: 'Vencida',
        detail: `Hace ${days} día(s)`,
      };
    }
    if (today === end) {
      return {
        badgeClass: 'bg-amber-100 text-amber-800',
        label: 'Último día',
        detail: 'Vence hoy',
      };
    }
    const left = daysBetweenIso(today, end);
    return {
      badgeClass: 'bg-green-100 text-green-800',
      label: 'En garantía',
      detail: `Quedan ${left} día(s)`,
    };
  }

  if (end && !start) {
    if (today > end) {
      const days = daysBetweenIso(end, today);
      return {
        badgeClass: 'bg-gray-200 text-gray-700',
        label: 'Vencida',
        detail: `Hace ${days} día(s) · fin ${formatWarrantyDateEs(end)}`,
      };
    }
    const left = daysBetweenIso(today, end);
    return {
      badgeClass: 'bg-green-100 text-green-800',
      label: 'En garantía',
      detail: `Quedan ${left} día(s) (sin fecha inicio)`,
    };
  }

  if (start && !end) {
    return {
      badgeClass: 'bg-sky-100 text-sky-800',
      label: 'Sin fecha fin',
      detail: `Desde ${formatWarrantyDateEs(start)}`,
    };
  }

  const info = (input.warranty_info || '').trim();
  if (!info || info === 'Sin garantía') {
    return {
      badgeClass: 'bg-gray-100 text-gray-600',
      label: 'Sin período',
      detail: 'Define inicio y fin para ver vigencia',
    };
  }
  return {
    badgeClass: 'bg-orange-100 text-orange-700',
    label: info,
    detail: 'Solo etiqueta (sin fechas)',
  };
}

/** Fin del período de garantía: suma cantidad + unidad a una fecha YYYY-MM-DD (calendario local). */
export function addWarrantyPeriodToStart(
  startIso: string,
  amount: number,
  unit: 'days' | 'weeks' | 'months' | 'years'
): string | null {
  const n = normWarrantyDate(startIso);
  if (!n || !Number.isFinite(amount) || amount < 1) return null;
  const [y, mo, d] = n.split('-').map(Number);
  const dt = new Date(y, mo - 1, d);
  switch (unit) {
    case 'days':
      dt.setDate(dt.getDate() + amount);
      break;
    case 'weeks':
      dt.setDate(dt.getDate() + amount * 7);
      break;
    case 'months':
      dt.setMonth(dt.getMonth() + amount);
      break;
    case 'years':
      dt.setFullYear(dt.getFullYear() + amount);
      break;
    default:
      return null;
  }
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Suma días a una fecha YYYY-MM-DD (calendario local). */
export function addDaysToIsoDate(iso: string, days: number): string | null {
  const n = normWarrantyDate(iso);
  if (!n || !Number.isFinite(days)) return null;
  const [y, m, d] = n.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + Math.floor(days));
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Meses de calendario entre dos fechas locales YYYY-MM-DD (mínimo 1). */
export function warrantyMonthsBetween(startIso: string, endIso: string): number {
  const s = normWarrantyDate(startIso);
  const e = normWarrantyDate(endIso);
  if (!s || !e || e < s) return 1;
  const [y1, m1, d1] = s.split('-').map(Number);
  const [y2, m2, d2] = e.split('-').map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  return Math.max(1, months);
}

/**
 * Texto para factura / comprobante: período y meses. null si no aplica garantía comercial.
 */
export function formatTicketWarrantySummaryForPrint(input: {
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  warranty_info?: string | null;
}): string | null {
  const info = (input.warranty_info || '').trim();
  if (info === 'Sin garantía') return null;
  const s = normWarrantyDate(input.warranty_start_date);
  const e = normWarrantyDate(input.warranty_end_date);
  if (s && e && e >= s) {
    const months = warrantyMonthsBetween(s, e);
    const mesLabel = months === 1 ? '1 mes' : `${months} meses`;
    return `Del ${formatWarrantyDateEs(s)} al ${formatWarrantyDateEs(e)} (${mesLabel}).`;
  }
  if (info && info !== 'Sin garantía') {
    return `${info}.`;
  }
  return null;
}
