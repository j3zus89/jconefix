/** Estados que inician o mantienen el «reloj» de seguimiento (alineado con el trigger SQL). */
export const DELAY_FOLLOWUP_TRACKED_STATUSES = [
  'waiting_parts',
  'pendiente_pedido',
  'pendiente_pieza',
  'pendiente_cliente',
  'presupuesto',
] as const;

export type DelayFollowupTrackedStatus = (typeof DELAY_FOLLOWUP_TRACKED_STATUSES)[number];

export type FollowUpWaitReason = 'piece_order' | 'customer' | 'supplier' | 'warranty' | 'other';

export type DelayFollowupSettings = {
  enabled: boolean;
  statuses: string[];
  first_notify_days_by_reason: Record<string, number>;
  repeat_every_days: number;
  max_notifications_per_ticket: number;
};

export const DEFAULT_DELAY_FOLLOWUP_SETTINGS: DelayFollowupSettings = {
  enabled: true,
  statuses: [...DELAY_FOLLOWUP_TRACKED_STATUSES],
  first_notify_days_by_reason: {
    piece_order: 7,
    customer: 3,
    supplier: 7,
    warranty: 10,
    other: 5,
    default: 5,
  },
  repeat_every_days: 7,
  max_notifications_per_ticket: 3,
};

export const WAIT_REASON_OPTIONS: { value: FollowUpWaitReason; label: string }[] = [
  { value: 'piece_order', label: 'Pedido / pieza en camino' },
  { value: 'customer', label: 'Pendiente del cliente' },
  { value: 'supplier', label: 'Proveedor / taller externo' },
  { value: 'warranty', label: 'Garantía / gestión larga' },
  { value: 'other', label: 'Otro' },
];

const REASON_LABELS: Record<FollowUpWaitReason, string> = {
  piece_order: 'Pedido / pieza',
  customer: 'Cliente',
  supplier: 'Proveedor',
  warranty: 'Garantía',
  other: 'Otro',
};

const STATUS_LABELS_ES: Record<string, string> = {
  waiting_parts: 'Esperando piezas',
  pendiente_pedido: 'Pendiente de pedido',
  pendiente_pieza: 'Pendiente de pieza',
  pendiente_cliente: 'Pendiente cliente',
  presupuesto: 'Presupuesto',
};

export function isDelayTrackedStatus(status: string): boolean {
  return (DELAY_FOLLOWUP_TRACKED_STATUSES as readonly string[]).includes(status);
}

export function mergeDelayFollowupSettings(raw: unknown): DelayFollowupSettings {
  const d = DEFAULT_DELAY_FOLLOWUP_SETTINGS;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...d, statuses: [...d.statuses], first_notify_days_by_reason: { ...d.first_notify_days_by_reason } };
  }
  const o = raw as Record<string, unknown>;
  const statuses = Array.isArray(o.statuses)
    ? o.statuses.filter((x): x is string => typeof x === 'string')
    : d.statuses;
  const firstMap =
    o.first_notify_days_by_reason && typeof o.first_notify_days_by_reason === 'object' && !Array.isArray(o.first_notify_days_by_reason)
      ? { ...d.first_notify_days_by_reason, ...(o.first_notify_days_by_reason as Record<string, number>) }
      : { ...d.first_notify_days_by_reason };
  for (const k of Object.keys(firstMap)) {
    const n = firstMap[k];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
      delete firstMap[k];
    }
  }
  const repeat =
    typeof o.repeat_every_days === 'number' && Number.isFinite(o.repeat_every_days) && o.repeat_every_days >= 1
      ? Math.floor(o.repeat_every_days)
      : d.repeat_every_days;
  const maxN =
    typeof o.max_notifications_per_ticket === 'number' &&
    Number.isFinite(o.max_notifications_per_ticket) &&
    o.max_notifications_per_ticket >= 1
      ? Math.floor(o.max_notifications_per_ticket)
      : d.max_notifications_per_ticket;
  return {
    enabled: o.enabled === false ? false : true,
    statuses: statuses.length ? statuses : [...d.statuses],
    first_notify_days_by_reason: firstMap,
    repeat_every_days: repeat,
    max_notifications_per_ticket: maxN,
  };
}

export function getFirstNotifyDays(settings: DelayFollowupSettings, reason: string | null | undefined): number {
  const map = settings.first_notify_days_by_reason;
  if (reason && typeof map[reason] === 'number') return map[reason] as number;
  if (typeof map.default === 'number') return map.default;
  return 5;
}

export function waitReasonLabel(reason: string | null | undefined): string {
  if (!reason) return 'Sin indicar';
  if (reason in REASON_LABELS) return REASON_LABELS[reason as FollowUpWaitReason];
  return reason;
}

export function delayStatusLabelEs(status: string): string {
  return STATUS_LABELS_ES[status] ?? status;
}
