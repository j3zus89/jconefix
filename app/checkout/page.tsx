/**
 * Checkout comercial: flujo Argentina (pesos, Mercado Pago) en /checkout/ar.
 */

import { redirect } from 'next/navigation';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const params = await searchParams;
  const cycle = params.cycle === 'anual' ? 'anual' : 'mensual';
  redirect(`/checkout/ar?cycle=${cycle}`);
}
