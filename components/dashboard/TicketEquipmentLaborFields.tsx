'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Wrench, X, Info } from 'lucide-react';
import { normalizeServiceDeviceCategory } from '@/lib/repair-service-device-catalog';
import type { LaborCountryCode } from '@/lib/repair-labor-tariffs-2026';
import { expandLaborKeywordFragments, laborModelFilterOrPattern } from '@/lib/repair-labor-search';
import { sanitizeLaborIlikeFragment, type IntakeLaborServicePick } from '@/lib/ticket-intake-labor-part';
import { cn } from '@/lib/utils';

export type { IntakeLaborServicePick };

type Props = {
  supabase: SupabaseClient;
  organizationId: string | null;
  laborCountry: LaborCountryCode;
  deviceCategory: string;
  deviceBrand: string;
  deviceModel: string;
  currencySymbol: string;
  selectedLabor: IntakeLaborServicePick | null;
  onLaborChange: (row: IntakeLaborServicePick | null) => void;
  servicePriceInput: string;
  onServicePriceChange: (v: string) => void;
};

/**
 * Servicio del tarifario importado + precio editable, en la sección Equipo.
 */
export function TicketEquipmentLaborFields({
  supabase,
  organizationId,
  laborCountry,
  deviceCategory,
  deviceBrand,
  deviceModel,
  currencySymbol,
  selectedLabor,
  onLaborChange,
  servicePriceInput,
  onServicePriceChange,
}: Props) {
  const [laborQuery, setLaborQuery] = useState('');
  const [laborOpen, setLaborOpen] = useState(false);
  const [laborLoading, setLaborLoading] = useState(false);
  const [laborMatches, setLaborMatches] = useState<IntakeLaborServicePick[]>([]);
  const laborComboRef = useRef<HTMLDivElement>(null);

  const canSearch = Boolean(deviceCategory.trim() && deviceBrand.trim());

  useEffect(() => {
    if (!laborOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (laborComboRef.current?.contains(e.target as Node)) return;
      setLaborOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [laborOpen]);

  const fetchLabor = useCallback(async () => {
    if (!canSearch) {
      setLaborMatches([]);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setLaborLoading(true);
    try {
      const cat = normalizeServiceDeviceCategory(deviceCategory);
      const b = sanitizeLaborIlikeFragment(deviceBrand);
      const m = sanitizeLaborIlikeFragment(deviceModel);
      const kw = sanitizeLaborIlikeFragment(laborQuery);

      let q = (supabase as any)
        .from('repair_labor_services')
        .select('id, service_name, price, model')
        .eq('country_code', laborCountry)
        .limit(150);

      if (organizationId) q = q.eq('organization_id', organizationId);
      else q = q.eq('user_id', user.id);

      const c = sanitizeLaborIlikeFragment(cat);
      if (c) q = q.ilike('category', `%${c}%`);
      if (b) q = q.ilike('brand', `%${b}%`);
      if (m) q = q.or(laborModelFilterOrPattern(deviceModel));

      if (kw) {
        const variants = expandLaborKeywordFragments(kw);
        const orParts: string[] = [];
        for (const fragment of variants) {
          const s = sanitizeLaborIlikeFragment(fragment);
          if (!s) continue;
          orParts.push(`service_name.ilike.%${s}%`);
        }
        if (orParts.length) q = q.or(orParts.join(','));
      }

      const { data, error } = await q.order('service_name', { ascending: true });
      if (error) {
        console.error(error);
        setLaborMatches([]);
        return;
      }
      setLaborMatches(
        (data || []).map((row: { id: string; service_name: string; price: number; model?: string | null }) => ({
          id: row.id,
          service_name: row.service_name,
          price: Number(row.price) || 0,
          model: row.model,
        }))
      );
    } finally {
      setLaborLoading(false);
    }
  }, [
    supabase,
    organizationId,
    laborCountry,
    deviceCategory,
    deviceBrand,
    deviceModel,
    laborQuery,
    canSearch,
  ]);

  useEffect(() => {
    if (!canSearch) {
      setLaborMatches([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetchLabor();
    }, 320);
    return () => window.clearTimeout(t);
  }, [canSearch, fetchLabor]);

  useEffect(() => {
    if (selectedLabor) setLaborQuery(selectedLabor.service_name);
  }, [selectedLabor]);

  return (
    <div className="col-span-2">
      <div className="rounded-lg border border-teal-200/90 bg-gradient-to-b from-teal-50/80 via-white to-white p-3 shadow-sm ring-1 ring-teal-900/5 sm:rounded-xl sm:p-4">
        <div className="mb-2 flex gap-2 sm:mb-3 sm:gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm sm:h-9 sm:w-9"
            aria-hidden
          >
            <Wrench className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold tracking-tight text-teal-950 sm:text-sm">Servicio y precio</h3>
            <p className="mt-0.5 text-[10px] leading-snug text-teal-900/65 sm:text-[11px]">
              Tarifario (Inventario → Servicio de reparación). Se sincroniza con el coste estimado.
            </p>
          </div>
        </div>

        {!canSearch ? (
          <div
            className="mb-2 flex gap-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-2.5 py-2 text-[11px] text-amber-950 sm:mb-3 sm:gap-2.5 sm:px-3 sm:py-2.5 sm:text-xs"
            role="status"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" aria-hidden />
            <p>
              <span className="font-semibold">Paso previo:</span> elige{' '}
              <span className="font-medium">categoría</span> y <span className="font-medium">marca</span> para buscar
              servicios con precio.
            </p>
          </div>
        ) : (
          <div className="mb-2 flex gap-1.5 rounded-lg border border-teal-100 bg-teal-50/50 px-2.5 py-1.5 text-[10px] leading-relaxed text-teal-900/75 sm:mb-3 sm:gap-2 sm:px-3 sm:py-2 sm:text-[11px]">
            <Search className="mt-0.5 h-3 w-3 shrink-0 text-teal-600 sm:h-3.5 sm:w-3.5" aria-hidden />
            <p>
              Filtra por texto. Con <span className="font-medium">modelo</span>, se priorizan coincidencias de ese modelo.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div ref={laborComboRef} className="relative min-w-0 space-y-1.5">
            <Label htmlFor="equipment-labor-search" className="text-xs font-medium text-gray-700">
              Servicio
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-teal-600/50" />
              <input
                id="equipment-labor-search"
                disabled={!canSearch}
                autoComplete="off"
                className={cn(
                  'h-9 w-full rounded-md border py-2 pl-9 pr-9 text-sm transition-colors',
                  'border-teal-200/80 bg-white text-gray-900 placeholder:text-gray-400',
                  'focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25',
                  'disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400'
                )}
                placeholder={canSearch ? 'Buscar pantalla, batería…' : '—'}
                value={laborQuery}
                onChange={(e) => {
                  setLaborQuery(e.target.value);
                  setLaborOpen(true);
                  if (selectedLabor && e.target.value !== selectedLabor.service_name) {
                    onLaborChange(null);
                  }
                }}
                onFocus={() => canSearch && setLaborOpen(true)}
              />
              {laborLoading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-teal-600/60" />
              )}

              {laborOpen && canSearch && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-52 overflow-y-auto rounded-lg border border-teal-100 bg-white py-0.5 shadow-lg shadow-teal-900/10">
                  {laborMatches.length === 0 && !laborLoading ? (
                    <div className="px-3 py-3 text-center text-xs text-gray-500">
                      Sin coincidencias. Revisa el modelo o el catálogo en Inventario → Servicio de reparación.
                    </div>
                  ) : (
                    laborMatches.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onLaborChange(row);
                          onServicePriceChange(row.price.toFixed(2));
                          setLaborOpen(false);
                        }}
                        className={cn(
                          'flex w-full flex-col gap-0.5 border-b border-gray-50 px-3 py-2.5 text-left text-xs transition-colors last:border-0',
                          'hover:bg-teal-50/90 focus:bg-teal-50/90 focus:outline-none'
                        )}
                      >
                        <span className="font-medium text-gray-900">{row.service_name}</span>
                        <span className="tabular-nums text-teal-800/90">
                          {currencySymbol}
                          {row.price.toFixed(2)}
                          {row.model ? (
                            <span className="font-normal text-gray-500"> · {row.model}</span>
                          ) : null}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedLabor ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-950">
                  <span className="truncate">{selectedLabor.service_name}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px] text-teal-800 hover:bg-teal-100/80 hover:text-teal-950"
                  onClick={() => {
                    onLaborChange(null);
                    setLaborQuery('');
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Quitar
                </Button>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="equipment-labor-price" className="text-xs font-medium text-gray-700">
              Precio ({currencySymbol})
            </Label>
            <Input
              id="equipment-labor-price"
              className="h-9 border-teal-200/80 tabular-nums focus-visible:border-teal-500 focus-visible:ring-teal-500/25"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={servicePriceInput}
              onChange={(e) => onServicePriceChange(e.target.value)}
            />
            <p className="text-[10px] leading-snug text-gray-500">
              Editable tras elegir servicio. Equivale al <span className="font-medium text-gray-600">coste estimado</span>{' '}
              en Facturación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
