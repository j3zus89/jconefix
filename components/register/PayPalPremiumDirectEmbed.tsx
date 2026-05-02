'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { CheckoutCycle } from '@/lib/checkout-pricing';
import { PAYPAL_SDK_SCRIPT_LOCALE } from '@/lib/paypal-locale';

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

export type PremiumDirectRegistrationPayload = {
  full_name: string;
  email: string;
  password: string;
  shop_name: string;
  country_iso: string;
  fiscal_id?: string;
  cycle: CheckoutCycle;
};

type Props = {
  /** Si es false, no se monta el botón de PayPal. */
  formValid: boolean;
  cycle: CheckoutCycle;
  getPayload: () => PremiumDirectRegistrationPayload;
  onPaidSuccess: () => void | Promise<void>;
};

const SCRIPT_ID = 'paypal-sdk-jconefix-premium-direct';

export function PayPalPremiumDirectEmbed({ formValid, cycle, getPayload, onPaidSuccess }: Props) {
  const paypalWrapRef = useRef<HTMLDivElement>(null);
  const payloadGetterRef = useRef(getPayload);
  payloadGetterRef.current = getPayload;
  const onPaidRef = useRef(onPaidSuccess);
  onPaidRef.current = onPaidSuccess;

  const renderedRef = useRef(false);
  /** El SDK de PayPal llama a `onError` tras un `throw` en `createOrder`/`onApprove` y no siempre pasa el mensaje; guardamos el texto mostrable aquí. */
  const lastUserErrorRef = useRef<string | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  /** null = aún no pedimos config al servidor; string = Client ID (puede ser ""). */
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [configFetchError, setConfigFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!formValid) {
      setResolvedClientId(null);
      setConfigFetchError(null);
      return;
    }
    let cancelled = false;
    setConfigFetchError(null);
    setResolvedClientId(null);
    void (async () => {
      try {
        const res = await fetch('/api/paypal/public-config', { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as { clientId?: string };
        if (cancelled) return;
        const id = typeof data.clientId === 'string' ? data.clientId.trim() : '';
        setResolvedClientId(id);
        if (!id) {
          setConfigFetchError(
            'Falta PAYPAL_CLIENT_ID / NEXT_PUBLIC_PAYPAL_CLIENT_ID en el servidor.'
          );
        }
      } catch {
        if (!cancelled) {
          setResolvedClientId('');
          setConfigFetchError('No se pudo leer la configuración de PayPal.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formValid]);

  useEffect(() => {
    if (!formValid) {
      renderedRef.current = false;
      if (paypalWrapRef.current) paypalWrapRef.current.innerHTML = '';
      setSdkError(null);
      setPayError(null);
      setPaypalLoading(false);
      return;
    }

    if (resolvedClientId === null) {
      return;
    }

    const clientId = resolvedClientId;
    if (!clientId) {
      return;
    }

    const container = paypalWrapRef.current;
    if (!container) return;

    let cancelled = false;
    const safeLoading = (v: boolean) => {
      if (!cancelled) setPaypalLoading(v);
    };

    setPaypalLoading(true);
    setSdkError(null);
    setPayError(null);
    renderedRef.current = false;

    /** Locale fijo (`es_ES`): el navegador no debe inyectar `es-419` (PayPal Orders v2 lo rechaza). */
    const sdkCaptureUrl = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&locale=${PAYPAL_SDK_SCRIPT_LOCALE}`;

    const stripPaypal = () => {
      try {
        delete (window as unknown as { paypal?: unknown }).paypal;
      } catch {
        /* ignore */
      }
    };

    const removeScripts = () => {
      document.getElementById(SCRIPT_ID)?.remove();
      stripPaypal();
    };

    const run = () => {
      if (cancelled) {
        safeLoading(false);
        return;
      }
      if (renderedRef.current) {
        safeLoading(false);
        return;
      }
      if (!window.paypal?.Buttons) {
        if (!cancelled) setSdkError('No se pudo cargar PayPal.');
        safeLoading(false);
        return;
      }

      renderedRef.current = true;

      try {
        const btn = window.paypal.Buttons({
          style: {
            layout: 'vertical',
            shape: 'rect',
            label: 'paypal',
            color: 'gold',
          },
          createOrder: async () => {
            lastUserErrorRef.current = null;
            setPayError(null);
            const registration = payloadGetterRef.current();
            const res = await fetch('/api/paypal/create-order-premium-direct', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(registration),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
            if (!res.ok) {
              const msg =
                typeof data.error === 'string' && data.error.trim()
                  ? data.error.trim()
                  : 'No se pudo iniciar el pago';
              lastUserErrorRef.current = msg;
              setPayError(msg);
              throw new Error(msg);
            }
            if (!data.id || typeof data.id !== 'string') {
              const msg = 'Respuesta inválida del servidor al crear la orden.';
              lastUserErrorRef.current = msg;
              setPayError(msg);
              throw new Error(msg);
            }
            return data.id;
          },
          onApprove: async (data) => {
            lastUserErrorRef.current = null;
            setPayError(null);
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ orderID: data.orderID }),
            });
            const j = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
              const msg =
                typeof j.error === 'string' && j.error.trim()
                  ? j.error.trim()
                  : 'No se pudo confirmar el pago';
              lastUserErrorRef.current = msg;
              setPayError(msg);
              throw new Error(msg);
            }
            await onPaidRef.current();
          },
          onError: (err) => {
            console.error('[PayPal premium-direct]', err);
            if (cancelled) return;
            const fromApi = lastUserErrorRef.current;
            lastUserErrorRef.current = null;
            const fromErr =
              err instanceof Error && err.message && err.message.length < 500 ? err.message : '';
            setPayError(
              fromApi ||
                fromErr ||
                'Error en PayPal. Probá de nuevo; si sigue fallando, el Client ID público y las claves del servidor deben ser del mismo entorno (sandbox o producción).'
            );
          },
        });
        void btn.render(container);
      } catch (e) {
        console.error(e);
        if (!cancelled) setPayError('Error al iniciar el botón de PayPal.');
        renderedRef.current = false;
        safeLoading(false);
        return;
      }

      safeLoading(false);
    };

    removeScripts();

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = sdkCaptureUrl;
    script.onload = () => {
      queueMicrotask(() => window.setTimeout(run, 0));
    };
    script.onerror = () => {
      if (!cancelled) setSdkError('No se pudo cargar el script de PayPal.');
      safeLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      renderedRef.current = false;
      container.innerHTML = '';
      safeLoading(false);
      removeScripts();
    };
  }, [formValid, cycle, resolvedClientId]);

  const errAmber = 'border-amber-200/50 bg-amber-500/10 text-amber-100';
  const errRed = 'border-red-400/40 bg-red-500/10 text-red-200';

  return (
    <>
      {configFetchError && (
        <div className={`rounded-lg border p-3 text-sm ${errAmber}`}>{configFetchError}</div>
      )}
      {sdkError && <div className={`rounded-lg border p-3 text-sm ${errAmber}`}>{sdkError}</div>}
      {payError && <div className={`mt-4 rounded-lg border p-3 text-sm ${errRed}`}>{payError}</div>}
      <div className="mt-4">
        {!formValid ? (
          <p className="text-sm text-slate-500">
            Completá nombre del taller, país (distinto de Argentina), tu nombre,{' '}
            <strong className="font-semibold text-slate-400">email válido con @</strong>, y contraseña (mín. 6
            caracteres) para habilitar PayPal.
          </p>
        ) : resolvedClientId === null ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparando PayPal…
          </div>
        ) : !resolvedClientId ? (
          <p className="text-sm text-slate-500">Configuración pendiente del comercio.</p>
        ) : (
          <>
            <div ref={paypalWrapRef} className="min-h-[120px]" />
            {paypalLoading && !sdkError && (
              <div className="flex items-center gap-2 text-sm mt-4 text-slate-400">
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
