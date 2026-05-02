/**
 * Precios de checkout: ARS (lista pública) y USD (PayPal LatAm, 29 USD/mes Premium).
 * Internamente se usa `profesional` por compatibilidad con `organizations` y PayPal.
 */
import { JC_SINGLE_PLAN } from '@/lib/plan-marketing';

export type CheckoutPlan = 'profesional';
export type CheckoutCycle = 'mensual' | 'anual';

function eurString(n: number): string {
  return n.toFixed(2);
}

/**
 * Plan Premium internacional (PayPal, USD). Debe ser 29/mes (no 14,90 u otros importes legacy).
 * Anual: 290 USD (~10× mensual). No mezclar con `JC_SINGLE_PLAN` (ARS).
 */
export const PRICING_USD = {
  PRECIO_MENSUAL: 29,
  PRECIO_ANUAL: 290,
} as const;

const AMOUNTS: Record<CheckoutPlan, Record<CheckoutCycle, string>> = {
  profesional: {
    mensual: eurString(JC_SINGLE_PLAN.priceMonth),
    anual: eurString(JC_SINGLE_PLAN.priceYear),
  },
};

const AMOUNTS_USD: Record<CheckoutPlan, Record<CheckoutCycle, string>> = {
  profesional: {
    mensual: eurString(PRICING_USD.PRECIO_MENSUAL),
    anual: eurString(PRICING_USD.PRECIO_ANUAL),
  },
};

const LABELS: Record<CheckoutPlan, string> = {
  profesional: 'JC ONE FIX',
};

/** Único plan comercial; cualquier token antiguo se normaliza aquí. */
export function normalizeCheckoutPlan(_v: string | null): CheckoutPlan {
  return 'profesional';
}

export function normalizeCheckoutCycle(v: string | null): CheckoutCycle | null {
  const c = (v || '').toLowerCase();
  if (c === 'mensual' || c === 'monthly') return 'mensual';
  if (c === 'anual' || c === 'annual' || c === 'yearly') return 'anual';
  return null;
}

export function checkoutAmountEur(plan: CheckoutPlan, cycle: CheckoutCycle): string {
  return AMOUNTS[plan][cycle];
}

export function checkoutAmountUsd(plan: CheckoutPlan, cycle: CheckoutCycle): string {
  return AMOUNTS_USD[plan][cycle];
}

export function checkoutDescription(plan: CheckoutPlan, cycle: CheckoutCycle): string {
  const period = cycle === 'anual' ? 'Anual' : 'Mensual';
  return `${LABELS[plan]} (${period})`;
}

export function checkoutPlanTitle(_plan: CheckoutPlan): string {
  return 'JC ONE FIX';
}
