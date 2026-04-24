import { NextRequest, NextResponse } from 'next/server';
import { paypalCaptureOrder } from '@/lib/paypal-server';
import { activateOrganizationFromPaypalCapture } from '@/lib/paypal-sync-org';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderID = typeof body.orderID === 'string' ? body.orderID : '';
    if (!orderID) {
      return NextResponse.json({ error: 'orderID requerido' }, { status: 400 });
    }
    const result = await paypalCaptureOrder(orderID);
    await activateOrganizationFromPaypalCapture(result);
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    console.error('[paypal/capture-order]', e);
    return NextResponse.json(
      { error: e?.message || 'No se pudo completar el pago' },
      { status: 500 }
    );
  }
}
