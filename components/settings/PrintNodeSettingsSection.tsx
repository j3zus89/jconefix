'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchQzPrinterNames } from '@/lib/qz-tray-printers';
import { humanizeShopPrinterNodesError } from '@/lib/supabase-setup-hints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type PrinterTypeKey = 'thermal_80' | 'thermal_58' | 'laser' | 'other';

const PRINTER_TYPE_LABELS: Record<PrinterTypeKey, string> = {
  thermal_80: 'Térmica 80mm',
  thermal_58: 'Térmica 58mm',
  laser: 'Láser',
  other: 'Otra',
};

/** Una línea en pantalla; el toast al pulsar «Actualizar estado» lleva el detalle completo. */
const QZ_UNAVAILABLE_INLINE =
  'Sin conexión con QZ Tray. Revisá «Bandeja QZ» en ajustes (puerto y WSS) o instalá desde qz.io.';

type Row = {
  id: string;
  organization_id: string;
  name: string;
  printer_type: string;
  qz_printer_name: string | null;
  sort_order: number;
};

type QzConnect = {
  port: number;
  usingSecure: boolean;
  certificatePem: string | null;
};

type Props = {
  organizationId: string | null;
  qzConnect: QzConnect;
};

function normalizeType(t: string): PrinterTypeKey {
  if (t === 'thermal_58' || t === 'laser' || t === 'other') return t;
  return 'thermal_80';
}

function labelForType(t: string): string {
  const k = normalizeType(t);
  return PRINTER_TYPE_LABELS[k];
}

export function PrintNodeSettingsSection({ organizationId, qzConnect }: Props) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  /** Nombres devueltos por QZ en la última comprobación exitosa; null = aún no hubo éxito */
  const [qzNames, setQzNames] = useState<string[] | null>(null);
  const [qzScanError, setQzScanError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    printer_type: 'thermal_80' as PrinterTypeKey,
    qz_printer_name: '',
  });

  const load = useCallback(async () => {
    if (!organizationId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('shop_printer_nodes')
      .select('id, organization_id, name, printer_type, qz_printer_name, sort_order')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error(humanizeShopPrinterNodesError(error.message));
      return;
    }
    setRows((data || []) as Row[]);
  }, [organizationId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshQzStatus = async (silent: boolean) => {
    setRefreshing(true);
    setQzScanError(null);
    try {
      const r = await fetchQzPrinterNames(qzConnect);
      if (!r.ok) {
        setQzNames(null);
        setQzScanError(QZ_UNAVAILABLE_INLINE);
        if (!silent) {
          toast.error(r.message || 'No se pudo conectar a QZ Tray');
        }
        return;
      }
      setQzNames(r.names);
      if (!silent) {
        toast.success(
          r.names.length
            ? `${r.names.length} impresora(s) detectada(s) en este equipo`
            : 'QZ Tray conectado; no hay impresoras en el sistema'
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    void refreshQzStatus(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sondeo inicial silencioso
  }, [organizationId, qzConnect.port, qzConnect.usingSecure, qzConnect.certificatePem]);

  const resolveStatus = (row: Row): 'online' | 'offline' | 'unknown' => {
    if (qzNames === null) return 'unknown';
    const link = row.qz_printer_name?.trim();
    if (!link) return 'unknown';
    const low = link.toLowerCase();
    const hit = qzNames.some((n) => n.trim().toLowerCase() === low);
    return hit ? 'online' : 'offline';
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', printer_type: 'thermal_80', qz_printer_name: '' });
    setDialogOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    setForm({
      name: row.name,
      printer_type: normalizeType(row.printer_type),
      qz_printer_name: row.qz_printer_name?.trim() ?? '',
    });
    setDialogOpen(true);
  };

  const saveRow = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!organizationId) return;
    setSaving(true);
    try {
      const qzName = form.qz_printer_name.trim() || null;
      if (editing) {
        const { error } = await supabase
          .from('shop_printer_nodes')
          .update({
            name,
            printer_type: form.printer_type,
            qz_printer_name: qzName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id)
          .eq('organization_id', organizationId);
        if (error) throw new Error(humanizeShopPrinterNodesError(error.message));
        toast.success('Impresora actualizada');
      } else {
        const nextOrder =
          rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
        const { error } = await supabase.from('shop_printer_nodes').insert({
          organization_id: organizationId,
          name,
          printer_type: form.printer_type,
          qz_printer_name: qzName,
          sort_order: nextOrder,
        });
        if (error) throw new Error(humanizeShopPrinterNodesError(error.message));
        toast.success('Impresora creada');
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (row: Row) => {
    if (!organizationId) return;
    if (!window.confirm(`¿Eliminar «${row.name}»?`)) return;
    const { error } = await supabase
      .from('shop_printer_nodes')
      .delete()
      .eq('id', row.id)
      .eq('organization_id', organizationId);
    if (error) {
      toast.error(humanizeShopPrinterNodesError(error.message));
      return;
    }
    toast.success('Impresora eliminada');
    await load();
  };

  if (!organizationId) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Nodo de impresión</h1>
        <p className="text-sm text-gray-500">
          No hay organización activa. No se pueden gestionar impresoras del taller.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Nodo de impresión</h1>
      <p className="text-sm text-gray-500 mb-4">
        Configura impresoras de red y tickets de caja. El estado en vivo depende de QZ Tray y del
        nombre exacto de la impresora en el sistema.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          type="button"
          size="sm"
          className="gap-2 bg-[#0f766e] text-white hover:bg-[#115e59]"
          onClick={() => void refreshQzStatus(false)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualizar estado (QZ)
        </Button>
        {qzScanError ? (
          <p className="text-xs text-gray-600 max-w-xl leading-snug">{qzScanError}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
          <h2 className="text-sm font-semibold text-gray-800">Impresoras configuradas</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-4 py-8 flex justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No hay impresoras. Agregá la térmica de tickets o la A4 con el botón de abajo.
            </div>
          ) : (
            rows.map((row) => {
              const st = resolveStatus(row);
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full shrink-0',
                        st === 'online'
                          ? 'bg-[#F5C518]'
                          : st === 'offline'
                            ? 'bg-red-400'
                            : 'bg-gray-300'
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{row.name}</p>
                      <p className="text-xs text-gray-500">{labelForType(row.printer_type)}</p>
                      {row.qz_printer_name?.trim() ? (
                        <p className="text-[10px] text-gray-400 truncate font-mono">
                          QZ: {row.qz_printer_name}
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-700">Sin nombre QZ — no se puede comprobar estado</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                        st === 'online'
                          ? 'bg-green-100 text-green-700'
                          : st === 'offline'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {st === 'online'
                        ? 'En línea'
                        : st === 'offline'
                          ? 'Sin conexión'
                          : 'Sin comprobar'}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-400"
                      onClick={() => openEdit(row)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                      onClick={() => void removeRow(row)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-gray-100">
          <Button
            type="button"
            className="bg-[#F5C518] hover:bg-[#D4A915] text-[#0D1117] text-white gap-2"
            onClick={openNew}
          >
            <Plus className="h-4 w-4" />
            Agregar impresora
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar impresora' : 'Nueva impresora'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pn-name">Nombre</Label>
              <Input
                id="pn-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Impresora principal"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.printer_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, printer_type: v as PrinterTypeKey }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRINTER_TYPE_LABELS) as PrinterTypeKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PRINTER_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pn-qz">Nombre en QZ Tray / sistema (opcional)</Label>
              <Input
                id="pn-qz"
                value={form.qz_printer_name}
                onChange={(e) => setForm((f) => ({ ...f, qz_printer_name: e.target.value }))}
                placeholder="Debe coincidir exactamente con la lista de QZ"
                list="qz-printer-suggestions"
              />
              <datalist id="qz-printer-suggestions">
                {(qzNames ?? []).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {qzNames && qzNames.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {qzNames.slice(0, 8).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 truncate max-w-full"
                      onClick={() => setForm((f) => ({ ...f, qz_printer_name: n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" className="bg-[#0f766e] text-white hover:bg-[#115e59]" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#F5C518] hover:bg-[#D4A915] text-[#0D1117]"
              onClick={() => void saveRow()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
