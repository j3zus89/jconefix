'use client';

import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { CheckoutCycle, CheckoutPlan } from '@/lib/checkout-pricing';
import { PAYPAL_SDK_SCRIPT_LOCALE } from '@/lib/paypal-locale';
import { paypalSubscriptionPlanIdForCycle } from '@/lib/paypal-subscription-env';

type Props = {
  cycle: CheckoutCycle;
  plan: CheckoutPlan;
  tone?: 'light' | 'dark';
  planId?: string;
};

function SubscribeButton({ cycle, plan, planId }: { cycle: CheckoutCycle; plan: CheckoutPlan; planId: string }) {
  const router = useRouter();
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isRejected) {
    return (
      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        No se pudo cargar PayPal. Revisa tu conexión o desactiva bloqueadores de anuncios e inténtalo de nuevo.
      </div>
    );
  }

  return (
    <div className="min-h-[48px]">
      {isPending && (
        <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando PayPal…
        </div>
      )}
      <PayPalButtons
        style={{ layout: 'vertical', shape: 'rect', label: 'subscribe', color: 'gold', height: 48 }}
        disabled={isPending}
        createSubscription={(_data, actions) =>
          actions.subscription.create({ plan_id: planId })
        }
        onApprove={(data) => {
          router.push(
            `/checkout/success?subscription_id=${encodeURIComponent(data.subscriptionID ?? '')}&plan=${plan}&cycle=${cycle}`
          );
          return Promise.resolve();
        }}
        onError={(err) => {
          console.error('[PayPal]', err);
        }}
      />
    </div>
  );
}

export function PayPalSubscriptionButton({ cycle, plan, tone = 'light', planId: planIdProp }: Props) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  const planId   = (planIdProp?.trim() || paypalSubscriptionPlanIdForCycle(cycle)).trim();

  const muted = tone === 'dark' ? 'text-slate-400' : 'text-slate-500';

  if (!clientId || !planId) {
    return (
      <p className={`text-sm ${muted}`}>
        {!clientId ? 'Falta NEXT_PUBLIC_PAYPAL_CLIENT_ID.' : `Falta NEXT_PUBLIC_PAYPAL_PLAN_ID_${cycle.toUpperCase()}.`}
      </p>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        vault: true,
        intent: 'subscription',
        currency: 'ARS',
        components: 'buttons',
        locale: PAYPAL_SDK_SCRIPT_LOCALE,
      }}
    >
      <SubscribeButton cycle={cycle} plan={plan} planId={planId} />
    </PayPalScriptProvider>
  );
}
