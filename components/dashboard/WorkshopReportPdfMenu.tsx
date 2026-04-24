'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildWorkshopReportPayload } from '@/lib/build-workshop-report-payload';
import { downloadWorkshopReportPdf } from '@/lib/workshop-report-pdf';
import type { WorkshopReportKind } from '@/lib/workshop-report-period';
import { cn } from '@/lib/utils';

type Props = {
  shopName: string;
  /** Simbolo de moneda (ej. $ o €) */
  currencySymbol: string;
  /** Mas compacto en panel sencillo */
  compact?: boolean;
  className?: string;
};

const BTN_BASE =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50';

export function WorkshopReportPdfMenu({ shopName, currencySymbol, compact, className }: Props) {
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const run = async (kind: WorkshopReportKind, label: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const payload = await buildWorkshopReportPayload(supabase, kind, shopName, currencySymbol);
      await downloadWorkshopReportPdf(payload);
      toast.success(`Informe PDF (${label}) descargado`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo generar el informe';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className={cn(BTN_BASE, compact && 'py-1', className)}
          title="Descargar informe del taller en PDF"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-600" />
          ) : (
            <Download className="h-3.5 w-3.5 shrink-0 text-slate-700" />
          )}
          <span className="whitespace-nowrap">{compact ? 'Informe PDF' : 'Descargar informe'}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem disabled={busy} onClick={() => void run('week', 'última semana')}>
          Última semana
        </DropdownMenuItem>
        <DropdownMenuItem disabled={busy} onClick={() => void run('month', 'este mes')}>
          Este mes
        </DropdownMenuItem>
        <DropdownMenuItem disabled={busy} onClick={() => void run('30d', 'últimos 30 días')}>
          Últimos 30 días
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
