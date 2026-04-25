'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JcOneFixAppIcon, JcOneFixMark } from '@/components/jc-one-fix-mark';
import { checkoutPlanTitle, normalizeCheckoutCycle, normalizeCheckoutPlan } from '@/lib/checkout-pricing';

function SuccessBody() {
  const sp = useSearchParams();
  const orderId = sp.get('order_id') || '';
  const subscriptionId = sp.get('subscription_id') || '';
  const mpSource = sp.get('source') === 'mp';
  const mpPaymentId = sp.get('payment_id') || sp.get('collection_id') || '';
  const plan = normalizeCheckoutPlan(sp.get('plan'));
  const cycle = normalizeCheckoutCycle(sp.get('cycle'));
  const planLine = cycle
    ? `${checkoutPlanTitle(plan)} (${cycle === 'anual' ? 'anual' : 'mensual'})`
    : 'JC ONE FIX';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <JcOneFixAppIcon className="h-10 w-10 rounded-full" />
          <JcOneFixMark tone="onLight" className="text-xl font-bold" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle className="h-9 w-9 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pago recibido</h1>
          {mpSource ? (
            <>
              <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                Gracias por tu pago con <strong>Mercado Pago</strong>. El webhook confirma el cobro y extiende tu licencia
                automáticamente (hasta 30 o 365 días según el plan).
              </p>
              {mpPaymentId && (
                <p className="text-xs text-slate-500 mt-4 font-mono break-all">
                  ID de pago (Mercado Pago): {mpPaymentId}
                </p>
              )}
              <p className="text-sm text-slate-600 mt-6">
                Podés volver al panel con tu usuario habitual. Si algo tarda unos minutos, actualizá la página o cerrá y
                volvé a iniciar sesión.
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                Gracias. Hemos registrado correctamente tu {subscriptionId ? 'suscripción' : 'pago'} de{' '}
                <strong>{planLine}</strong> con PayPal.
              </p>
              {orderId && (
                <p className="text-xs text-slate-500 mt-4 font-mono break-all">Referencia pedido: {orderId}</p>
              )}
              {subscriptionId && (
                <p className="text-xs text-slate-500 mt-2 font-mono break-all">ID suscripción: {subscriptionId}</p>
              )}
              <p className="text-sm text-slate-600 mt-6">
                En breve activamos tu taller y recibirás las instrucciones de acceso en el email asociado a tu cuenta de
                PayPal.
              </p>
            </>
          )}
          <div className="mt-8 flex flex-col gap-2">
            <Button asChild className="w-full bg-[#124c48] hover:bg-[#0f3d3a]">
              <Link href="/login">Ir al inicio de sesión</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Volver a la web</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessBody />
    </Suspense>
  );
}
