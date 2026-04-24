'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, CreditCard, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PRICING_AR } from '@/lib/pricing-config';
import type { BillingCycle } from '@/lib/org-plan';

type OrgRow = {
  name: string;
  subscription_status: string;
  trial_ends_at: string | null;
  license_expires_at: string | null;
  license_unlimited: boolean;
  billing_cycle: string;
  country: string;
  currency: string;
};

type PaymentRow = {
  id: string;
  created_at: string;
  mercado_pago_payment_id: string;
  transaction_amount: number;
  billing_cycle: string | null;
  payment_type_id: string | null;
  payment_method_id: string | null;
  status: string;
  date_approved: string | null;
};

function periodLengthMs(org: OrgRow, trialDays: number): number {
  const st = org.subscription_status || '';
  if (st === 'trial') return trialDays * 24 * 60 * 60 * 1000;
  const bc = (org.billing_cycle || 'mensual').toLowerCase();
  const days = bc === 'anual' ? 365 : 30;
  return days * 24 * 60 * 60 * 1000;
}

function effectiveExpiryIso(org: OrgRow): string | null {
  const st = org.subscription_status || '';
  if (st === 'trial' && org.trial_ends_at) return org.trial_ends_at;
  if (org.license_expires_at) return org.license_expires_at;
  return org.trial_ends_at;
}

export function SubscriptionSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [tick, setTick] = useState(0);
  const [cycle, setCycle] = useState<BillingCycle>('mensual');
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [trialDays, setTrialDays] = useState(15);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/subscription-overview', { cache: 'no-store' });
      const json = (await res.json()) as {
        organization?: OrgRow;
        payments?: PaymentRow[];
        trialDays?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar');
      if (json.organization) setOrg(json.organization);
      setPayments(json.payments ?? []);
      if (typeof json.trialDays === 'number') setTrialDays(json.trialDays);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  void tick;
  const expiryIso = org ? effectiveExpiryIso(org) : null;
  const now = Date.now();
  const endMs = expiryIso ? new Date(expiryIso).getTime() : NaN;
  const hasValidEnd = Number.isFinite(endMs);
  const isUnlimited = org?.license_unlimited === true;
  const isExpired = !isUnlimited && hasValidEnd && now >= endMs;

  const progress = useMemo(() => {
    if (!org || isUnlimited || !hasValidEnd) return 1;
    const t = Date.now();
    const len = periodLengthMs(org, trialDays);
    if (len <= 0) return 0;
    const p = (endMs - t) / len;
    return Math.min(1, Math.max(0, p));
  }, [org, isUnlimited, hasValidEnd, endMs, trialDays, tick]);

  const payMercadoPago = async () => {
    setPaying(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch('/api/checkout/mercadopago-preference', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ cycle }),
      });
      const json = (await res.json()) as { init_point?: string; error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudo iniciar el pago');
      if (!json.init_point) throw new Error('Mercado Pago no devolvió enlace');
      window.location.href = json.init_point;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando suscripción…
      </div>
    );
  }

  if (!org) return null;

  const price =
    cycle === 'anual'
      ? `$ ${PRICING_AR.PRECIO_ANUAL.toLocaleString('es-AR')} ARS / año`
      : `$ ${PRICING_AR.PRECIO_MENSUAL.toLocaleString('es-AR')} ARS / mes`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800">Mi suscripción</h2>
        {!isUnlimited && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              isExpired ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
            )}
          >
            {isExpired ? (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Vencido
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Activo
              </>
            )}
          </span>
        )}
      </div>
      <div className="p-4 space-y-4">
        {isUnlimited ? (
          <p className="text-sm text-gray-600">Tu organización tiene licencia ilimitada.</p>
        ) : (
          <>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Tiempo restante del período actual</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isExpired ? 'bg-red-500' : 'bg-[#F5C518]'
                  )}
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Vencimiento</p>
                <p className="text-gray-600">
                  {hasValidEnd
                    ? new Date(expiryIso!).toLocaleString('es-AR', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })
                    : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  La fecha y hora provienen de tu licencia en el sistema (Supabase). Si el super admin ajusta el
                  vencimiento, se refleja aquí al instante.
                </p>
              </div>
            </div>
          </>
        )}

        <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Renovar con Mercado Pago</p>
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5 max-w-xs">
            {(['mensual', 'anual'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors',
                  cycle === c ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {c === 'anual' ? 'Anual' : 'Mensual'}
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-gray-900">{price}</p>
          <Button
            type="button"
            className="w-full sm:w-auto gap-2"
            disabled={paying}
            onClick={() => void payMercadoPago()}
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Pagar con Mercado Pago
          </Button>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            El titular de la cuenta ({org.name}) queda vinculado al cobro. Tras aprobarse el pago, la licencia se
            extiende automáticamente (30 o 365 días según el plan).
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Últimos pagos</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no hay pagos registrados por Mercado Pago.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {payments.map((p) => (
                <li key={p.id} className="px-3 py-2 text-xs bg-white flex flex-wrap gap-2 justify-between">
                  <span className="font-mono text-gray-700">{p.mercado_pago_payment_id}</span>
                  <span className="text-gray-600">
                    {Number(p.transaction_amount).toLocaleString('es-AR')} ARS · {p.billing_cycle || '—'}
                  </span>
                  <span className="text-gray-500 w-full sm:w-auto">
                    {p.payment_type_id || '—'} {p.date_approved ? `· ${new Date(p.date_approved).toLocaleString('es-AR')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-gray-500">
          Tus datos se conservan al menos 12 meses aunque venza la licencia. Para recuperar acceso, renová desde acá o
          desde{' '}
          <Link href="/checkout/ar" className="text-primary font-medium hover:underline">
            checkout
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
