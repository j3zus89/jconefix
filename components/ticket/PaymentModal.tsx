'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, Banknote, CreditCard, ArrowLeftRight, Combine, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethodKey = 'cash' | 'card' | 'transfer' | 'combined';

export type PaymentResult = {
  method: PaymentMethodKey;
  amount: number;
  cashReceived?: number;
  change?: number;
  /**
   * Argentina: comprobante de gestión sin CAE AFIP.
   * Solo tiene efecto si el dueño habilitó la opción en Ajustes → ARCA.
   */
  invoiceWithoutAfip?: boolean;
};

type Props = {
  open: boolean;
  /** Importe que se cobra en esta operación (p. ej. saldo pendiente). */
  totalDue: number;
  /** Total del comprobante / orden (si es mayor que totalDue, se muestra como contexto). */
  referenceTotal?: number | null;
  currencySymbol: string;
  /** Moneda ISO (por defecto ARS). Controla billetes sugeridos. */
  currency?: string;
  /** Texto bajo el botón mientras se procesa el cobro (p. ej. ARCA/AFIP). */
  processingHint?: string | null;
  /**
   * Si el taller (AR) permitió cobros sin AFIP: muestra casilla en el modal.
   */
  allowInvoiceWithoutAfip?: boolean;
  onConfirm: (result: PaymentResult) => Promise<void> | void;
  onClose: () => void;
};

const METHODS: { key: PaymentMethodKey; label: string; icon: ReactNode; color: string }[] = [
  { key: 'cash',     label: 'Efectivo',       icon: <Banknote className="h-5 w-5" />,       color: 'bg-[#F5C518]' },
  { key: 'card',     label: 'Tarjeta',         icon: <CreditCard className="h-5 w-5" />,     color: 'bg-blue-500' },
  { key: 'transfer', label: 'Transferencia',   icon: <ArrowLeftRight className="h-5 w-5" />, color: 'bg-violet-500' },
  { key: 'combined', label: 'Pago combinado',  icon: <Combine className="h-5 w-5" />,        color: 'bg-amber-500' },
];

/** Returns up to 4 distinct quick-pay amounts strictly above totalDue. */
function getQuickAmounts(totalDue: number, currency: string): number[] {
  if (totalDue <= 0) return [];
  const cur = (currency || 'ARS').toUpperCase();

  // For large-unit currencies use the actual bill denomination list
  if (['ARS', 'CLP', 'COP', 'PYG', 'VES'].includes(cur)) {
    const bills = [
      100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000,
      100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000,
    ];
    const above = bills.filter(b => b > totalDue);
    if (above.length >= 1) return above.slice(0, 4);

    // Total exceeds all known bills: show ×1.5, ×2, ×3, ×5 rounded to nearest order of magnitude
    const step = Math.pow(10, Math.floor(Math.log10(totalDue)));
    return Array.from(new Set(
      [1.5, 2, 3, 5]
        .map(m => Math.ceil((totalDue * m) / step) * step)
        .filter(v => v > totalDue),
    )).slice(0, 4);
  }

  // Otras monedas: múltiplos por orden de magnitud.
  // Using order-of-magnitude steps ensures sensible increments at any price level.
  const mag = Math.pow(10, Math.floor(Math.log10(totalDue)));
  const steps = [mag / 2, mag, mag * 2, mag * 5, mag * 10].filter(s => s >= 1);

  const nextAbove = (step: number): number => {
    const m = Math.ceil(totalDue / step) * step;
    return m > totalDue ? m : m + step;
  };

  return Array.from(new Set(steps.map(nextAbove))).slice(0, 4);
}

export function PaymentModal({
  open,
  totalDue,
  referenceTotal = null,
  currencySymbol,
  currency = 'ARS',
  processingHint = null,
  allowInvoiceWithoutAfip = false,
  onConfirm,
  onClose,
}: Props) {
  const sym = currencySymbol || '$';
  const ref = referenceTotal != null && Number.isFinite(referenceTotal) ? referenceTotal : null;
  const showRef = ref != null && ref > totalDue + 0.009;
  const [method, setMethod] = useState<PaymentMethodKey>('cash');
  const [cashIn, setCashIn] = useState('');
  const [invoiceWithoutAfip, setInvoiceWithoutAfip] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cashReceived = parseFloat(cashIn.replace(',', '.')) || 0;
  // Float-safe subtraction: round to 2 decimals to avoid 0.1+0.2 style drift
  const change = method === 'cash' && cashReceived >= totalDue
    ? Math.round((cashReceived - totalDue) * 100) / 100
    : 0;

  const quickAmounts = getQuickAmounts(totalDue, currency);

  useEffect(() => {
    if (open && method === 'cash') {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, method]);

  useEffect(() => {
    if (open) {
      setMethod('cash');
      setCashIn('');
      setInvoiceWithoutAfip(false);
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (totalDue <= 0) return;
    if (method === 'cash' && cashReceived < totalDue) return;
    setSaving(true);
    try {
      await onConfirm({
        method,
        amount: totalDue,
        cashReceived: method === 'cash' ? cashReceived : undefined,
        change: method === 'cash' ? change : undefined,
        ...(allowInvoiceWithoutAfip && invoiceWithoutAfip ? { invoiceWithoutAfip: true } : {}),
      });
    } finally {
      setSaving(false);
    }
  };

  const canConfirm = method !== 'cash' || cashReceived >= totalDue;
  const shortage = method === 'cash' && cashReceived > 0 && cashReceived < totalDue
    ? Math.round((totalDue - cashReceived) * 100) / 100
    : 0;

  const requestClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={requestClose} />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1623] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-bold text-white">Cobrar</h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="rounded-full p-1.5 hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Total due */}
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">A cobrar ahora</span>
              <span className="text-xl font-black text-white">{sym} {totalDue.toFixed(2)}</span>
            </div>
            {showRef ? (
              <p className="text-[11px] text-slate-500 leading-snug">
                Total del servicio {sym} {ref.toFixed(2)} · ya ingresado {sym} {(ref - totalDue).toFixed(2)}
              </p>
            ) : null}
          </div>

          {/* Method selector */}
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                  method === m.key
                    ? 'border-[#F5C518] bg-[#F5C518]/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                )}
              >
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white', m.color)}>
                  {m.icon}
                </span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Cash input */}
          {method === 'cash' && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Importe recibido</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold z-10">{sym} </span>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder={totalDue.toFixed(2)}
                  value={cashIn}
                  onChange={(e) => {
                    // Allow only digits, dot and comma
                    const v = e.target.value.replace(/[^0-9.,]/g, '');
                    setCashIn(v);
                  }}
                  className="w-full rounded-xl border border-white/20 bg-[#1a2535] pl-7 pr-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#F5C518]/60 text-right text-lg font-bold caret-white"
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setCashIn(String(amount))}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
                  >
                    {sym} {amount}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashIn(totalDue.toFixed(2))}
                  className="rounded-lg border border-[#F5C518]/40 bg-[#F5C518]/10 text-[#F5C518] hover:bg-[#F5C518]/20"
                >
                  Exacto
                </button>
              </div>

              {/* Change display */}
              {cashReceived > 0 && change > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between bg-[#F5C518]/10 border border-[#F5C518]/30">
                  <div>
                    <p className="text-xs text-slate-400">Cambio / Vuelto</p>
                    <p className="text-xs text-slate-500">
                      {sym} {cashReceived.toFixed(2)} − {sym} {totalDue.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-[#F5C518]">
                    {sym} {change.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Not enough cash warning */}
              {shortage > 0 && (
                <div className="rounded-xl px-4 py-2.5 flex items-center justify-between bg-red-500/10 border border-red-500/20">
                  <span className="text-sm text-slate-300">Faltan</span>
                  <span className="text-lg font-black text-red-400">{sym} {shortage.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Non-cash note */}
          {method !== 'cash' && (
            <p className="text-xs text-slate-500 text-center">
              {method === 'card' && 'El pago con tarjeta se registrará como cobrado.'}
              {method === 'transfer' && 'La transferencia se registrará como cobrada.'}
              {method === 'combined' && 'Pago combinado: se marcará como cobrado.'}
            </p>
          )}

          {allowInvoiceWithoutAfip ? (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-[#1a2535] text-[#F5C518] focus:ring-[#F5C518]/50"
                checked={invoiceWithoutAfip}
                onChange={(e) => setInvoiceWithoutAfip(e.target.checked)}
              />
              <span className="text-xs text-slate-200 leading-snug">
                <strong className="text-amber-200">Comprobante interno (sin CAE AFIP)</strong>
                <span className="block text-slate-400 mt-0.5">
                  Registrá el cobro con factura de gestión del taller, sin conectar con ARCA. Solo disponible si el dueño lo
                  habilitó en Ajustes.
                </span>
              </span>
            </label>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving || !canConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C518] py-3 text-sm font-bold text-[#0D1117] disabled:opacity-50 hover:bg-[#D4A915] transition-colors"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Procesando cobro…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Confirmar cobro</>
            )}
          </button>
          {saving && processingHint ? (
            <p className="mt-2 text-center text-[11px] text-slate-500 leading-snug">{processingHint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
