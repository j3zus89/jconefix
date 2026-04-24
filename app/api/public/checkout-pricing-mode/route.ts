import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutPricingClientState } from '@/lib/checkout-pricing-visibility-server';

export const dynamic = 'force-dynamic';

/** Para componentes cliente: saber si mostrar precios/cobro y país de taller. */
export async function GET(req: NextRequest) {
  try {
    const forceCommercial = req.nextUrl.searchParams.get('renew') === '1';
    const state = await getCheckoutPricingClientState({ forceCommercial });
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
