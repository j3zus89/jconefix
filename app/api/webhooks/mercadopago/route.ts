import { NextRequest, NextResponse } from 'next/server';
import {
  applyApprovedMercadoPagoPayment,
  fetchMercadoPagoPayment,
  getMercadoPagoAdminClient,
} from '@/lib/mercadopago-subscription';

export const dynamic = 'force-dynamic';

/**
 * Mercado Pago notificaciones (webhooks).
 * Configurá la URL en el panel de MP: https://TU_DOMINIO/api/webhooks/mercadopago
 */
export async function POST(req: NextRequest) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    console.error('[webhook mp] MERCADOPAGO_ACCESS_TOKEN no configurado');
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let paymentId: string | null = req.nextUrl.searchParams.get('id')?.trim() || null;
  let topic = req.nextUrl.searchParams.get('topic')?.trim() || null;

  if (!paymentId) {
    try {
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      const data = body?.data as { id?: string | number } | undefined;
      if (body?.type === 'payment' && data?.id != null) {
        paymentId = String(data.id);
      }
      if (!topic && typeof body?.type === 'string') topic = body.type;
    } catch {
      /* cuerpo vacío */
    }
  }

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }
  if (topic && topic !== 'payment') {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const payment = await fetchMercadoPagoPayment(token, paymentId);
  if (!payment) {
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  const admin = getMercadoPagoAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const result = await applyApprovedMercadoPagoPayment(admin, payment);
  if (!result.ok) {
    console.error('[webhook mp]', result.error);
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, skipped: result.skipped }, { status: 200 });
}

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('id')?.trim();
  const topic = req.nextUrl.searchParams.get('topic')?.trim();
  if (topic === 'payment' && paymentId) {
    return POST(req);
  }
  return NextResponse.json({ ok: true, service: 'mercadopago-webhook' }, { status: 200 });
}
