'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { CheckoutCycle, CheckoutPlan } from '@/lib/checkout-pricing';

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: {
        style?: Record<string, string>;
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError?: (err: unknown) => void;
      }) => { render: (sel: string | HTMLElement) => Promise<void> };
    };
  }
}

type Props = {
  plan: CheckoutPlan;
  cycle: CheckoutCycle;
  /** Errores legibles en fondo claro u oscuro */
  tone?: 'light' | 'dark';
};

export function PayPalEmbed({ plan, cycle, tone = 'light' }: Props) {
  const router = useRouter();
  const paypalWrapRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  useEffect(() => {
    if (!clientId) {
      setSdkError('Falta NEXT_PUBLIC_PAYPAL_CLIENT_ID en el servidor.');
      return;
    }

    const container = paypalWrapRef.current;
    if (!container) return;

    let cancelled = false;
    const safeSetPaypalLoading = (v: boolean) => {
      if (!cancelled) setPaypalLoading(v);
    };

    setPaypalLoading(true);
    setSdkError(null);
    setPayError(null);
    renderedRef.current = false;

    const sdkCaptureUrl = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=ARS&intent=capture`;
    const scriptId = 'paypal-sdk-jconefix';

    const stripPaypal = () => {
      try {
        delete (window as unknown as { paypal?: unknown }).paypal;
      } catch {
        /* ignore */
      }
    };

    const removeScripts = () => {
      document.getElementById('paypal-sdk-jconefix-subscription')?.remove();
      document.getElementById(scriptId)?.remove();
      stripPaypal();
    };

    const run = () => {
      if (cancelled) {
        safeSetPaypalLoading(false);
        return;
      }
      if (renderedRef.current) {
        safeSetPaypalLoading(false);
        return;
      }
      if (!window.paypal?.Buttons) {
        if (!cancelled) setSdkError('No se pudo cargar PayPal.');
        safeSetPaypalLoading(false);
        return;
      }

      renderedRef.current = true;

      let renderPromise: Promise<unknown>;
      try {
        const btn = window.paypal.Buttons({
          style: {
            layout: 'vertical',
            shape: 'rect',
            label: 'paypal',
            color: 'gold',
          },
          createOrder: async () => {
            setPayError(null);
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plan, cycle }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(data.error || 'No se pudo iniciar el pago');
            }
            return data.id as string;
          },
          onApprove: async (data) => {
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID: data.orderID }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(j.error || 'No se pudo confirmar el pago');
            }
            router.push(
              `/checkout/success?order_id=${encodeURIComponent(data.orderID)}&plan=${plan}&cycle=${cycle}`
            );
          },
          onError: (err) => {
            console.error(err);
            if (!cancelled) setPayError('Error en el widget de PayPal. Inténtalo de nuevo.');
          },
        });
        renderPromise = Promise.resolve(btn.render(container));
      } catch (e) {
        console.error(e);
        if (!cancelled) setPayError('Error al iniciar el botón de PayPal.');
        renderedRef.current = false;
        safeSetPaypalLoading(false);
        return;
      }

      const RENDER_TIMEOUT_MS = 30000;
      let renderTimeoutId: number | undefined;
      const timeout = new Promise<never>((_, reject) => {
        renderTimeoutId = window.setTimeout(() => reject(new Error('paypal-render-timeout')), RENDER_TIMEOUT_MS);
      });

      void Promise.race([renderPromise, timeout])
        .catch((e: unknown) => {
          if (cancelled) return;
          if (e instanceof Error && e.message === 'paypal-render-timeout') {
            setSdkError('PayPal tardó demasiado en mostrarse. Recarga la página o vuelve a elegir el periodo.');
          } else {
            console.error(e);
            setPayError('No se pudo mostrar el botón de PayPal.');
          }
          renderedRef.current = false;
        })
        .finally(() => {
          if (renderTimeoutId !== undefined) window.clearTimeout(renderTimeoutId);
          safeSetPaypalLoading(false);
        });
    };

    removeScripts();

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = sdkCaptureUrl;
    script.onload = () => {
      queueMicrotask(() => {
        window.setTimeout(run, 0);
      });
    };
    script.onerror = () => {
      if (!cancelled) setSdkError('No se pudo cargar el script de PayPal.');
      safeSetPaypalLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      renderedRef.current = false;
      container.innerHTML = '';
      safeSetPaypalLoading(false);
    };
  }, [plan, cycle, clientId, router]);

  const errAmber =
    tone === 'dark'
      ? 'border-amber-200/50 bg-amber-500/10 text-amber-100'
      : 'border-amber-200 bg-amber-50 text-amber-900';
  const errRed =
    tone === 'dark'
      ? 'border-red-400/40 bg-red-500/10 text-red-200'
      : 'border-red-200 bg-red-50 text-red-800';
  const muted = tone === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      {sdkError && <div className={`rounded-lg border p-3 text-sm ${errAmber}`}>{sdkError}</div>}
      {payError && <div className={`mt-4 rounded-lg border p-3 text-sm ${errRed}`}>{payError}</div>}
      <div className="mt-6">
        {!clientId ? (
          <p className={`text-sm ${muted}`}>Configuración pendiente del comercio.</p>
        ) : (
          <>
            <div ref={paypalWrapRef} className="min-h-[120px]" />
            {paypalLoading && !sdkError && (
              <div className={`flex items-center gap-2 text-sm mt-4 ${muted}`}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando PayPal…
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
