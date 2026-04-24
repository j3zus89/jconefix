/**
 * Precios públicos de checkout (ARS). Los importes salen de `lib/pricing-config.ts` vía `JC_SINGLE_PLAN`.
 * Internamente se usa `profesional` por compatibilidad con `organizations` y PayPal.
 */
import { JC_SINGLE_PLAN } from '@/lib/plan-marketing';

export type CheckoutPlan = 'profesional';
export type CheckoutCycle = 'mensual' | 'anual';

function eurString(n: number): string {
  return n.toFixed(2);
}

const AMOUNTS: Record<CheckoutPlan, Record<CheckoutCycle, string>> = {
  profesional: {
    mensual: eurString(JC_SINGLE_PLAN.priceMonth),
    anual: eurString(JC_SINGLE_PLAN.priceYear),
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

export function checkoutDescription(plan: CheckoutPlan, cycle: CheckoutCycle): string {
  const period = cycle === 'anual' ? 'Anual' : 'Mensual';
  return `${LABELS[plan]} (${period})`;
}

export function checkoutPlanTitle(_plan: CheckoutPlan): string {
  return 'JC ONE FIX';
}
