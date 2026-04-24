import type { CheckoutCycle } from '@/lib/checkout-pricing';

/**
 * IDs de plan de suscripción PayPal (panel → Productos y planes → Plan ID tipo P-...).
 * Nombres preferidos (Vercel). Se mantienen fallbacks a variables antiguas por compatibilidad.
 */
export function paypalPlanIdMensualFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_MENSUAL?.trim() ||
    process.env.NEXT_PUBLIC_PAYPAL_SUBSCRIPTION_PLAN_ES_MENSUAL?.trim() ||
    ''
  );
}

export function paypalPlanIdAnualFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_ANUAL?.trim() ||
    process.env.NEXT_PUBLIC_PAYPAL_SUBSCRIPTION_PLAN_ES_ANUAL?.trim() ||
    ''
  );
}

/** Plan_id que corresponde al periodo elegido en checkout (mensual / anual). */
export function paypalSubscriptionPlanIdForCycle(cycle: CheckoutCycle): string {
  return cycle === 'mensual' ? paypalPlanIdMensualFromEnv() : paypalPlanIdAnualFromEnv();
}
