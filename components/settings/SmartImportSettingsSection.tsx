'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CUSTOMER_TARGET_FIELDS,
  TICKET_TARGET_FIELDS,
  type SmartImportMode,
  type TargetFieldId,
} from '@/lib/smart-import/constants';
import { excelColumnLabelEs } from '@/lib/smart-import/excel-header-display-es';
import type { ColumnMapping } from '@/lib/smart-import/apply-mapping';
import { canonicalizeColumnMapping, resolveHeaderColumnIndex } from '@/lib/smart-import/apply-mapping';
import type { PreviewRowResult } from '@/lib/smart-import/validate-rows';
import { getSettingsNavTrailForTab } from '@/lib/settings-nav-labels';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { AlertTriangle, CheckCircle2, ChevronRight, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EMPTY = '__none__';

function SmartImportNavBreadcrumb({
  isArgentina,
  className,
}: {
  isArgentina: boolean;
  className?: string;
}) {
  const trail = getSettingsNavTrailForTab('importar_excel', isArgentina);
  if (!trail) return null;
  const segments: string[] = ['Inicio', 'Ajustes'];
  if (trail.groupLabel) segments.push(trail.groupLabel);
  segments.push(trail.pageLabel);
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mb-1', className)}>
      {segments.map((seg, i) => (
        <Fragment key={`${i}-${seg}`}>
          {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0" aria-hidden /> : null}
          <span className={i === segments.length - 1 ? 'font-medium text-gray-800' : undefined}>{seg}</span>
        </Fragment>
      ))}
    </div>
  );
}

type AnalyzeResponse = {
  headers: string[];
  rows: string[][];
  suggestedMapping: Record<string, string | null>;
  rowCount: number;
  blankRowsSkipped?: number;
  physicalDataRowsInRange?: number;
  truncated: boolean;
  sheetName: string;
  mode: SmartImportMode;
};

export function SmartImportSettingsSection() {
  const loc = useOrgLocale();
  const [mode, setMode] = useState<SmartImportMode>('customers_and_tickets');
  const [busy, setBusy] = useState<'analyze' | 'preview' | 'commit' | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<PreviewRowResult[] | null>(null);
  const [lastSummary, setLastSummary] = useState<{
    customersCreated: number;
    customersReused: number;
    ticketsCreated: number;
    rowsProcessed: number;
    distinctCustomersInImport: number;
    rowErrors: { rowIndex: number; message: string }[];
  } | null>(null);
  const [fileImportStats, setFileImportStats] = useState<{
    physical: number;
    blank: number;
    withData: number;
  } | null>(null);

  const targetFields = useMemo(() => {
    const c = CUSTOMER_TARGET_FIELDS.map((f) => ({ ...f, group: 'Cliente' as const }));
    if (mode === 'customers_and_tickets') {
      return [...c, ...TICKET_TARGET_FIELDS.map((f) => ({ ...f, group: 'Boleto' as const }))];
    }
    return c;
  }, [mode]);

  const headerOptions = useMemo(() => {
    const h = headers.filter((x) => x.trim());
    return h;
  }, [headers]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      toast.error('Usa un archivo .xlsx o .xls');
      return;
    }
    setBusy('analyze');
    setPreview(null);
    setLastSummary(null);
    setFileImportStats(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('mode', mode);
      const res = await adminFetch('/api/dashboard/smart-import/analyze', { method: 'POST', body: fd });
      const json = (await res.json()) as AnalyzeResponse & { error?: string };
      if (!res.ok) {
        toast.error(json.error || 'No se pudo analizar el archivo');
        return;
      }
      setHeaders(json.headers);
      setRows(json.rows);
      const m: ColumnMapping = {};
      for (const [k, v] of Object.entries(json.suggestedMapping || {})) {
        m[k as TargetFieldId] = v;
      }
      setMapping(m);
      const blank = json.blankRowsSkipped ?? 0;
      const physical = json.physicalDataRowsInRange ?? json.rowCount + blank;
      setFileImportStats({ physical, blank, withData: json.rowCount });
      if (json.truncated) {
        toast.message(`Solo se importarán las primeras ${json.rows.length} filas con datos.`, {
          duration: 6000,
        });
      }
      if (blank > 0) {
        toast.message(
          `Bajo la cabecera hay ${physical} filas en Excel: ${blank} totalmente vacía${blank === 1 ? '' : 's'} (no entran) y ${json.rowCount} con datos.`,
          { duration: 7000 }
        );
      }
      toast.success(`Hoja «${json.sheetName || '1'}»: ${json.rowCount} fila${json.rowCount === 1 ? '' : 's'} con datos · revisá el mapeo.`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al subir el archivo');
    } finally {
      setBusy(null);
    }
  };

  /** Alinea mapeo con las cadenas exactas de `headers` (p. ej. Unicode NFC) y anula columnas irreconocibles. */
  useEffect(() => {
    if (!headers.length) return;
    setMapping((prev) => canonicalizeColumnMapping(headers, prev));
  }, [headers]);

  const buildPayload = useCallback(() => {
    const canon = canonicalizeColumnMapping(headers, mapping);
    const m: Record<string, string | null> = {};
    for (const f of targetFields) {
      const v = canon[f.id];
      if (!v || v === EMPTY || !String(v).trim()) {
        m[f.id] = null;
        continue;
      }
      m[f.id] = v;
    }
    return { mode, headers, rows, mapping: m };
  }, [mode, headers, rows, mapping, targetFields]);

  const runPreview = async () => {
    if (!rows.length) {
      toast.error('Primero selecciona un Excel.');
      return;
    }
    setBusy('preview');
    setLastSummary(null);
    try {
      const res = await adminFetch('/api/dashboard/smart-import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const json = (await res.json()) as {
        preview?: PreviewRowResult[];
        error?: string;
        totals?: { ok: boolean; errors: number };
      };
      if (!res.ok) {
        toast.error(json.error || 'Error en la validación');
        return;
      }
      setPreview(json.preview ?? []);
      if (json.totals?.errors) {
        toast.error(`Hay ${json.totals.errors} filas con errores. Corrige el Excel o el mapeo.`);
      } else {
        toast.success('Validación correcta. Podés importar.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error de red');
    } finally {
      setBusy(null);
    }
  };

  const runCommit = async () => {
    if (!rows.length) {
      toast.error('Primero selecciona un Excel.');
      return;
    }
    if (!preview || preview.some((p) => !p.ok)) {
      toast.error('Ejecuta «Validar» y resuelve los errores antes de importar.');
      return;
    }
    setBusy('commit');
    try {
      const res = await adminFetch('/api/dashboard/smart-import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const json = (await res.json()) as {
        summary?: {
          customersCreated: number;
          customersReused: number;
          ticketsCreated: number;
          rowsProcessed: number;
          distinctCustomersInImport?: number;
          rowErrors: { rowIndex: number; message: string }[];
        };
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || 'No se pudo importar');
        return;
      }
      const normalizedSummary = json.summary
        ? {
            ...json.summary,
            distinctCustomersInImport:
              json.summary.distinctCustomersInImport ?? json.summary.rowsProcessed,
          }
        : null;
      setLastSummary(normalizedSummary);
      const s = normalizedSummary;
      if (s) {
        const nuevo =
          s.customersCreated === 1
            ? '1 cliente nuevo'
            : `${s.customersCreated} clientes nuevos`;
        const reused =
          s.customersReused === 1
            ? '1 fila reutilizó un contacto existente'
            : `${s.customersReused} filas reutilizaron un contacto existente`;
        let doneMsg = `Listo: ${nuevo}, ${reused}`;
        if (s.distinctCustomersInImport < s.rowsProcessed) {
          doneMsg += `. En esta corrida hubo ${s.distinctCustomersInImport} contacto${
            s.distinctCustomersInImport === 1 ? '' : 's'
          } distinto${s.distinctCustomersInImport === 1 ? '' : 's'} para ${s.rowsProcessed} filas (varias filas compartieron el mismo cliente).`;
        }
        if (mode === 'customers_and_tickets') {
          doneMsg += ` ${s.ticketsCreated} órdenes/boletos creados.`;
        } else if (!doneMsg.endsWith('.')) {
          doneMsg += '.';
        }
        if (s.rowErrors?.length) {
          doneMsg += ` Atención: ${s.rowErrors.length} fila${s.rowErrors.length === 1 ? '' : 's'} con error (detalle en el resumen abajo).`;
          toast.warning(doneMsg, { duration: 12000 });
        } else {
          toast.success(doneMsg);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error de red');
    } finally {
      setBusy(null);
    }
  };

  const setMap = (id: TargetFieldId, headerVal: string) => {
    setMapping((prev) => ({
      ...prev,
      [id]: headerVal === EMPTY ? null : headerVal,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-6">
      <SmartImportNavBreadcrumb isArgentina={loc.isAR} className="mb-4" />

      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Importar desde Excel</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pensado para migrar desde otro panel o planilla: podés traer <strong className="text-gray-700">clientes</strong>{' '}
            y, en el mismo archivo, las <strong className="text-gray-700">órdenes / boletos históricos</strong> (una fila =
            un cliente y un trabajo). Primera hoja, fila 1 = cabeceras; filas totalmente vacías se ignoran. Hasta 1000
            filas.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">1. Qué importar</h2>
          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              setMode(v as SmartImportMode);
              setHeaders([]);
              setRows([]);
              setMapping({});
              setPreview(null);
              setLastSummary(null);
              setFileImportStats(null);
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
              <RadioGroupItem value="customers_and_tickets" id="m2" className="mt-0.5" />
              <span>
                <span className="font-medium text-gray-900">Clientes y órdenes de trabajo (recomendado al migrar)</span>
                <span className="block text-gray-500 mt-0.5">
                  Cada fila crea o reutiliza el cliente y, si hay descripción del problema, un boleto con número histórico,
                  equipo, costos y estado según tus columnas.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
              <RadioGroupItem value="customers_only" id="m1" className="mt-0.5" />
              <span>
                <span className="font-medium text-gray-900">Solo clientes</span>
                <span className="block text-gray-500 mt-0.5">Lista de contactos sin crear boletos (importación más simple).</span>
              </span>
            </label>
          </RadioGroup>

          <div>
            <Label className="text-xs text-gray-600">Archivo Excel</Label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button type="button" className="relative bg-[#0f766e] text-white hover:bg-[#115e59]" disabled={busy === 'analyze'}>
                {busy === 'analyze' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Elegir archivo…'
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  disabled={!!busy}
                  onChange={onFile}
                />
              </Button>
              {rows.length > 0 && (
                <span className="text-sm text-gray-600">
                  {rows.length} fila{rows.length === 1 ? '' : 's'} con datos
                </span>
              )}
            </div>
            {fileImportStats && fileImportStats.physical > 0 && (
              <p className="text-xs text-gray-600 mt-2 max-w-xl leading-relaxed">
                En el rango de la hoja, bajo la cabecera, Excel tiene{' '}
                <strong className="text-gray-800">{fileImportStats.physical}</strong> fila
                {fileImportStats.physical === 1 ? '' : 's'}. De esas,{' '}
                <strong className="text-gray-800">{fileImportStats.blank}</strong> están totalmente vacías y{' '}
                <strong className="text-gray-800">no se importan</strong>. Quedan{' '}
                <strong className="text-gray-800">{fileImportStats.withData}</strong> fila
                {fileImportStats.withData === 1 ? '' : 's'} para validar e importar (si tu tabla tenía 25 filas y acá ves 22,
                casi seguro hay 3 filas vacías o solo con formato).
              </p>
            )}
          </div>
        </section>

        {headerOptions.length > 0 && (
          <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">2. Mapeo de columnas</h2>
            <p className="text-xs text-gray-500">
              Asociá cada campo del sistema con una columna del Excel. El asistente sugiere mapeos según cabeceras típicas
              de taller (cliente, teléfono, orden de trabajo, IMEI, estado, costos, etc.); corregí lo que haga falta.
            </p>
            {mode === 'customers_and_tickets' && (
              <p className="text-xs rounded-md border border-sky-100 bg-sky-50/80 text-sky-950 px-3 py-2">
                Si una fila trae datos de la orden (número, marca, IMEI, etc.), tenés que mapear también la{' '}
                <strong>descripción del problema / trabajo</strong>; si no, la validación la marcará. Las filas que solo
                tienen datos de cliente se importan sin boleto.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {targetFields.map((f) => {
                const current = mapping[f.id];
                const colIdx = current ? resolveHeaderColumnIndex(headers, current) : undefined;
                const val = colIdx !== undefined ? headers[colIdx]! : EMPTY;
                return (
                  <div key={f.id} className="space-y-1">
                    <Label className="text-xs text-gray-600">
                      {f.label}
                      {'required' in f && f.required ? ' *' : ''}
                      <span className="text-gray-400 font-normal"> · {f.group}</span>
                    </Label>
                    <Select value={val} onValueChange={(v) => setMap(f.id, v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="— No importar —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY}>— No importar —</SelectItem>
                        {headerOptions.map((h) => (
                          <SelectItem key={`${f.id}-${h}`} value={h}>
                            {excelColumnLabelEs(h)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="button" onClick={runPreview} disabled={!!busy}>
                {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar (vista previa)'}
              </Button>
              <Button
                type="button"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={runCommit}
                disabled={!!busy || !preview || preview.some((p) => !p.ok)}
              >
                {busy === 'commit' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Importar ahora'}
              </Button>
            </div>
          </section>
        )}

        {preview && preview.length > 0 && (
          <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">3. Resultado de la validación</h2>
            <div className="max-h-72 overflow-auto border border-gray-100 rounded-md text-xs">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Fila</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Resumen</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p) => (
                    <tr key={p.rowIndex} className="border-t border-gray-100">
                      <td className="p-2 align-top whitespace-nowrap">{p.rowIndex}</td>
                      <td className="p-2 align-top">
                        {p.ok ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )}
                      </td>
                      <td className="p-2 align-top">
                        <div className="text-gray-800">{p.summary}</div>
                        {!p.ok && (
                          <ul className="text-red-600 mt-1 list-disc pl-4">
                            {p.errors.map((er, i) => (
                              <li key={i}>{er}</li>
                            ))}
                          </ul>
                        )}
                        {p.warnings.length > 0 && (
                          <ul className="text-amber-700 mt-1 list-disc pl-4">
                            {p.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {lastSummary && (
          <section
            className={cn(
              'rounded-lg border p-5 space-y-2',
              lastSummary.rowErrors.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
            )}
          >
            <h2 className="text-sm font-semibold text-gray-900">Última importación</h2>
            <p className="text-xs text-gray-600">
              Filas procesadas en esta corrida:{' '}
              <strong>{lastSummary.rowsProcessed ?? '—'}</strong> (= filas con datos del archivo).
            </p>
            <p className="text-sm text-gray-700">
              Clientes nuevos: <strong>{lastSummary.customersCreated}</strong> · Filas que reutilizaron un contacto ya en la
              cuenta: <strong>{lastSummary.customersReused}</strong>
              {mode === 'customers_and_tickets' && (
                <>
                  {' '}
                  · Órdenes / boletos creados: <strong>{lastSummary.ticketsCreated}</strong>
                </>
              )}
            </p>
            <p className="text-xs text-gray-600">
              Contactos distintos tocados en esta importación:{' '}
              <strong>{lastSummary.distinctCustomersInImport}</strong>
              {lastSummary.distinctCustomersInImport < lastSummary.rowsProcessed && (
                <span className="text-amber-800">
                  {' '}
                  (menos que las {lastSummary.rowsProcessed} filas: varias filas apuntaron al mismo cliente por correo,
                  documento o teléfono con nombre suficientemente parecido).
                </span>
              )}
            </p>
            <p className="text-xs text-gray-600">
              <strong>Total en la lista</strong> no tiene por qué subir en una fila por cada fila del Excel: varias filas
              pueden actualizar o reutilizar la misma ficha. Si{' '}
              <code className="text-[11px] bg-white/60 px-1 rounded">contactos distintos &lt; filas procesadas</code>, es
              normal ver menos registros nuevos que filas importadas.
            </p>
            <p className="text-xs text-gray-600">
              Si esperabas más filas que las que dice el archivo al subirlo, revisá filas vacías en Excel o el rango de la
              hoja (solo cuenta la primera hoja).
            </p>
            {lastSummary.rowErrors.length > 0 && (
              <ul className="text-xs text-amber-900 list-disc pl-4">
                {lastSummary.rowErrors.map((e, i) => (
                  <li key={i}>
                    Fila {e.rowIndex}: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
