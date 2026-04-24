'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Home,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
  FileDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildXlsx, downloadXlsx } from '@/lib/excel-export';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InventoryCatalogField } from '@/components/inventory/InventoryCatalogField';
import {
  SERVICE_DEVICE_CATEGORY_LABELS,
  getServiceCatalogBrands,
  getServiceCatalogModels,
} from '@/lib/repair-service-device-catalog';
import {
  getRepairTypesForServiceCategory,
  getLaborSuggestedUnitPrice,
  laborCurrencyLabel,
  type LaborCountryCode,
} from '@/lib/repair-labor-tariffs-2026';
import { expandLaborKeywordFragments, laborModelFilterOrPattern } from '@/lib/repair-labor-search';

type Row = {
  id: string;
  created_at: string;
  updated_at: string;
  category: string;
  brand: string;
  model: string;
  service_name: string;
  price: number;
  show_in_widget: boolean;
  country_code?: LaborCountryCode | string;
  repair_type_code?: string | null;
  pricing_year?: number | null;
  source?: string | null;
};

const PAGE_SIZES = [10, 25, 50, 100] as const;

/** Tarifario de mano de obra: solo Argentina (ARS). */
const LABOR_COUNTRY: LaborCountryCode = 'AR';

function sanitizeIlikeFragment(s: string): string {
  return s.trim().replace(/%/g, '').replace(/_/g, '');
}

export default function RepairLaborServicesPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');

  const [applied, setApplied] = useState({
    category: '',
    brand: '',
    model: '',
    keyword: '',
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: '',
    brand: '',
    model: '',
    repair_type_code: '',
    service_name: '',
    price: '',
    show_in_widget: false,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [seedImporting, setSeedImporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const categoryCatalogOptions = useMemo(() => [...SERVICE_DEVICE_CATEGORY_LABELS], []);
  const brandCatalogSuggestions = useMemo(
    () => getServiceCatalogBrands(form.category),
    [form.category]
  );
  const modelCatalogSuggestions = useMemo(
    () => getServiceCatalogModels(form.category, form.brand),
    [form.category, form.brand]
  );

  const filterBrandSuggestions = useMemo(
    () => getServiceCatalogBrands(filterCategory),
    [filterCategory]
  );
  const filterModelSuggestions = useMemo(
    () => getServiceCatalogModels(filterCategory, filterBrand),
    [filterCategory, filterBrand]
  );

  const formRepairTypeOptions = useMemo(
    () => getRepairTypesForServiceCategory(form.category),
    [form.category]
  );

  const buildBaseQuery = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { user: null as null, orgId: null as string | null, base: null as any };
    const orgId = await getActiveOrganizationId(supabase);
    let q = (supabase as any)
      .from('repair_labor_services')
      .select(
        'id, created_at, updated_at, category, brand, model, service_name, price, show_in_widget, country_code, repair_type_code, pricing_year, source',
        { count: 'exact' }
      );
    q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', user.id);
    q = q.eq('country_code', LABOR_COUNTRY);

    const c = sanitizeIlikeFragment(applied.category);
    const b = sanitizeIlikeFragment(applied.brand);
    const m = sanitizeIlikeFragment(applied.model);
    const k = sanitizeIlikeFragment(applied.keyword);
    if (c) q = q.ilike('category', `%${c}%`);
    if (b) q = q.ilike('brand', `%${b}%`);
    if (m) {
      q = q.or(laborModelFilterOrPattern(m));
    }
    if (k) {
      const variants = expandLaborKeywordFragments(k);
      const orParts: string[] = [];
      for (const fragment of variants) {
        const s = sanitizeIlikeFragment(fragment);
        if (!s) continue;
        orParts.push(`service_name.ilike.%${s}%`);
        orParts.push(`category.ilike.%${s}%`);
        orParts.push(`brand.ilike.%${s}%`);
        orParts.push(`model.ilike.%${s}%`);
        orParts.push(`repair_type_code.ilike.%${s}%`);
      }
      if (orParts.length) q = q.or(orParts.join(','));
    }
    return { user, orgId, base: q };
  }, [supabase, applied.category, applied.brand, applied.model, applied.keyword]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { user, base } = await buildBaseQuery();
      if (!user || !base) {
        setRows([]);
        setTotal(0);
        return;
      }
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await base
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) {
        console.error(error);
        const msg = error.message || String(error);
        setLoadError(msg);
        const needsRegionMigration = /country_code|schema cache|column/i.test(msg);
        const needsTableMigration = /relation|does not exist|repair_labor_services/i.test(msg);
        toast.error(
          `${msg}${needsRegionMigration ? ' → Aplica migración 202604071200 (country_code).' : ''}${needsTableMigration ? ' → Aplica migración 202604052200 (tabla).' : ''}`
        );
        setRows([]);
        setTotal(0);
        return;
      }
      setRows((data as Row[]) || []);
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [buildBaseQuery, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(total / pageSize));
    if (page > tp) setPage(tp);
  }, [total, pageSize, page]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, applied, pageSize]);

  const applyFilters = () => {
    setApplied({
      category: filterCategory,
      brand: filterBrand,
      model: filterModel,
      keyword: filterKeyword,
    });
    setPage(1);
  };

  const resetFilters = () => {
    setFilterCategory('');
    setFilterBrand('');
    setFilterModel('');
    setFilterKeyword('');
    setApplied({ category: '', brand: '', model: '', keyword: '' });
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      category: '',
      brand: '',
      model: '',
      repair_type_code: '',
      service_name: '',
      price: '0',
      show_in_widget: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      category: r.category ?? '',
      brand: r.brand ?? '',
      model: r.model ?? '',
      repair_type_code: (r.repair_type_code || '').trim(),
      service_name: r.service_name ?? '',
      price: String(r.price ?? 0),
      show_in_widget: !!r.show_in_widget,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const name = form.service_name.trim();
    if (!name) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }
    const priceNum = parseFloat(form.price.replace(',', '.'));
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error('Precio no válido');
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      const payload = {
        category: form.category.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        service_name: name,
        price: priceNum,
        show_in_widget: form.show_in_widget,
        country_code: LABOR_COUNTRY,
        repair_type_code: form.repair_type_code.trim() || '',
        pricing_year:
          editing?.source === 'catalog_seed' ? (editing.pricing_year ?? 2026) : null,
        source: (editing?.source === 'catalog_seed' ? 'catalog_seed' : 'manual') as
          | 'manual'
          | 'catalog_seed',
      };
      if (editing) {
        const { error } = await (supabase as any)
          .from('repair_labor_services')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Servicio actualizado');
      } else {
        const { error } = await (supabase as any).from('repair_labor_services').insert([
          {
            user_id: user.id,
            organization_id: orgId,
            ...payload,
          },
        ]);
        if (error) throw error;
        toast.success('Servicio creado');
      }
      setDialogOpen(false);
      setEditing(null);
      void load();
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const importTariff2026 = async () => {
    if (!confirm('¿Importar el catálogo maestro de servicios 2026 a tu organización? Esto copiará todos los servicios disponibles.')) {
      return;
    }
    setSeedImporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('No hay token de sesión. Cierra sesión y vuelve a entrar en el panel.');
        return;
      }
      // Usar nuevo endpoint que lee desde service_catalog_master en la base de datos
      const res = await fetch('/api/dashboard/repair-labor-catalog/seed-from-master', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const raw = await res.text();
      let j: { error?: string; hint?: string; inserted?: number; message?: string } = {};
      try {
        j = JSON.parse(raw) as typeof j;
      } catch {
        /* no json */
      }
      if (!res.ok) {
        const detail = [j.error, j.hint].filter(Boolean).join(' — ') || raw.slice(0, 280);
        toast.error(detail || `Error HTTP ${res.status}`);
        return;
      }
      const n = j.inserted ?? 0;
      if (n === 0) {
        toast.message('No se importaron servicios nuevos. Es posible que ya tengas todos los servicios del catálogo.');
      } else {
        toast.success(`Se importaron ${n} servicios del catálogo maestro a tu organización.`);
      }
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setSeedImporting(false);
    }
  };

  const removeOne = async (id: string) => {
    if (!confirm('¿Eliminar este servicio de reparación?')) return;
    const { error } = await (supabase as any).from('repair_labor_services').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Eliminado');
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      void load();
    }
  };

  const removeSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar ${ids.length} servicio(s)?`)) return;
    const { error } = await (supabase as any).from('repair_labor_services').delete().in('id', ids);
    if (error) toast.error(error.message);
    else {
      toast.success('Eliminados');
      setSelected(new Set());
      void load();
    }
  };

  const EXPORT_BATCH = 500;
  const EXPORT_CAP = 10_000;

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const { user, base } = await buildBaseQuery();
      if (!user || !base) return;
      const probe = await base.order('created_at', { ascending: false }).range(0, 0);
      if (probe.error) throw probe.error;
      const total = probe.count ?? 0;
      if (total === 0) {
        toast.message('No hay filas para exportar con los filtros actuales.');
        return;
      }
      if (total > EXPORT_CAP) {
        const ok = confirm(
          `Hay ${total} filas con estos filtros. Solo se exportarán las primeras ${EXPORT_CAP} en lotes de ${EXPORT_BATCH}. ¿Continuar?`
        );
        if (!ok) return;
      }
      const max = Math.min(total, EXPORT_CAP);
      const list: Row[] = [];
      for (let from = 0; from < max; from += EXPORT_BATCH) {
        const to = Math.min(from + EXPORT_BATCH - 1, max - 1);
        const { base: b } = await buildBaseQuery();
        if (!b) break;
        const { data, error } = await b.order('created_at', { ascending: false }).range(from, to);
        if (error) throw error;
        const chunk = (data as Row[]) || [];
        list.push(...chunk);
        if (chunk.length < to - from + 1) break;
      }
      if (list.length === 0) {
        toast.message('No hay filas para exportar con los filtros actuales.');
        return;
      }
      const sym = 'ARS';
      const buffer = await buildXlsx({
        sheetName: 'Servicios reparación',
        title: 'Servicio de reparación — Argentina (ARS) — 2026 ref.',
        columns: [
          { header: 'Región', key: 'country', type: 'text' },
          { header: 'Categoría', key: 'category', type: 'text' },
          { header: 'Marca', key: 'brand', type: 'text' },
          { header: 'Modelo', key: 'model', type: 'text' },
          { header: 'Tipo (código)', key: 'repair_code', type: 'text' },
          { header: 'Nombre del servicio', key: 'service_name', type: 'text' },
          { header: 'Precio', key: 'price', type: 'currency', currencySymbol: sym },
          { header: 'Año precio', key: 'pricing_year', type: 'text' },
          { header: 'Origen', key: 'source', type: 'text' },
          { header: 'Mostrar en widget', key: 'show_label', type: 'text' },
        ],
        rows: list.map((r) => ({
          country: 'AR (ARS)',
          category: r.category,
          brand: r.brand,
          model: r.model,
          repair_code: r.repair_type_code || '—',
          service_name: r.service_name,
          price: r.price,
          pricing_year: r.pricing_year != null ? String(r.pricing_year) : '—',
          source: r.source === 'catalog_seed' ? 'Catálogo' : 'Manual',
          show_label: r.show_in_widget ? 'Sí' : 'No',
        })),
        currencySymbol: sym,
      });
      downloadXlsx(buffer, `servicios-reparacion-${new Date().toISOString().slice(0, 10)}.xlsx`);
      const truncated = total > list.length;
      toast.success(
        `Exportados ${list.length} registro(s)${truncated ? ` (tope ${EXPORT_CAP}; total ${total})` : ''}`
      );
    } catch (e: any) {
      toast.error(e?.message || 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id)) && !allPageSelected;

  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        pageIds.forEach((id) => n.delete(id));
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        pageIds.forEach((id) => n.add(id));
        return n;
      });
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const fmtMoneyRow = (r: Row) => {
    const n = Number(r.price) || 0;
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  };

  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, total);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Link href="/dashboard/inventory" className="inline-flex items-center gap-0.5 hover:text-primary">
              <Home className="h-3.5 w-3.5" />
              Inventario
            </Link>
            <span aria-hidden>/</span>
            <span className="text-gray-700 font-medium">Servicio de reparación</span>
          </nav>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            disabled={seedImporting || loading}
            onClick={() => void importTariff2026()}
          >
            {seedImporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Importar catálogo 2026
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void exportXlsx()}
            disabled={exporting || loading}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <FileDown className="h-4 w-4 mr-1" />
            )}
            Exportar Excel
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Crear servicio
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">No se pudo cargar la lista desde Supabase</p>
          <p className="mt-1 font-mono text-xs break-all opacity-90">{loadError}</p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
            <li>
              Si menciona <code className="bg-white/60 px-1 rounded">service_catalog_master</code>: ejecuta en el SQL Editor la migración{' '}
              <strong>202604241800_create_service_catalog_master.sql</strong> y recarga esta página.
            </li>
            <li>
              Si la tabla <code className="bg-white/60 px-1 rounded">repair_labor_services</code> no existe: aplica antes <strong>202604052200_repair_labor_services.sql</strong>.
            </li>
            <li>
              Tras el SQL, espera unos segundos (caché de esquema de Supabase) y pulsa F5.
            </li>
          </ul>
        </div>
      ) : null}

      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Categoría</Label>
              <InventoryCatalogField
                className="mt-1"
                value={filterCategory}
                onChange={setFilterCategory}
                suggestions={categoryCatalogOptions}
                placeholder="Ej. Smartphones"
                requireQuery={false}
                maxSuggestions={20}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Marca</Label>
              <InventoryCatalogField
                className="mt-1"
                value={filterBrand}
                onChange={setFilterBrand}
                suggestions={filterBrandSuggestions}
                placeholder="Ej. Apple"
                maxSuggestions={160}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Modelo</Label>
              <InventoryCatalogField
                className="mt-1"
                value={filterModel}
                onChange={setFilterModel}
                suggestions={filterModelSuggestions}
                placeholder="Ej. iPhone 14"
                maxSuggestions={180}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Palabra clave</Label>
              <Input
                className="mt-1 h-9"
                placeholder="Buscar en nombre…"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
              Reiniciar
            </Button>
            <Button type="button" size="sm" className="bg-primary text-white hover:bg-primary/90" onClick={applyFilters}>
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-medium text-[#2d2d2d]">{selected.size} seleccionado(s)</span>
          <Button type="button" size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => void removeSelected()}>
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar seleccionados
          </Button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-gray-600 py-14 px-4 space-y-4 max-w-lg mx-auto">
            <p className="font-medium text-gray-800">
              No hay filas para <strong>Argentina (ARS)</strong>
              {applied.category || applied.brand || applied.model || applied.keyword
                ? ' con los filtros actuales'
                : ''}
              .
            </p>
            <div className="text-left text-sm bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="font-semibold text-gray-800">Cómo importar el catálogo 2026</p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>
                  Asegúrate de que la migración{' '}
                  <code className="text-xs bg-white px-1 rounded border">202604241800_create_service_catalog_master.sql</code>{' '}
                  esté aplicada en Supabase (crea el catálogo maestro con ~900 servicios).
                </li>
                <li>
                  Pulsa <strong>Importar catálogo 2026</strong> arriba. Esto copiará los servicios del catálogo maestro a tu organización.
                </li>
                <li>
                  <strong>Independiente por organización:</strong> cada taller tiene su propia copia. Si modificas precios, no afecta a otros.
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-100 border-b text-left text-gray-600">
                <tr>
                  <th className="px-2 py-2 w-10 text-center">
                    <Checkbox
                      checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                      onCheckedChange={() => toggleSelectAllPage()}
                      className="border-[#0f766e] data-[state=checked]:bg-primary"
                      aria-label="Seleccionar página"
                    />
                  </th>
                  <th className="px-2 py-2 w-12">N.º</th>
                  <th className="px-2 py-2 w-10">Reg.</th>
                  <th className="px-2 py-2">Categoría</th>
                  <th className="px-2 py-2">Marca</th>
                  <th className="px-2 py-2">Modelo</th>
                  <th className="px-2 py-2 min-w-[180px]">Nombre del servicio</th>
                  <th className="px-2 py-2 text-right">Precio</th>
                  <th className="px-2 py-2 text-center">Widget</th>
                  <th className="px-2 py-2 w-24 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-2 py-2 text-center">
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggleRow(r.id)}
                        className="border-[#0f766e] data-[state=checked]:bg-primary"
                        aria-label={`Seleccionar ${r.service_name}`}
                      />
                    </td>
                    <td className="px-2 py-2 font-mono textbg-primary">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-gray-600">
                      AR
                    </td>
                  <td className="px-2 py-2">{r.category || '—'}</td>
                  <td className="px-2 py-2">{r.brand || '—'}</td>
                  <td className="px-2 py-2">{r.model || '—'}</td>
                  <td className="px-2 py-2 font-medium text-gray-900">{r.service_name}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtMoneyRow(r)}</td>
                  <td className="px-2 py-2 text-center">
                    {r.show_in_widget ? (
                      <Check className="h-5 w-5 text-emerald-600 inline-block" aria-label="Sí" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 inline-block" aria-label="No" />
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} title="Editar">
                      <Pencil className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => void removeOne(r.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-2.5 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-2">
              <span>Filas por página</span>
              <select
                className="h-8 rounded border border-gray-300 bg-white px-2"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-gray-500">
                {fromRow}–{toRow} de {total}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                className="h-8 px-2 bg-primary text-white hover:bg-primary/90"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 tabular-nums">
                Pág. {page} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                className="h-8 px-2 bg-primary text-white hover:bg-primary/90"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio de reparación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Categoría</Label>
              <InventoryCatalogField
                className="mt-1"
                value={form.category}
                onChange={(v) =>
                  setForm({ ...form, category: v, brand: '', model: '', repair_type_code: '' })
                }
                suggestions={categoryCatalogOptions}
                placeholder="Ej. Smartphones"
                requireQuery={false}
                maxSuggestions={20}
              />
            </div>
            <div>
              <Label>Marca</Label>
              <InventoryCatalogField
                className="mt-1"
                value={form.brand}
                onChange={(v) =>
                  setForm((f) => {
                    const next = { ...f, brand: v, model: '' };
                    if (f.repair_type_code) {
                      const opt = getRepairTypesForServiceCategory(f.category).find(
                        (o) => o.code === f.repair_type_code
                      );
                      if (opt) {
                        next.price = String(
                          getLaborSuggestedUnitPrice(f.category, v, '', opt.tier, LABOR_COUNTRY)
                        );
                      }
                    }
                    return next;
                  })
                }
                suggestions={brandCatalogSuggestions}
                placeholder="Ej. Samsung"
                maxSuggestions={180}
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <InventoryCatalogField
                className="mt-1"
                value={form.model}
                onChange={(v) =>
                  setForm((f) => {
                    const next = { ...f, model: v };
                    if (f.repair_type_code) {
                      const opt = getRepairTypesForServiceCategory(f.category).find(
                        (o) => o.code === f.repair_type_code
                      );
                      if (opt) {
                        next.price = String(
                          getLaborSuggestedUnitPrice(f.category, f.brand, v, opt.tier, LABOR_COUNTRY)
                        );
                      }
                    }
                    return next;
                  })
                }
                suggestions={modelCatalogSuggestions}
                placeholder="Ej. Galaxy S21"
                maxSuggestions={200}
              />
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              Catálogo muy amplio (no cubre el 100 % del mercado). Puedes escribir cualquier texto; en marca y modelo,
              escribe varias letras para acotar la lista.
            </p>
            <div>
              <Label>Tipo de reparación (plantilla 2026)</Label>
              <Select
                value={form.repair_type_code ? form.repair_type_code : '_manual'}
                onValueChange={(v) => {
                  if (v === '_manual') {
                    setForm((f) => ({ ...f, repair_type_code: '' }));
                    return;
                  }
                  const opt = formRepairTypeOptions.find((o) => o.code === v);
                  if (!opt) return;
                  setForm((f) => ({
                    ...f,
                    repair_type_code: v,
                    service_name: opt.label,
                    price: String(
                      getLaborSuggestedUnitPrice(
                        f.category,
                        f.brand,
                        f.model,
                        opt.tier,
                        LABOR_COUNTRY
                      )
                    ),
                  }));
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Elegir plantilla o personalizar abajo" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="_manual">Personalizado (solo nombre abajo)</SelectItem>
                  {formRepairTypeOptions.map((o) => (
                    <SelectItem key={o.code} value={o.code}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre del servicio *</Label>
              <Input
                className="mt-1"
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                placeholder="Ej. Cambio de pantalla"
              />
            </div>
            <div>
              <Label>Precio ({laborCurrencyLabel(LABOR_COUNTRY)})</Label>
              <Input
                className="mt-1"
                type="text"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                Valores plantilla orientados a 2026 en cada país; ajusta libremente según tu taller.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={form.show_in_widget}
                onCheckedChange={(v) => setForm({ ...form, show_in_widget: v === true })}
                className="border-[#0f766e] data-[state=checked]:bg-primary"
              />
              Mostrar en el widget (portal / presupuestos públicos)
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-primary/90" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
