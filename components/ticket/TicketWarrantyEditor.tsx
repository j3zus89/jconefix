'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  addWarrantyPeriodToStart,
  computeWarrantyBadge,
  formatWarrantyDateEs,
  localDateString,
  warrantyMonthsBetween,
} from '@/lib/warranty-period';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const REPAIRED_STATUSES = new Set(['reparado', 'completed', 'repaired_collected']);

export type WarrantyPatch = {
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  warranty_info: string | null;
};

type Props = {
  ticketId: string;
  status: string;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  warranty_info?: string | null;
  onPatch: (patch: WarrantyPatch) => void;
  /** En el panel del ticket: arranca plegado para dejar visible facturación/cobro sin scroll interno. */
  defaultCollapsed?: boolean;
};

export function TicketWarrantyEditor({
  ticketId,
  status,
  warranty_start_date,
  warranty_end_date,
  warranty_info,
  onPatch,
  defaultCollapsed = false,
}: Props) {
  const supabase = createClient();
  const canEdit = REPAIRED_STATUSES.has(status);
  const useCollapsedChrome = Boolean(defaultCollapsed) && canEdit;

  const [offer, setOffer] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(!useCollapsedChrome);

  useEffect(() => {
    setEditorExpanded(!useCollapsedChrome);
  }, [ticketId, useCollapsedChrome]);

  useEffect(() => {
    const ws = warranty_start_date ? String(warranty_start_date).slice(0, 10) : '';
    const we = warranty_end_date ? String(warranty_end_date).slice(0, 10) : '';
    const info = (warranty_info || '').trim();
    const active = !(info === 'Sin garantía' && !ws && !we);
    setOffer(active);
    setStart(ws || localDateString());
    setEnd(we);
  }, [ticketId, warranty_start_date, warranty_end_date, warranty_info]);

  const previewBadge = computeWarrantyBadge({
    warranty_start_date: offer && start ? start : warranty_start_date,
    warranty_end_date: offer && end ? end : warranty_end_date,
    warranty_info: offer ? 'En garantía' : warranty_info,
  });

  const persist = useCallback(
    async (patch: WarrantyPatch) => {
      setSaving(true);
      try {
        const { error } = await supabase.from('repair_tickets').update(patch).eq('id', ticketId);
        if (error) throw error;
        onPatch(patch);
        toast.success('Garantía guardada');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'No se pudo guardar la garantía');
      } finally {
        setSaving(false);
      }
    },
    [supabase, ticketId, onPatch]
  );

  const handleOfferSwitch = async (checked: boolean) => {
    if (!checked) {
      setOffer(false);
      await persist({
        warranty_start_date: null,
        warranty_end_date: null,
        warranty_info: 'Sin garantía',
      });
      return;
    }
    const s = (start || localDateString()).trim();
    const defaultEnd = addWarrantyPeriodToStart(s, 3, 'months') || '';
    const e = end && end >= s ? end : defaultEnd;
    setOffer(true);
    setStart(s);
    setEnd(e);
    await persist({
      warranty_start_date: s,
      warranty_end_date: e,
      warranty_info: 'En garantía',
    });
  };

  const applyPresetMonths = (m: number) => {
    const base = (start || localDateString()).trim();
    const newEnd = addWarrantyPeriodToStart(base, m, 'months');
    if (newEnd) setEnd(newEnd);
  };

  const handleSaveAdjustments = () => {
    if (!offer) return;
    const s = start.trim();
    const e = end.trim();
    if (!s || !e) {
      toast.error('Completá fecha de inicio y fin');
      return;
    }
    if (e < s) {
      toast.error('La fecha fin no puede ser anterior al inicio');
      return;
    }
    void persist({
      warranty_start_date: s,
      warranty_end_date: e,
      warranty_info: 'En garantía',
    });
  };

  const monthsHint =
    offer && start && end && end >= start ? warrantyMonthsBetween(start, end) : null;

  const dispStart =
    offer && start
      ? start
      : warranty_start_date
        ? String(warranty_start_date).slice(0, 10)
        : '';
  const dispEnd =
    offer && end
      ? end
      : warranty_end_date
        ? String(warranty_end_date).slice(0, 10)
        : '';
  const dispInfo = offer ? 'En garantía' : warranty_info?.trim() || 'Sin garantía';

  if (useCollapsedChrome && !editorExpanded) {
    return (
      <div className="border-b border-gray-200">
        <button
          type="button"
          onClick={() => setEditorExpanded(true)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/90"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800">Garantía comercial</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium',
                  previewBadge.badgeClass
                )}
              >
                {previewBadge.label}
              </span>
              {dispStart && dispEnd ? (
                <span className="text-[10px] text-gray-500">
                  {formatWarrantyDateEs(dispStart)} → {formatWarrantyDateEs(dispEnd)}
                </span>
              ) : (
                <span className="text-[10px] text-gray-500">Plazos y fechas</span>
              )}
            </div>
            <p className="mt-1 text-[10px] font-medium text-[#F5C518]">Tocá para abrir y editar</p>
          </div>
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-800">
          <Shield className="h-4 w-4 shrink-0 text-gray-500" />
          Garantía comercial
        </div>
        {useCollapsedChrome ? (
          <button
            type="button"
            onClick={() => setEditorExpanded(false)}
            className="shrink-0 text-[11px] font-medium text-[#F5C518] hover:underline"
          >
            Ocultar
          </button>
        ) : null}
      </div>
      {!canEdit ? (
        <div className="px-4 pb-2">
          <p className="text-[10px] leading-snug text-gray-500">
            Cuando el equipo esté en <span className="font-medium">Reparado</span> podés activar la garantía y elegir
            el plazo (1, 3 o 6 meses o fechas a medida). Eso se verá en la factura y en el ticket impreso.
          </p>
        </div>
      ) : null}
      <div className="px-4 pb-4 space-y-3 text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Estado</span>
          <span
            className={cn(
              'inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium',
              previewBadge.badgeClass
            )}
          >
            {previewBadge.label}
          </span>
          {previewBadge.detail ? (
            <span className="text-[11px] text-gray-500">{previewBadge.detail}</span>
          ) : null}
        </div>

        {canEdit ? (
          <div className="rounded-md border border-gray-200 bg-gray-50/80 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-gray-800">Garantía para el cliente</span>
              <Switch
                checked={offer}
                onCheckedChange={(v) => void handleOfferSwitch(Boolean(v))}
                disabled={saving}
                aria-label="Activar o desactivar garantía"
              />
            </div>
            {offer ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-gray-500 w-full">Plazo rápido (desde inicio)</span>
                  {([1, 3, 6] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => applyPresetMonths(m)}
                      disabled={saving}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-gray-300 text-gray-800 hover:border-[#F5C518] hover:text-[#F5C518] disabled:opacity-50"
                    >
                      {m} mes{m !== 1 ? 'es' : ''}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Inicio</label>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      disabled={saving}
                      className="w-full h-8 text-[11px] rounded border border-gray-300 px-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Fin</label>
                    <input
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      disabled={saving}
                      className="w-full h-8 text-[11px] rounded border border-gray-300 px-1.5 bg-white"
                    />
                  </div>
                </div>
                {monthsHint != null ? (
                  <p className="text-[10px] text-gray-600">
                    Período: <span className="font-medium">{monthsHint}</span> mes{monthsHint !== 1 ? 'es' : ''}{' '}
                    calendario
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="w-full h-8 text-xs bg-[#F5C518] hover:bg-[#D4A915] text-[#0D1117]"
                  onClick={handleSaveAdjustments}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar fechas'}
                </Button>
              </>
            ) : (
              <p className="text-[10px] text-gray-500 leading-snug">
                Sin garantía comercial en esta orden. Activá el interruptor para registrar plazo y que figure en
                factura / ticket.
              </p>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-gray-500 block mb-0.5">Inicio</span>
            <span className="font-medium text-gray-900">
              {dispStart ? formatWarrantyDateEs(dispStart) : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block mb-0.5">Fin</span>
            <span className="font-medium text-gray-900">
              {dispEnd ? formatWarrantyDateEs(dispEnd) : '—'}
            </span>
          </div>
        </div>
        <div>
          <span className="text-[10px] font-medium text-gray-500 block mb-0.5">Etiqueta</span>
          <span className="text-[11px] text-gray-800">{dispInfo}</span>
        </div>

        {!canEdit ? (
          <p className="text-[10px] text-gray-400 leading-snug border-t border-gray-100 pt-2">
            La factura puede completar fechas si aún no las definiste y no marcaste «sin garantía».
          </p>
        ) : null}

        <Link
          href="/dashboard/warranty"
          className="block text-center text-[11px] font-medium text-[#F5C518] hover:underline"
        >
          Ver listado de garantías
        </Link>
      </div>
    </div>
  );
}
