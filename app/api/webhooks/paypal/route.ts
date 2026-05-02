import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { paypalAccessToken } from '@/lib/paypal-server';
import { activateOrganizationFromPaypalCapture } from '@/lib/paypal-sync-org';
import { tryProvisionPremiumDirectSignupFromWebhook } from '@/lib/paypal-premium-direct-signup';

export const dynamic = 'force-dynamic';

/**
 * Webhook PayPal — respaldo server-to-server.
 *
 * Configurar en PayPal Developer → Apps & Credentials → Webhooks:
 *   URL: https://TU_DOMINIO/api/webhooks/paypal
 *   Eventos:
 *     - PAYMENT.CAPTURE.COMPLETED
 *     - CHECKOUT.ORDER.APPROVED  (fallback)
 *
 * Variable de entorno opcional:
 *   PAYPAL_WEBHOOK_ID  → ID del webhook en PayPal Developer (para verificación de firma).
 *                        Sin él se procesa igualmente pero sin verificar firma (menos seguro).
 *
 * Flujo:
 *  1. Verifica firma PayPal (si PAYPAL_WEBHOOK_ID está definido)
 *  2. Si evento = PAYMENT.CAPTURE.COMPLETED o CHECKOUT.ORDER.APPROVED → obtiene order completa
 *  3. Rama A — premium-direct (custom_id jc1pd|…): aprovisiona usuario + org
 *  4. Rama B — org existente  (custom_id jc1x|…):  actualiza licencia
 *  5. Registra resultado en subscription_payments (idempotente)
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('[webhook paypal] Supabase no configurado');
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // ── Leer cuerpo ───────────────────────────────────────────────────────────
  let rawBody = '';
  let event: Record<string, unknown> = {};
  try {
    rawBody = await req.text();
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  const eventType = String(event.event_type ?? '');

  // ── Verificar firma PayPal (si PAYPAL_WEBHOOK_ID está definido) ───────────
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (webhookId) {
    const verified = await verifyPaypalWebhookSignature(req, rawBody, webhookId);
    if (!verified) {
      console.error('[webhook paypal] firma inválida');
      return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 });
    }
  }

  // ── Filtrar eventos relevantes ────────────────────────────────────────────
  const HANDLED_EVENTS = ['PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.APPROVED'];
  if (!HANDLED_EVENTS.includes(eventType)) {
    return NextResponse.json({ ok: true, ignored: true, event_type: eventType }, { status: 200 });
  }

  // ── Obtener resource (capture o order) ───────────────────────────────────
  const resource = event.resource as Record<string, unknown> | undefined;
  if (!resource) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'no_resource' }, { status: 200 });
  }

  // Para PAYMENT.CAPTURE.COMPLETED, resource ES la capture pero sin las purchase_units completas.
  // Necesitamos la order completa para leer custom_id. La obtenemos vía API.
  const orderId =
    (resource.supplementary_data as Record<string, unknown> | undefined)?.related_ids &&
    ((resource.supplementary_data as Record<string, Record<string, string>>)?.related_ids?.order_id) ||
    (resource.id as string | undefined) ||
    '';

  if (!orderId) {
    console.error('[webhook paypal] sin order_id en resource', JSON.stringify(resource).slice(0, 200));
    return NextResponse.json({ ok: true, ignored: true, reason: 'no_order_id' }, { status: 200 });
  }

  // ── Obtener order completa ────────────────────────────────────────────────
  let orderBody: unknown;
  try {
    orderBody = await fetchPaypalOrder(orderId);
  } catch (e) {
    console.error('[webhook paypal] fetch order', e);
    return NextResponse.json({ ok: false, error: 'fetch_order_failed' }, { status: 502 });
  }

  // ── Rama A: premium-direct (sin cookie — webhook llega sin cookie de browser) ──
  // tryProvisionPremiumDirectSignupFromWebhook es una variante sin cookie que
  // usa el token en custom_id para buscar el payload en la BD temporal.
  const pdResult = await tryProvisionPremiumDirectSignupFromWebhook(orderBody);
  if (pdResult.handled) {
    if (!pdResult.success) {
      console.error('[webhook paypal] premium-direct falló', pdResult.message);
      // Devolvemos 200 para que PayPal no reintente indefinidamente; el error queda en logs.
      return NextResponse.json(
        { ok: false, error: pdResult.message, premium_direct_failed: true },
        { status: 200 }
      );
    }
    return NextResponse.json({ ok: true, premium_direct: true }, { status: 200 });
  }

  // ── Rama B: org existente ─────────────────────────────────────────────────
  await activateOrganizationFromPaypalCapture(orderBody);

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'paypal-webhook' }, { status: 200 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPaypalOrder(orderId: string): Promise<unknown> {
  const token = await paypalAccessToken();
  const base = (process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com').trim();
  const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`PayPal GET order ${orderId}: ${res.status} ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

/**
 * Verifica la firma del webhook contra la API de PayPal.
 * https://developer.paypal.com/api/rest/webhooks/
 */
async function verifyPaypalWebhookSignature(
  req: NextRequest,
  rawBody: string,
  webhookId: string
): Promise<boolean> {
  try {
    const token = await paypalAccessToken();
    const base = (process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com').trim();

    const verifyBody = {
      auth_algo: req.headers.get('paypal-auth-algo') ?? '',
      cert_url: req.headers.get('paypal-cert-url') ?? '',
      transmission_id: req.headers.get('paypal-transmission-id') ?? '',
      transmission_sig: req.headers.get('paypal-transmission-sig') ?? '',
      transmission_time: req.headers.get('paypal-transmission-time') ?? '',
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    };

    const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyBody),
      cache: 'no-store',
    });

    if (!res.ok) return false;
    const json = (await res.json()) as { verification_status?: string };
    return json.verification_status === 'SUCCESS';
  } catch (e) {
    console.error('[webhook paypal] verify signature error', e);
    return false;
  }
}
