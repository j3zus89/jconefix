import {
  normalizeBillingCycle,
  normalizePlanType,
  type BillingCycle,
  type PlanType,
} from '@/lib/org-plan';
import type { CheckoutCycle, CheckoutPlan } from '@/lib/checkout-pricing';

const PREFIX = 'jc1x|';
const PREFIX_PREMIUM_DIRECT = 'jc1pd|';

/** Registro + pago en un paso: token hex + plan + cycle (custom_id &lt; 127). */
export function buildPaypalCustomIdPremiumDirect(
  token: string,
  plan: CheckoutPlan,
  cycle: CheckoutCycle
): string {
  return `${PREFIX_PREMIUM_DIRECT}${token}|${plan}|${cycle}`.slice(0, 127);
}

export function parsePaypalCustomIdPremiumDirect(
  customId: string | undefined | null
): { token: string; plan: PlanType; cycle: BillingCycle } | null {
  if (!customId || !customId.startsWith(PREFIX_PREMIUM_DIRECT)) return null;
  const rest = customId.slice(PREFIX_PREMIUM_DIRECT.length);
  const parts = rest.split('|');
  if (parts.length !== 3) return null;
  const [token, planRaw, cycleRaw] = parts;
  if (!token || token.length < 16) return null;
  return {
    token,
    plan: normalizePlanType(planRaw),
    cycle: normalizeBillingCycle(cycleRaw),
  };
}

/** Metadatos en PayPal `custom_id` (máx. 127). Si hay sesión, enlazamos cobro → organización. */
export function buildPaypalCustomId(
  organizationId: string | null | undefined,
  plan: CheckoutPlan,
  cycle: CheckoutCycle
): string {
  if (organizationId) {
    return `${PREFIX}${organizationId}|${plan}|${cycle}`.slice(0, 127);
  }
  return `jconefix_${plan}_${cycle}`.slice(0, 127);
}

export function parsePaypalCustomId(
  customId: string | undefined | null
): { organizationId: string; plan: PlanType; cycle: BillingCycle } | null {
  if (!customId || !customId.startsWith(PREFIX)) return null;
  const rest = customId.slice(PREFIX.length);
  const parts = rest.split('|');
  if (parts.length < 3) return null;
  const [organizationId, planRaw, cycleRaw] = parts;
  if (!organizationId) return null;
  return {
    organizationId,
    plan: normalizePlanType(planRaw),
    cycle: normalizeBillingCycle(cycleRaw),
  };
}
