import { NextRequest, NextResponse } from 'next/server';
import {
  createPremiumDirectPayPalOrder,
  PREMIUM_DIRECT_COOKIE,
} from '@/lib/paypal-premium-direct-signup';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const r = await createPremiumDirectPayPalOrder(req, body);
    if (!r.ok) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }
    const res = NextResponse.json({ id: r.orderId });
    res.cookies.set(PREMIUM_DIRECT_COOKIE, r.cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    });
    return res;
  } catch (e: unknown) {
    console.error('[paypal/create-order-premium-direct]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
