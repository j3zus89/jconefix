'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  ensureExpenseCategoriesSeeded,
  fetchExpenseCategoryNames,
} from '@/lib/expense-categories-api';
import {
  Plus,
  Trash2,
  Pencil,
  Receipt,
  TrendingDown,
  DollarSign,
  Loader,
  Upload,
  FileText,
  Download,
  X,
} from 'lucide-react';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSignedAttachmentUrls } from '@/lib/hooks/useSignedAttachmentUrls';

const STATIC_CATEGORIES_FALLBACK = [
  'Alquiler',
  'Suministros',
  'Repuestos',
  'Herramientas',
  'Marketing',
  'Salarios',
  'Seguros',
  'Software',
  'Transporte',
  'Otros',
];

const CATEGORY_COLORS: Record<string, string> = {
  Alquiler: 'bg-repairdesk-100 text-repairdesk-700',
  Suministros: 'bg-cyan-100 text-cyan-700',
  Repuestos: 'bg-orange-100 text-orange-700',
  Herramientas: 'bg-yellow-100 text-yellow-700',
  Marketing: 'bg-pink-100 text-pink-700',
  Salarios: 'bg-green-100 text-green-700',
  Seguros: 'bg-purple-100 text-purple-700',
  Software: 'bg-indigo-100 text-indigo-700',
  Transporte: 'bg-sky-100 text-sky-700',
  Otros: 'bg-gray-100 text-gray-600',
};

const CATEGORY_FALLBACK_PALETTE = [
  'bg-teal-100 text-teal-800',
  'bg-cyan-100 text-cyan-800',
  'bg-orange-100 text-orange-800',
  'bg-amber-100 text-amber-900',
  'bg-pink-100 text-pink-800',
  'bg-green-100 text-green-800',
  'bg-violet-100 text-violet-800',
  'bg-slate-100 text-slate-700',
];

const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_RECEIPT = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function categoryBadgeClass(cat: string): string {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = ((h << 5) - h + cat.charCodeAt(i)) | 0;
  return CATEGORY_FALLBACK_PALETTE[Math.abs(h) % CATEGORY_FALLBACK_PALETTE.length];
}

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  receipt_url?: string | null;
};

const DEFAULT_FORM = {
  title: '',
  amount: '',
  category: 'Otros',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  receipt_url: '' as string,
};

function monthPrefix(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`;
}

export default function ExpensesPage() {
  const loc = useOrgLocale();
  const sym = loc.symbol;
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>(STATIC_CATEGORIES_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [dragOver, setDragOver] = useState(false);

  const loadExpenses = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = await getActiveOrganizationId(supabase);
    let names = await fetchExpenseCategoryNames(supabase, orgId);
    if (orgId) {
      try {
        await ensureExpenseCategoriesSeeded(supabase, orgId);
        names = await fetchExpenseCategoryNames(supabase, orgId);
      } catch {
        /* tabla ausente o permisos */
      }
    }
    setCategories(names.length ? names : STATIC_CATEGORIES_FALLBACK);

    let q = (supabase as any).from('expenses').select('*').order('date', { ascending: false });
    if (orgId) q = q.eq('organization_id', orgId);
    else q = q.eq('user_id', user.id);
    const { data } = await q;
    setExpenses(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const categorySelectOptions = useMemo(() => {
    const o = [...categories];
    if (form.category && !o.includes(form.category)) o.unshift(form.category);
    return o;
  }, [categories, form.category]);

  const inSelectedMonth = useMemo(() => {
    const p = monthPrefix(filterYear, filterMonth);
    return expenses.filter((e) => e.date.startsWith(p));
  }, [expenses, filterYear, filterMonth]);

  const filtered =
    filterCat === 'all' ? inSelectedMonth : inSelectedMonth.filter((e) => e.category === filterCat);

  const monthTotal = useMemo(() => inSelectedMonth.reduce((s, e) => s + e.amount, 0), [inSelectedMonth]);
  const tableTotal = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const expenseReceiptEntries = useMemo(() => {
    const rows = filtered
      .filter((e) => e.receipt_url?.trim())
      .map((e) => ({ key: `row:${e.id}`, stored: e.receipt_url }));
    if (dialog && form.receipt_url?.trim()) {
      rows.push({ key: 'form:draft', stored: form.receipt_url });
    }
    return rows;
  }, [filtered, dialog, form.receipt_url]);
  const expenseReceiptSigned = useSignedAttachmentUrls(supabase, 'expense-receipts', expenseReceiptEntries);

  const uploadReceiptFile = async (file: File) => {
    if (!ALLOWED_RECEIPT.has(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Formato no admitido (PDF, JPG, PNG, WebP)');
      return;
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      toast.error('El archivo supera 10 MB');
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = await getActiveOrganizationId(supabase);
    const folder = orgId ?? user.id;
    const safe = file.name.replace(/[^\w.\-]/g, '_').slice(0, 80);
    const path = `${folder}/${crypto.randomUUID()}_${safe}`;
    setUploadingReceipt(true);
    try {
      const { error } = await supabase.storage.from('expense-receipts').upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (error) throw error;
      setForm((f) => ({ ...f, receipt_url: path }));
      toast.success('Comprobante adjuntado');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo subir el archivo');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    const defCat = categories.includes('Otros') ? 'Otros' : categories[0] || 'Otros';
    setForm({
      ...DEFAULT_FORM,
      category: defCat,
      date: `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
    });
    setDialog(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      title: e.title,
      amount: e.amount.toString(),
      category: e.category,
      date: e.date,
      notes: e.notes,
      receipt_url: e.receipt_url || '',
    });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.amount) {
      toast.error('Título e importe son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      const payload: Record<string, unknown> = {
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date,
        notes: form.notes,
        receipt_url: form.receipt_url.trim() || null,
      };
      if (orgId) payload.organization_id = orgId;
      if (editing) {
        await (supabase as any).from('expenses').update(payload).eq('id', editing.id);
        toast.success('Gasto actualizado');
      } else {
        await (supabase as any).from('expenses').insert([{ ...payload, user_id: user.id }]);
        toast.success('Gasto registrado');
      }
      setDialog(false);
      void loadExpenses();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await (supabase as any).from('expenses').delete().eq('id', id);
    toast.success('Gasto eliminado');
    void loadExpenses();
  };

  const handleExportZip = async () => {
    setExportingZip(true);
    try {
      const res = await fetch('/api/dashboard/finanzas/export-mes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ year: filterYear, month: filterMonth }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || res.statusText);
      }
      const blob = await res.blob();
      const dispo = res.headers.get('Content-Disposition');
      const m = dispo?.match(/filename="([^"]+)"/);
      const name = m?.[1] || `finanzas_${filterYear}-${String(filterMonth).padStart(2, '0')}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Paquete descargado');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setExportingZip(false);
    }
  };

  const filterCategoryNames = [...categories];
  for (const e of expenses) {
    if (e.category && !filterCategoryNames.includes(e.category)) filterCategoryNames.push(e.category);
  }

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => y - 3 + i);
  }, []);

  const backLabel = loc.isAR ? '← Archivo de Facturas' : '← Centro de documentación';
  const pageTitle = loc.isAR ? 'Mis Compras' : 'Facturas recibidas (gastos)';

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/dashboard/finanzas" className="text-primary hover:underline">
          {backLabel}
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Sube el PDF o foto del proveedor, importe y mes. Los importes usan la moneda del taller ({sym} ·{' '}
            Argentina).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={exportingZip}
            onClick={() => void handleExportZip()}
          >
            {exportingZip ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar mes para contador
          </Button>
          <Button onClick={openNew} className="gap-2 bg-[#0d9488] text-white hover:bg-[#1d4ed8]">
            <Upload className="h-4 w-4" />
            Subir factura de proveedor
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <Label className="text-xs text-gray-500">Mes</Label>
          <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
            <SelectTrigger className="mt-1 h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                [1, 'Enero'],
                [2, 'Febrero'],
                [3, 'Marzo'],
                [4, 'Abril'],
                [5, 'Mayo'],
                [6, 'Junio'],
                [7, 'Julio'],
                [8, 'Agosto'],
                [9, 'Septiembre'],
                [10, 'Octubre'],
                [11, 'Noviembre'],
                [12, 'Diciembre'],
              ].map(([n, label]) => (
                <SelectItem key={n} value={String(n)}>
                  {label as string}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Año</Label>
          <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
            <SelectTrigger className="mt-1 h-9 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="pb-1 text-xs text-gray-500">
          Filtra la tabla y el total del mes. La exportación ZIP usa este mismo mes.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total del mes</p>
              <p className="text-lg font-bold text-gray-900">{loc.format(monthTotal)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
              <Receipt className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Registros en el mes</p>
              <p className="text-lg font-bold text-gray-900">{inSelectedMonth.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-repairdesk-100">
              <DollarSign className="h-4 w-4 text-repairdesk-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Subtotal (filtro categoría)</p>
              <p className="text-lg font-bold text-gray-900">{loc.format(tableTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterCat('all')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition-colors',
            filterCat === 'all'
              ? 'border-[#0d9488] bg-[#0d9488] text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          )}
        >
          Todas las categorías
        </button>
        {filterCategoryNames.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCat(cat)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              filterCat === cat
                ? 'border-[#0d9488] bg-[#0d9488] text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          <p className="font-medium text-gray-600">Sin gastos en este mes</p>
          <Button onClick={openNew} className="mt-4 gap-2 bg-[#0d9488] text-white hover:bg-[#1d4ed8]">
            <Plus className="h-4 w-4" />
            Subir primera factura de proveedor
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Concepto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Adjunto
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Importe
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((exp) => {
                const href = expenseReceiptSigned[`row:${exp.id}`] ?? null;
                return (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{exp.title}</p>
                      {exp.notes && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400">{exp.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          categoryBadgeClass(exp.category)
                        )}
                      >
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(exp.date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#0d9488] hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Ver
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{loc.format(exp.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(exp)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(exp.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Total (vista)
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{loc.format(tableTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar comprobante' : 'Subir factura de proveedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div
              className={cn(
                'rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
                dragOver ? 'border-[#0d9488] bg-teal-50' : 'border-gray-200 bg-gray-50'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void uploadReceiptFile(f);
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void uploadReceiptFile(f);
                }}
              />
              <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">Arrastra el PDF o imagen aquí</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={uploadingReceipt}
                onClick={() => fileRef.current?.click()}
              >
                {uploadingReceipt ? <Loader className="h-4 w-4 animate-spin" /> : 'Elegir archivo'}
              </Button>
              {form.receipt_url ? (
                <div className="mt-2 flex flex-col items-center justify-center gap-1 text-xs text-green-700">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Comprobante listo
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => setForm((f) => ({ ...f, receipt_url: '' }))}
                    >
                      <X className="inline h-3 w-3" /> Quitar
                    </button>
                  </div>
                  {expenseReceiptSigned['form:draft'] ? (
                    <a
                      href={expenseReceiptSigned['form:draft']}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#0d9488] hover:underline"
                    >
                      Ver comprobante
                    </a>
                  ) : (
                    <span className="text-gray-400">Generando enlace…</span>
                  )}
                </div>
              ) : null}
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">Concepto / proveedor *</Label>
              <Input
                className="mt-1 h-9"
                placeholder="Ej. Distribuidora de repuestos XYZ"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600">Importe ({sym}) *</Label>
                <Input
                  className="mt-1 h-9"
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Fecha del gasto</Label>
                <Input
                  className="mt-1 h-9"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Categoría</Label>
              <Select
                value={categorySelectOptions.includes(form.category) ? form.category : categorySelectOptions[0] || 'Otros'}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorySelectOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Notas</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                className="gap-2 bg-[#0d9488] text-white hover:bg-[#1d4ed8]"
              >
                {saving && <Loader className="h-4 w-4 animate-spin" />}
                {editing ? 'Guardar cambios' : 'Guardar'}
              </Button>
              <Button variant="outline" onClick={() => setDialog(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
