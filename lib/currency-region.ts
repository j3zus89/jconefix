/**
 * Región operativa del panel: Argentina (ARS) únicamente.
 */

export type OrgCountryCode = 'AR';

export function countryCodeFromCurrency(_currency?: string | null | undefined): OrgCountryCode {
  return 'AR';
}

export function isArgentinaCurrency(_currency?: string | null | undefined): boolean {
  return true;
}

export function currencySymbolFromCode(currency: string | null | undefined): string {
  const c = String(currency || '').toUpperCase();
  if (c === 'ARS' || c === 'USD' || c === 'MXN') return '$';
  if (c === 'GBP') return '£';
  return '$';
}

/** Valor coherente con la moneda del taller (solo Argentina en este producto). */
export function shopCountryNameFromCurrency(_currency?: string | null | undefined): 'Argentina' {
  return 'Argentina';
}

/** Zona horaria del taller (Argentina). */
export function resolveTimezoneForCurrency(
  _currency: string | null | undefined,
  previousTz: string | null | undefined
): string {
  const prev = (previousTz || '').trim();
  if (prev.startsWith('America/Argentina')) return prev;
  return 'America/Argentina/Buenos_Aires';
}
