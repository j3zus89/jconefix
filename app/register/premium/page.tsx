import type { Metadata } from 'next';
import { PremiumDirectRegisterClient } from '@/components/register/PremiumDirectRegisterClient';
import type { CheckoutCycle } from '@/lib/checkout-pricing';

export const metadata: Metadata = {
  title: 'Premium — Registro y pago',
  description:
    'Alta de taller con JC ONE FIX Premium (PayPal USD): 30 días de regalo adicionales sobre tu primer periodo.',
  robots: { index: true, follow: true },
};

export default async function RegisterPremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const sp = await searchParams;
  const initialCycle: CheckoutCycle = sp.cycle === 'anual' ? 'anual' : 'mensual';
  return <PremiumDirectRegisterClient initialCycle={initialCycle} />;
}
