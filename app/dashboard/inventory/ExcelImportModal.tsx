'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Loader2, CheckCircle2, AlertCircle, HelpCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import {
  mapHeadersToSchema,
  confidenceColor,
  confidenceLabel,
  type ColumnMappingResult,
} from '@/lib/smart-import-mapper';
import { INVENTORY_SCHEMA } from '@/lib/import-schemas';
import { findInventoryHeaderRowIndex, isLikelyInventoryInstructionRow } from '@/lib/excel-export';
import { getActiveOrganizationId } from '@/lib/dashboard-org';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function readFileAsBinaryString(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Error al leer el archivo'));
    reader.readAsBinaryString(f);
  });
}

function ConfidenceBadge({ result }: { result: ColumnMappingResult }) {
  if (!result.best) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border text-gray-400 bg-gray-50 border-gray-200">
        <HelpCircle className="h-3 w-3" />
        Sin detectar
      </span>
    );
  }
  const c = result.best.confidence;
  const colors = confidenceColor(c);
  const label = confidenceLabel(c);
  const Icon = c === 'certain' ? CheckCircle2 : c === 'probable' ? CheckCircle2 : AlertCircle;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border', colors)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

/* ─── Componente principal ────────────────────────────────────────────── */

function ExcelImportModal({
  isOpen,
  onClose,
  onImport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<unknown[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerRowIdx, setHeaderRowIdx] = useState(0);

  // Resultado completo del motor de mapeo
  const [mappingResults, setMappingResults] = useState<ColumnMappingResult[]>([]);
  // Mapeo editable por el usuario: field → colIndex (-1 = no mapear)
  const [userMapping, setUserMapping] = useState<Record<string, number>>({});

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, errors: 0 });

  /* ─── Lectura y detección automática ─────────────────────────────── */

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];

        if (!jsonData.length) { toast.error('El archivo está vacío'); return; }

        const hIdx = findInventoryHeaderRowIndex(jsonData);
        const rawHeaders = (jsonData[hIdx] ?? []).map((c) => (c == null ? '' : String(c)));
        const dataRows = jsonData.slice(hIdx + 1);

        if (hIdx > 0) {
          toast.message(`Cabeceras detectadas en la fila ${hIdx + 1} — se ignoraron filas de instrucciones.`);
        }

        // ── Motor ETL inteligente ──────────────────────────────────────
        const results = mapHeadersToSchema(rawHeaders, dataRows, INVENTORY_SCHEMA);

        // Inicializar userMapping con el mejor campo detectado
        const initMapping: Record<string, number> = {};
        for (const r of results) {
          if (r.best && r.best.confidence !== 'none') {
            // Puede que ya haya otro col con el mismo field y mayor score;
            // mapHeadersToSchema resuelve conflictos, así que r.best ya es el ganador.
            initMapping[r.best.field] = r.colIndex;
          }
        }

        setHeaders(rawHeaders);
        setHeaderRowIdx(hIdx);
        setPreviewData(dataRows.slice(0, 6));
        setMappingResults(results);
        setUserMapping(initMapping);
        setStep('mapping');
      } catch {
        toast.error('Error al leer el archivo. Asegúrate de que es un Excel (.xlsx o .xls) válido.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  /* ─── Importación ─────────────────────────────────────────────────── */

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setImportStats({ success: 0, errors: 0 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Debes iniciar sesión'); return; }
      const orgId = await getActiveOrganizationId(supabase);

      const binary = await readFileAsBinaryString(file);
      const workbook = XLSX.read(binary, { type: 'binary' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];

      const productsToInsert: Record<string, unknown>[] = [];
      let successCount = 0;
      let errorCount = 0;

      const flushBatch = async () => {
        if (!productsToInsert.length) return;
        const batch = [...productsToInsert];
        productsToInsert.length = 0;
        const { error } = await (supabase as unknown as { from: (t: string) => { insert: (d: unknown[]) => Promise<{ error: unknown }> } })
          .from('products').insert(batch);
        if (error) { errorCount += batch.length; }
        else { successCount += batch.length; }
      };

      for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row?.length || row.every((c) => c == null || String(c).trim() === '')) continue;
        if (isLikelyInventoryInstructionRow(row, headers.length)) continue;

        const product: Record<string, unknown> = {
          user_id: user.id,
          organization_id: orgId,
          product_id: Math.floor(Math.random() * 1_000_000).toString(),
        };

        for (const [field, colIdx] of Object.entries(userMapping)) {
          if (colIdx < 0) continue;
          let value: unknown = (row as unknown[])[colIdx];
          if (['quantity', 'stock_warning', 'reorder_level'].includes(field)) {
            value = parseInt(String(value ?? ''), 10) || 0;
          } else if (['price', 'unit_cost'].includes(field)) {
            value = parseFloat(String(value ?? '').replace(',', '.')) || 0;
          } else if (value != null) {
            value = String(value).trim();
          }
          product[field] = value;
        }

        // Fallback de nombre
        if (!product.name) {
          const desc = String(product.description ?? '').trim();
          if (desc) product.name = desc.split(/\r?\n/)[0].slice(0, 200);
        }
        if (!product.name && product.brand && product.model) {
          product.name = `${product.brand} ${product.model}`;
        }
        if (!product.name && product.category) {
          product.name = product.category;
        }
        if (!product.name) continue;

        productsToInsert.push(product);
        if (productsToInsert.length >= 50) await flushBatch();
      }

      await flushBatch();
      setImportStats({ success: successCount, errors: errorCount });

      if (successCount > 0) {
        toast.success(`${successCount} productos importados${errorCount ? ` (${errorCount} errores)` : ''}`);
        onImport();
      } else {
        toast.error('No se importó ningún producto. Comprueba que la columna "Nombre" esté mapeada correctamente.');
      }
    } catch (error: unknown) {
      toast.error('Error: ' + (error instanceof Error ? error.message : 'desconocido'));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setHeaderRowIdx(0);
    setMappingResults([]);
    setUserMapping({});
    setStep('upload');
    setImportStats({ success: 0, errors: 0 });
  };

  // Columnas del Excel que el usuario puede seleccionar en los selects
  const excelColOptions = headers.map((h, i) => ({ label: h || `(col ${i + 1})`, index: i }));

  /* ─── Vista previa de datos con el mapeo actual ─────────────────── */
  const previewFieldKeys = INVENTORY_SCHEMA.filter((f) => userMapping[f.field] !== undefined)
    .slice(0, 6);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { reset(); onClose(); } }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#0d9488]" />
            Importar productos desde Excel / CSV
          </DialogTitle>
        </DialogHeader>

        {/* ── PASO 1: subir archivo ─────────────────────────────────── */}
        {step === 'upload' && (
          <div className="py-6 space-y-4">
            <label
              htmlFor="excel-upload"
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-[#0d9488] hover:bg-[#0d9488]/5 transition-all"
            >
              <Upload className="h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600 text-center">
                Arrastra tu archivo aquí o <span className="text-[#0d9488] font-medium">haz clic para seleccionar</span>
              </p>
              <p className="text-xs text-gray-400">Soporta .xlsx y .xls de cualquier software (Square, Shopify, Odoo, QuickBooks…)</p>
            </label>
            <Input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700 mb-1">¿Cómo funciona?</p>
              <p>1. El sistema detecta automáticamente la fila de encabezados (ignora filas de instrucciones).</p>
              <p>2. Mapea cada columna del Excel al campo correcto con nivel de confianza visible.</p>
              <p>3. Podés corregir el mapeo antes de importar — siempre ves los datos reales.</p>
              <p className="mt-2 text-gray-500">Compatible con exportaciones de: Square, Shopify, WooCommerce, Odoo, QuickBooks, VIAMOVIL, Allegra, Xero y Excel hecho a mano.</p>
            </div>
          </div>
        )}

        {/* ── PASO 2: mapeo con confianza ──────────────────────────── */}
        {step === 'mapping' && (
          <div className="py-2 space-y-4">
            {/* Resumen de detección */}
            <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border">
              <span>
                <strong>{headers.filter(Boolean).length}</strong> columnas detectadas en el Excel.{' '}
                <strong className="text-emerald-700">
                  {Object.values(userMapping).filter((v) => v >= 0).length}
                </strong>{' '}
                mapeadas automáticamente.
              </span>
              <span className="text-xs text-gray-400">Ajustá cualquier columna si es necesario.</span>
            </div>

            {/* Grid de mapeo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INVENTORY_SCHEMA.map((fieldDef) => {
                const detectedResult = mappingResults.find(
                  (r) => r.best?.field === fieldDef.field
                );
                const currentColIdx = userMapping[fieldDef.field] ?? -1;

                return (
                  <div key={fieldDef.field} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className={cn('text-xs font-medium', fieldDef.required ? 'text-red-600' : 'text-gray-700')}>
                        {fieldDef.label}
                        {fieldDef.required && <span className="ml-0.5 text-red-500">*</span>}
                      </Label>
                      {detectedResult && <ConfidenceBadge result={detectedResult} />}
                    </div>
                    <div className="relative">
                      <select
                        value={currentColIdx >= 0 ? currentColIdx : ''}
                        onChange={(e) => {
                          const idx = e.target.value === '' ? -1 : Number(e.target.value);
                          setUserMapping((prev) => ({ ...prev, [fieldDef.field]: idx }));
                        }}
                        className={cn(
                          'w-full h-9 pl-3 pr-8 border rounded text-sm appearance-none',
                          currentColIdx >= 0
                            ? detectedResult?.best?.confidence === 'certain'
                              ? 'border-emerald-400 bg-emerald-50'
                              : detectedResult?.best?.confidence === 'probable'
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-gray-300 bg-white'
                            : 'border-gray-300 bg-white text-gray-400'
                        )}
                      >
                        <option value="">— No importar —</option>
                        {excelColOptions.map((opt) => (
                          <option key={opt.index} value={opt.index}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    {/* Muestra muestra de dato real */}
                    {currentColIdx >= 0 && previewData[0] && (
                      <p className="text-xs text-gray-400 truncate pl-1">
                        Ej: <em>{String((previewData[0] as unknown[])[currentColIdx] ?? '—')}</em>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vista previa de filas */}
            {previewData.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Vista previa (primeras filas con el mapeo actual):</p>
                <div className="overflow-x-auto border rounded text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        {previewFieldKeys.map((f) => (
                          <th key={f.field} className="px-2 py-1.5 text-left font-medium text-gray-700 whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 4).map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {previewFieldKeys.map((f) => {
                            const colIdx = userMapping[f.field] ?? -1;
                            const val = colIdx >= 0 ? String((row as unknown[])[colIdx] ?? '') : '';
                            return (
                              <td key={f.field} className="px-2 py-1 text-gray-700 max-w-[150px] truncate" title={val}>
                                {val || <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>Volver</Button>
              <Button
                onClick={() => setStep('preview')}
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                disabled={!userMapping['name'] && userMapping['name'] !== 0}
              >
                Continuar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── PASO 3: confirmación e importación ───────────────────── */}
        {step === 'preview' && (
          <div className="py-4 space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Mapeo confirmado:</p>
              <ul className="space-y-0.5 text-xs">
                {INVENTORY_SCHEMA.filter((f) => (userMapping[f.field] ?? -1) >= 0).map((f) => {
                  const colIdx = userMapping[f.field]!;
                  return (
                    <li key={f.field} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0" />
                      <span className="font-medium">{f.label}</span>
                      <span className="text-blue-500">←</span>
                      <span className="italic">{headers[colIdx] || `col ${colIdx + 1}`}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {importStats.success > 0 && (
              <div className={cn(
                'rounded-lg p-4 border text-sm font-medium',
                importStats.errors === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              )}>
                ✅ {importStats.success} productos importados
                {importStats.errors > 0 && ` · ❌ ${importStats.errors} errores`}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')} disabled={importing}>Volver</Button>
              <Button
                onClick={handleImport}
                disabled={importing || (userMapping['name'] ?? -1) < 0}
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importando…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Importar productos</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ExcelImportModal };
