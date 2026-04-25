'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Search, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { normalizeBoletoSearchInput } from '@/lib/ticket-warranty-reintake';
import { repairCaseTerms } from '@/lib/locale';
import { cn } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';

export type RelatedTicketPick = {
  id: string;
  ticket_number: string;
  status: string;
  customer_id: string;
  created_at: string;
  device_type: string;
  device_brand: string | null;
  device_category: string | null;
  device_model: string | null;
  serial_number: string | null;
  imei: string | null;
};

async function findRelatedTickets(
  supabase: SupabaseClient,
  orgId: string,
  raw: string
): Promise<RelatedTicketPick[]> {
  const q = raw.trim();
  if (!q) return [];
  const n = normalizeBoletoSearchInput(q);
  const variants = Array.from(
    new Set(
      [q, n, n ? `T-${n}` : '', n ? `t-${n}` : '']
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );

  const sel =
    'id, ticket_number, status, customer_id, created_at, device_type, device_brand, device_category, device_model, serial_number, imei';

  for (const v of variants) {
    const { data: row, error } = await supabase
      .from('repair_tickets')
      .select(sel)
      .eq('organization_id', orgId)
      .eq('ticket_number', v)
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error al buscar');
    if (row) return [row as RelatedTicketPick];
  }

  const safe = n.replace(/%/g, '').slice(0, 40);
  if (!safe) return [];

  const { data: fuzzy, error: fzErr } = await supabase
    .from('repair_tickets')
    .select(sel)
    .eq('organization_id', orgId)
    .ilike('ticket_number', `%${safe}%`)
    .order('created_at', { ascending: false })
    .limit(8);

  if (fzErr) throw new Error(fzErr.message || 'Error al buscar');
  return (fuzzy || []) as RelatedTicketPick[];
}

type Props = {
  supabase: SupabaseClient;
  organizationId: string;
  selectedCustomerId: string | null;
  linked: RelatedTicketPick | null;
  onLinkedChange: (row: RelatedTicketPick | null) => void;
  onCopyDeviceFrom: (row: RelatedTicketPick) => void;
  className?: string;
  isArgentina: boolean;
};

export function WarrantyReintakeCard({
  supabase,
  organizationId,
  selectedCustomerId,
  linked,
  onLinkedChange,
  onCopyDeviceFrom,
  className,
  isArgentina,
}: Props) {
  const rtc = repairCaseTerms(isArgentina);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<RelatedTicketPick[]>([]);

  const runSearch = async () => {
    setSearching(true);
    setCandidates([]);
    try {
      const rows = await findRelatedTickets(supabase, organizationId, query);
      if (rows.length === 0) {
        toast.message(rtc.warrantySearchNotFound);
        return;
      }
      if (rows.length === 1) {
        pick(rows[0]);
        toast.success(`Vinculado a #${rows[0].ticket_number}`);
        return;
      }
      setCandidates(rows);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al buscar');
    } finally {
      setSearching(false);
    }
  };

  const pick = (row: RelatedTicketPick) => {
    if (selectedCustomerId && row.customer_id !== selectedCustomerId) {
      toast.error(rtc.warrantyWrongCustomer);
      return;
    }
    onLinkedChange(row);
    setCandidates([]);
    setQuery(row.ticket_number);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/80 shadow-sm ring-1 ring-teal-900/[0.04]',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-teal-100/80 bg-teal-600/[0.07] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-gray-900">Reingreso, garantía o devolución</h2>
          <p className="text-[11px] leading-snug text-gray-600">{rtc.warrantyLinkSubtitle}</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {linked ? (
          <div className="flex flex-col gap-2 rounded-lg border border-teal-200 bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
                <span className="text-sm font-semibold text-gray-900">Vinculado a</span>
                <Link
                  href={`/dashboard/tickets/${linked.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-teal-700 underline-offset-2 hover:underline"
                >
                  #{linked.ticket_number}
                </Link>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                  {linked.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {isArgentina
                  ? 'Cliente de la orden anterior debe coincidir con el cliente seleccionado en este ingreso.'
                  : 'Cliente del ticket anterior debe coincidir con el cliente seleccionado en este ingreso.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-teal-200 text-xs"
                onClick={() => onCopyDeviceFrom(linked)}
              >
                Copiar datos del equipo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => {
                  onLinkedChange(null);
                  setQuery('');
                  setCandidates([]);
                }}
              >
                <Unlink className="mr-1 h-3.5 w-3.5" />
                Quitar vínculo
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Label className="text-xs font-medium text-gray-600">{rtc.warrantyPreviousNumberLabel}</Label>
                <Input
                  className="mt-1 h-9"
                  placeholder="Ej. T-1042 o 1042"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void runSearch();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-9 shrink-0 gap-1.5 bg-teal-700 text-white hover:bg-teal-800"
                disabled={searching || !query.trim()}
                onClick={() => void runSearch()}
              >
                {searching ? (
                  <span className="text-xs">Buscando…</span>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
            {candidates.length > 1 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2">
                <p className="mb-2 text-[11px] font-semibold text-amber-900">Varios resultados — elige uno:</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          pick(c);
                          toast.success(`Vinculado a #${c.ticket_number}`);
                        }}
                        className="flex w-full items-center justify-between rounded-md border border-amber-200/80 bg-white px-2 py-1.5 text-left text-xs hover:bg-amber-50"
                      >
                        <span className="font-semibold text-gray-900">#{c.ticket_number}</span>
                        <span className="text-gray-500">{c.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** Botón compacto en historial de IMEI/serie */
export function WarrantyLinkFromHistoryButton({
  ticketNumber,
  disabled,
  onClick,
}: {
  ticketNumber: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="ml-2 inline-flex items-center gap-1 rounded-md border border-teal-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-teal-800 shadow-sm hover:bg-teal-50 disabled:opacity-50"
    >
      <ShieldCheck className="h-3 w-3" />
      Garantía
    </button>
  );
}
