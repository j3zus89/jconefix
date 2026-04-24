/** Preferencias por evento: correo y WhatsApp (Ajustes → Correo y WhatsApp). */

export type CustomerNotifyChannelKey =
  | 'ticket_created'
  | 'status_change'
  | 'ready_pickup'
  | 'estimate_pending'
  | 'invoice_issued';

export type NotifyChannelPair = { email: boolean; whatsapp: boolean };

export type CustomerNotifyChannels = Record<CustomerNotifyChannelKey, NotifyChannelPair>;

export const DEFAULT_CUSTOMER_NOTIFY_CHANNELS: CustomerNotifyChannels = {
  ticket_created: { email: true, whatsapp: false },
  status_change: { email: true, whatsapp: false },
  ready_pickup: { email: true, whatsapp: false },
  estimate_pending: { email: true, whatsapp: false },
  invoice_issued: { email: true, whatsapp: false },
};

const KEYS: CustomerNotifyChannelKey[] = [
  'ticket_created',
  'status_change',
  'ready_pickup',
  'estimate_pending',
  'invoice_issued',
];

function normalizePair(v: unknown): NotifyChannelPair {
  if (!v || typeof v !== 'object') return { email: true, whatsapp: false };
  const o = v as Record<string, unknown>;
  return {
    email: o.email !== false,
    whatsapp: Boolean(o.whatsapp),
  };
}

/** Fusiona JSON de `shop_settings.customer_notify_channels` con valores por defecto. */
export function parseCustomerNotifyChannels(raw: unknown): CustomerNotifyChannels {
  const base: CustomerNotifyChannels = { ...DEFAULT_CUSTOMER_NOTIFY_CHANNELS };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  for (const k of KEYS) {
    base[k] = normalizePair(o[k]);
  }
  return base;
}
