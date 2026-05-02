import {
  checkoutAmountEur,
  checkoutAmountUsd,
  checkoutDescription,
  type CheckoutCycle,
  type CheckoutPlan,
} from '@/lib/checkout-pricing';
import { buildPaypalCustomId } from '@/lib/paypal-order-meta';
import { PAYPAL_ORDERS_V2_LOCALE } from '@/lib/paypal-locale';

function paypalBase(): string {
  const fromEnv = process.env.PAYPAL_API_BASE?.trim();
  if (fromEnv) return fromEnv;
  // Sin PAYPAL_API_BASE, sandbox solo en desarrollo. En producción el valor por defecto
  // debe ser live; si no, el navegador crea órdenes con NEXT_PUBLIC_* live pero el
  // servidor creaba órdenes en sandbox → INVALID_RESOURCE_ID al abrir checkout.
  return process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function paypalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('PayPal no configurado: PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET son obligatorios');
  }
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal OAuth error: ${res.status} ${t}`);
  }
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
}

export type PaypalPricingRegion = 'legacy_eur_stored_amounts' | 'usd_latam';

export async function paypalCreateOrder(
  plan: CheckoutPlan,
  cycle: CheckoutCycle,
  organizationId?: string | null,
  pricingRegion: PaypalPricingRegion = 'legacy_eur_stored_amounts'
): Promise<{ id: string }> {
  const token = await paypalAccessToken();
  const useUsd = pricingRegion === 'usd_latam';
  const value = useUsd ? checkoutAmountUsd(plan, cycle) : checkoutAmountEur(plan, cycle);
  const description = checkoutDescription(plan, cycle);
  const customId = buildPaypalCustomId(organizationId ?? null, plan, cycle);

  const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `${plan}_${cycle}`,
          description,
          custom_id: customId.slice(0, 127),
          amount: {
            currency_code: useUsd ? 'USD' : 'EUR',
            value,
          },
        },
      ],
      application_context: {
        brand_name: 'JC ONE FIX',
        locale: PAYPAL_ORDERS_V2_LOCALE,
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal create order: ${res.status} ${t}`);
  }
  const j = (await res.json()) as { id: string };
  return { id: j.id };
}

/** Checkout USD (LatAm) con `custom_id` libre — registro Premium directo (`jc1pd|…`). */
export async function paypalCreateUsdOrderWithCustomId(
  plan: CheckoutPlan,
  cycle: CheckoutCycle,
  customId: string
): Promise<{ id: string }> {
  const token = await paypalAccessToken();
  const value = checkoutAmountUsd(plan, cycle);
  const description = checkoutDescription(plan, cycle);

  const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `${plan}_${cycle}_pd`,
          description,
          custom_id: customId.slice(0, 127),
          amount: {
            currency_code: 'USD',
            value,
          },
        },
      ],
      application_context: {
        brand_name: 'JC ONE FIX',
        locale: PAYPAL_ORDERS_V2_LOCALE,
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal create order: ${res.status} ${t}`);
  }
  const j = (await res.json()) as { id: string };
  return { id: j.id };
}

export async function paypalCaptureOrder(orderId: string): Promise<unknown> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal capture: ${res.status} ${t}`);
  }
  return res.json();
}
