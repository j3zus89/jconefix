/** Compartido entre «Nuevo ticket» y «Recepción». */

export const NEW_FORM_STATUSES = new Set([
  'draft',
  'entrada',
  'en_proceso',
  'pendiente_pedido',
  'pendiente_pieza',
  'presupuesto',
  'diagnostico',
  'externa',
  'reparado',
  'no_reparado',
  'cancelled',
]);

export const DEVICE_CATEGORIES = new Set([
  'SMARTPHONES',
  'TABLETS',
  'LAPTOPS',
  'CONSOLAS',
  'SMARTWATCH',
  'AURICULARES',
  'SMART_TV',
  'AUDIO_VIDEO',
  'OTROS',
]);

/**
 * Lista plana histórica. El alta de tickets usa marcas por categoría vía
 * `getTicketFormBrandSelectOptions` en `repair-service-device-catalog.ts`.
 */
export const DEVICE_BRANDS = new Set([
  'APPLE',
  'SAMSUNG',
  'XIAOMI',
  'HUAWEI',
  'GOOGLE',
  'SONY',
  'MOTOROLA',
  'OPPO',
  'OTRO',
]);

export function costToInput(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return String(n);
}
