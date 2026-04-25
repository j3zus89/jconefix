/**
 * Badge de estado para listados (dashboard, panel sencillo).
 * Colores alineados con la lista de tickets (`statusStyle` en tickets/page.tsx).
 */

export function normalizeTicketStatusKey(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/** Variantes que llegan desde BD o UI y deben resolverse al mismo estilo. */
const KEY_ALIASES: Record<string, string> = {
  cancelado: 'cancelled',
  completado: 'completed',
  listo: 'reparado',
};

const BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  entrada: { label: 'En taller', cls: 'bg-teal-100 text-teal-800 border-teal-200' },
  presupuesto: { label: 'Presupuesto', cls: 'bg-amber-100 text-amber-900 border-amber-200' },
  diagnostico: { label: 'Diagnóstico', cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  diagnostic: { label: 'Diagnóstico', cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  pendiente_pedido: { label: 'Esperando pedido', cls: 'bg-orange-100 text-orange-900 border-orange-200' },
  pendiente_pieza: { label: 'Esperando pieza', cls: 'bg-orange-100 text-orange-900 border-orange-200' },
  pendiente_cliente: { label: 'Esperando cliente', cls: 'bg-orange-100 text-orange-900 border-orange-200' },
  en_proceso: { label: 'En proceso', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_progress: { label: 'En progreso', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  externa: { label: 'Reparación externa', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  reparado: { label: 'Reparado', cls: 'bg-green-100 text-green-800 border-green-200' },
  completed: { label: 'Completado', cls: 'bg-green-100 text-green-800 border-green-200' },
  repaired_collected: { label: 'Entregado', cls: 'bg-green-100 text-green-900 border-green-300' },
  delivered: { label: 'Entregado', cls: 'bg-green-100 text-green-900 border-green-300' },
  issued: { label: 'Emitido', cls: 'bg-green-100 text-green-900 border-green-300' },
  no_reparado_open: { label: 'No reparado (seguimiento)', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  no_reparado: { label: 'No reparado', cls: 'bg-red-100 text-red-800 border-red-200' },
  no_repair: { label: 'No reparado', cls: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-800 border-slate-200' },
  draft: { label: 'Borrador', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  en_estudio: { label: 'En estudio', cls: 'bg-green-50 text-green-900 border-green-200' },
  prioridad: { label: 'Prioridad', cls: 'bg-purple-100 text-purple-900 border-purple-200' },
  traslado: { label: 'Traslado', cls: 'bg-pink-100 text-pink-900 border-pink-200' },
  envios: { label: 'Envíos', cls: 'bg-blue-100 text-blue-900 border-blue-200' },
  waiting_parts: { label: 'Esperando piezas', cls: 'bg-blue-100 text-blue-900 border-blue-200' },
};

function humanizeUnknown(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '—';
  return s
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function getTicketStatusBadge(raw: string | null | undefined): { label: string; cls: string } {
  const n = normalizeTicketStatusKey(raw);
  const key = KEY_ALIASES[n] || n;
  const hit = BADGE[key];
  if (hit) return hit;
  if (n && BADGE[n]) return BADGE[n];
  return {
    label: humanizeUnknown(String(raw ?? '')),
    cls: 'bg-gray-100 text-gray-700 border-gray-200',
  };
}
