'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Upload,
  RefreshCw,
  FileDown,
  RotateCcw,
  Save,
  Pin,
  PinOff,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ExcelImportModal } from './ExcelImportModal';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { buildXlsx, downloadXlsx } from '@/lib/excel-export';
import { InventoryMultiSelect, type InventoryMultiOption } from '@/components/inventory/InventoryMultiSelect';
import { InventoryCategoryTreeSelect } from '@/components/inventory/InventoryCategoryTreeSelect';
import { Checkbox } from '@/components/ui/checkbox';

const FILTER_STORAGE_VERSION = 2;

const PRODUCT_LIST_COLUMNS =
  'id, product_id, name, sku, upc, category, brand, model, condition, quantity, stock_warning, reorder_level, price, unit_cost, supplier, imei, serial, image_url, description, storage_location, created_at';

const INVENTORY_PAGE_SIZES = [25, 50, 100] as const;
const EXPORT_BATCH_SIZE = 500;
const EXPORT_MAX_ROWS = 10_000;
const FACET_BATCH_SIZE = 1000;
const FACET_MAX_ROWS = 8000;

const CATEGORY_PATH_SEP = ' > ';

function sanitizeIlikeNeedle(s: string): string {
  return s.trim().replace(/%/g, '').replace(/_/g, '');
}

/** Filtros aplicados en PostgREST (coinciden con la lógica previa del cliente en lo posible). */
function applyProductServerFilters(q: any, f: InventoryFilters) {
  const pqQuote = (s: string) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

  const idN = f.id.trim();
  if (idN) q = q.ilike('product_id', `%${idN}%`);

  const nameN = f.name.trim();
  if (nameN) q = q.ilike('name', `%${nameN}%`);

  if (f.categories.length > 0) {
    const orParts: string[] = [];
    for (const p of f.categories) {
      const path = (p || '').trim();
      if (!path) continue;
      orParts.push(`category.eq.${pqQuote(path)}`);
      orParts.push(`category.ilike.${pqQuote(path + CATEGORY_PATH_SEP + '%')}`);
    }
    if (orParts.length) q = q.or(orParts.join(','));
  }

  if (f.brands.length > 0) q = q.in('brand', f.brands);
  if (f.models.length > 0) q = q.in('model', f.models);
  if (f.suppliers.length > 0) q = q.in('supplier', f.suppliers);

  const skuNeedle = sanitizeIlikeNeedle(f.skuUpc);
  if (skuNeedle) {
    const pat = pqQuote(`%${skuNeedle}%`);
    q = q.or(`sku.ilike.${pat},upc.ilike.${pat}`);
  }

  const imeiN = f.imei.trim();
  if (imeiN) q = q.ilike('imei', `%${imeiN}%`);

  const serialN = f.serial.trim();
  if (serialN) q = q.ilike('serial', `%${serialN}%`);

  if (f.condition !== '') q = q.eq('condition', f.condition);

  if (f.hideOutOfStock) q = q.gt('quantity', 0);

  if (f.criteria.includes('storage_location')) {
    const loc = f.storageLocation.trim();
    if (loc) q = q.ilike('storage_location', `%${loc}%`);
  }

  if (f.criteria.includes('no_serial')) {
    q = q.or('serial.is.null,serial.eq.');
  }

  if (f.criteria.includes('date_from') && f.dateFrom) {
    q = q.gte('created_at', new Date(`${f.dateFrom}T00:00:00.000Z`).toISOString());
  }
  if (f.criteria.includes('date_to') && f.dateTo) {
    q = q.lte('created_at', new Date(`${f.dateTo}T23:59:59.999Z`).toISOString());
  }

  return q;
}

const CRITERIA_OPTIONS: InventoryMultiOption[] = [
  { value: 'storage_location', label: 'Ubicación física' },
  { value: 'date_from', label: 'Desde fecha (alta)' },
  { value: 'date_to', label: 'Hasta fecha (alta)' },
  { value: 'no_serial', label: 'Sin número de serie', badge: 'Nuevo' },
];

type InventoryFilters = {
  id: string;
  name: string;
  categories: string[];
  brands: string[];
  models: string[];
  suppliers: string[];
  skuUpc: string;
  imei: string;
  serial: string;
  condition: string;
  hideOutOfStock: boolean;
  criteria: string[];
  storageLocation: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters = (): InventoryFilters => ({
  id: '',
  name: '',
  categories: [],
  brands: [],
  models: [],
  suppliers: [],
  skuUpc: '',
  imei: '',
  serial: '',
  condition: '',
  hideOutOfStock: false,
  criteria: [],
  storageLocation: '',
  dateFrom: '',
  dateTo: '',
});

type Product = {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  upc: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  quantity: number;
  stock_warning: number;
  reorder_level: number;
  price: number;
  unit_cost: number;
  supplier: string;
  imei: string;
  serial: string;
  image_url: string;
  description?: string;
  /** Ubicación física en el almacén: cajón, estante, pasillo, etc. */
  storage_location?: string | null;
  created_at: string;
};

function etiquetaCondicion(value: string | undefined | null): string {
  if (!value) return 'Seleccionar';
  const v = {
    New: 'Nuevo',
    Used: 'Usado',
    Refurbished: 'Reacondicionado',
    Idle: 'Sin movimiento',
  }[value];
  return v ?? value;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printInventoryLabels(products: Product[]) {
  if (products.length === 0) return;
  const w = window.open('', '_blank');
  if (!w) {
    return false;
  }
  const rows = products
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku || '')}</td><td>${escapeHtml(p.upc || '')}</td><td>${escapeHtml(p.storage_location || '')}</td><td>${escapeHtml(String(p.quantity ?? ''))}</td></tr>`
    )
    .join('');
  w.document.write(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Etiquetas — repuestos</title><style>body{font-family:system-ui,sans-serif;font-size:11px;padding:16px}h1{font-size:14px;margin:0 0 12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f1f5f9}</style></head><body><h1>JC ONE FIX — Repuestos seleccionados</h1><table><thead><tr><th>Nombre</th><th>SKU</th><th>UPC</th><th>Ubicación</th><th>Stock</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
  );
  w.document.close();
  return true;
}

export default function ProductsPage() {
  const loc = useOrgLocale();
  const sym = loc.symbol;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [supplierRows, setSupplierRows] = useState<{ id: string; name: string }[]>([]);
  const [storageScope, setStorageScope] = useState<{ orgId: string | null; userId: string } | null>(
    null
  );
  const [autoLoadSaved, setAutoLoadSaved] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());

  const [filters, setFilters] = useState<InventoryFilters>(() => emptyFilters());
  const [appliedFilters, setAppliedFilters] = useState<InventoryFilters>(() => emptyFilters());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [facetCategories, setFacetCategories] = useState<string[]>([]);
  const [facetBrands, setFacetBrands] = useState<string[]>([]);
  const [facetModels, setFacetModels] = useState<string[]>([]);

  const supabase = createClient();

  const filterStorageKey = (orgId: string | null, userId: string) =>
    `jc_inventory_filters_v${FILTER_STORAGE_VERSION}:${orgId ?? 'u'}:${userId}`;

  const pinStorageKey = (orgId: string | null, userId: string) =>
    `jc_inventory_pin_saved_filters:${orgId ?? 'u'}:${userId}`;

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const orgId = await getActiveOrganizationId(supabase);
      setStorageScope({ orgId, userId: user.id });
    })();
  }, [supabase]);

  const lastRestoredScope = useRef<string | null>(null);
  useEffect(() => {
    if (!storageScope) return;
    const scopeKey = `${storageScope.orgId ?? 'u'}:${storageScope.userId}`;
    if (lastRestoredScope.current === scopeKey) return;
    lastRestoredScope.current = scopeKey;
    const { orgId, userId } = storageScope;
    try {
      const pinRaw = localStorage.getItem(pinStorageKey(orgId, userId));
      const pinned = pinRaw === '1';
      setAutoLoadSaved(pinned);
      if (pinned) {
        const raw = localStorage.getItem(filterStorageKey(orgId, userId));
        if (raw) {
          const parsed = JSON.parse(raw) as { v?: number; filters?: InventoryFilters };
          if (parsed?.v === FILTER_STORAGE_VERSION && parsed.filters) {
            const merged = { ...emptyFilters(), ...parsed.filters };
            setFilters(merged);
            setAppliedFilters(merged);
            setPage(1);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [storageScope]);

  const loadFacets = async (orgId: string | null, userId: string) => {
    const cat = new Set<string>();
    const br = new Set<string>();
    const md = new Set<string>();
    try {
      let offset = 0;
      while (offset < FACET_MAX_ROWS) {
        let fq = (supabase as any)
          .from('products')
          .select('category, brand, model, supplier')
          .order('created_at', { ascending: false });
        fq = orgId ? fq.eq('organization_id', orgId) : fq.eq('user_id', userId);
        const { data: facetRows } = await fq.range(offset, offset + FACET_BATCH_SIZE - 1);
        const rows = facetRows as { category?: string; brand?: string; model?: string; supplier?: string }[] | null;
        if (!rows?.length) break;
        for (const r of rows) {
          const c = (r.category || '').trim();
          if (c) cat.add(c);
          const b = (r.brand || '').trim();
          if (b) br.add(b);
          const m = (r.model || '').trim();
          if (m) md.add(m);
        }
        if (rows.length < FACET_BATCH_SIZE) break;
        offset += FACET_BATCH_SIZE;
      }
    } catch {
      /* ignore */
    }
    setFacetCategories(Array.from(cat).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
    setFacetBrands(Array.from(br).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
    setFacetModels(Array.from(md).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
  };

  const loadProductsPage = async () => {
    if (!storageScope) return;
    setLoading(true);
    try {
      const { orgId, userId } = storageScope;

      let supQ = (supabase as any).from('suppliers').select('id,name').order('name', { ascending: true });
      supQ = orgId ? supQ.eq('organization_id', orgId) : supQ.eq('user_id', userId);

      let pq = (supabase as any).from('products').select(PRODUCT_LIST_COLUMNS, { count: 'exact' });
      pq = orgId ? pq.eq('organization_id', orgId) : pq.eq('user_id', userId);
      pq = applyProductServerFilters(pq, appliedFilters);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const [{ data, error, count }, { data: supData }] = await Promise.all([
        pq.order('created_at', { ascending: false }).range(from, to),
        supQ,
      ]);

      setSupplierRows((supData as { id: string; name: string }[] | null) ?? []);
      setTotalCount(typeof count === 'number' ? count : 0);

      if (error) {
        console.error('Error loading products:', error);
        toast.error(
          'Error al cargar repuestos: ' +
            error.message +
            ' · Aplica en Supabase la migración 202604021500_products_pos_sales_and_invoices_core.sql'
        );
        setProducts([]);
      } else {
        setProducts((data as Product[]) || []);
      }
    } catch (error: unknown) {
      console.error('Exception loading products:', error);
      toast.error(
        'Error al cargar repuestos: ' + (error instanceof Error ? error.message : 'Error desconocido')
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storageScope) return;
    void loadFacets(storageScope.orgId, storageScope.userId);
  }, [storageScope?.orgId, storageScope?.userId, supabase]);

  useEffect(() => {
    if (!storageScope) return;
    void loadProductsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProductsPage depende de estado ya listado
  }, [storageScope, page, pageSize, appliedFilters]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
    if (page > tp) setPage(tp);
  }, [totalCount, pageSize, page]);

  const brandOptions: InventoryMultiOption[] = useMemo(
    () =>
      facetBrands.map((b) => ({
        value: b,
        label: b,
      })),
    [facetBrands]
  );

  const modelOptions: InventoryMultiOption[] = useMemo(
    () =>
      facetModels.map((m) => ({
        value: m,
        label: m,
      })),
    [facetModels]
  );

  const distinctCategories = useMemo(() => facetCategories, [facetCategories]);

  const supplierOptions: InventoryMultiOption[] = useMemo(() => {
    const set = new Map<string, string>();
    supplierRows.forEach((s) => {
      const n = (s.name || '').trim();
      if (n) set.set(n.toLowerCase(), n);
    });
    products.forEach((p) => {
      const n = (p.supplier || '').trim();
      if (n) set.set(n.toLowerCase(), n);
    });
    return Array.from(set.values())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((n) => ({ value: n, label: n }));
  }, [products, supplierRows]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const fromRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, totalCount);

  const allPageSelected =
    products.length > 0 && products.every((p) => selectedProductIds.has(p.id));
  const somePageSelected = products.some((p) => selectedProductIds.has(p.id)) && !allPageSelected;

  const toggleSelectAllPage = () => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      const ids = products.map((p) => p.id);
      const allOn = ids.length > 0 && ids.every((id) => next.has(id));
      if (allOn) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleRowSelected = (id: string, checked: boolean) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const persistSavedFilters = () => {
    if (!storageScope) {
      toast.error('Espera a que cargue la sesión');
      return;
    }
    try {
      const payload = JSON.stringify({ v: FILTER_STORAGE_VERSION, filters });
      localStorage.setItem(filterStorageKey(storageScope.orgId, storageScope.userId), payload);
      toast.success('Filtros guardados en este navegador');
    } catch {
      toast.error('No se pudieron guardar los filtros');
    }
  };

  const togglePinSavedFilters = () => {
    if (!storageScope) return;
    const key = pinStorageKey(storageScope.orgId, storageScope.userId);
    try {
      if (autoLoadSaved) {
        localStorage.removeItem(key);
        setAutoLoadSaved(false);
        toast.message('Ya no se cargarán los filtros guardados al entrar');
      } else {
        localStorage.setItem(key, '1');
        setAutoLoadSaved(true);
        persistSavedFilters();
        toast.success('Filtros fijados: se aplicarán al abrir inventario');
      }
    } catch {
      toast.error('Error al actualizar la preferencia');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este repuesto?')) return;
    try {
      const { error } = await (supabase as any).from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Repuesto eliminado');
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      void loadProductsPage();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleBulkDeleteSelected = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `¿Eliminar ${ids.length} repuesto(s) solo de este taller?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      const { error } = await (supabase as any).from('products').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} repuesto(s) eliminados`);
      setSelectedProductIds(new Set());
      void loadProductsPage();
    } catch {
      toast.error('No se pudieron eliminar todos los repuestos');
    }
  };

  const handlePrintSelectedLabels = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) {
      toast.message('Selecciona al menos un repuesto');
      return;
    }
    if (!storageScope) {
      toast.error('Espera a que cargue la sesión');
      return;
    }
    const { orgId, userId } = storageScope;
    const onPage = products.filter((p) => ids.includes(p.id));
    const missing = ids.filter((id) => !onPage.some((p) => p.id === id));
    const extra: Product[] = [];
    const chunk = 80;
    for (let i = 0; i < missing.length; i += chunk) {
      const slice = missing.slice(i, i + chunk);
      let q = (supabase as any).from('products').select(PRODUCT_LIST_COLUMNS).in('id', slice);
      q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', userId);
      const { data, error } = await q;
      if (error) {
        toast.error('No se pudieron cargar todas las filas seleccionadas');
        return;
      }
      if (data?.length) extra.push(...(data as Product[]));
    }
    const byId = new Map<string, Product>();
    [...onPage, ...extra].forEach((p) => byId.set(p.id, p));
    const list = ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
    if (list.length === 0) {
      toast.message('No se encontraron los repuestos seleccionados');
      return;
    }
    const ok = printInventoryLabels(list);
    if (!ok) {
      toast.error('Permite ventanas emergentes para imprimir las etiquetas');
    }
  };

  const clearFilters = () => {
    const e = emptyFilters();
    setFilters(e);
    setAppliedFilters(e);
    setPage(1);
  };

  const runSearch = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    toast.message('Aplicando filtros en el servidor…');
  };

  const exportProductsXlsx = async () => {
    if (!storageScope) {
      toast.error('Espera a que cargue la sesión');
      return;
    }
    if (totalCount === 0) {
      toast.message('No hay repuestos para exportar con los filtros actuales.');
      return;
    }
    const { orgId, userId } = storageScope;
    if (totalCount > EXPORT_MAX_ROWS) {
      const ok = confirm(
        `Hay ${totalCount} filas con estos filtros. Solo se descargarán las primeras ${EXPORT_MAX_ROWS} en lotes de ${EXPORT_BATCH_SIZE} (límite de seguridad en el navegador). ¿Continuar?`
      );
      if (!ok) return;
    }
    const max = Math.min(totalCount, EXPORT_MAX_ROWS);
    const toastId = toast.loading(`Generando Excel… 0 / ${max}`);
    const rows: Product[] = [];
    try {
      for (let offset = 0; offset < max; offset += EXPORT_BATCH_SIZE) {
        let q = (supabase as any).from('products').select(PRODUCT_LIST_COLUMNS);
        q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', userId);
        q = applyProductServerFilters(q, appliedFilters);
        const take = Math.min(EXPORT_BATCH_SIZE, max - offset);
        const to = offset + take - 1;
        const { data, error } = await q.order('created_at', { ascending: false }).range(offset, to);
        if (error) throw error;
        if (data?.length) rows.push(...(data as Product[]));
        toast.loading(`Generando Excel… ${rows.length} / ${max}`, { id: toastId });
        if (!data?.length || data.length < take) break;
      }
      if (rows.length === 0) {
        toast.message('No hay repuestos para exportar con los filtros actuales.', { id: toastId });
        return;
      }
      const dataRows = rows.map((p) => ({
        product_id: p.product_id,
        name: p.name,
        sku: p.sku,
        upc: p.upc,
        category: p.category,
        brand: p.brand,
        model: p.model,
        condition: p.condition,
        quantity: p.quantity,
        stock_warning: p.stock_warning,
        reorder_level: p.reorder_level,
        price: p.price,
        unit_cost: p.unit_cost,
        supplier: p.supplier,
        imei: p.imei,
        serial: p.serial,
        storage_location: p.storage_location ?? '',
        description: p.description ?? '',
      }));
      const buffer = await buildXlsx({
        sheetName: 'Inventario',
        title: 'JC ONE FIX — Inventario',
        currencySymbol: sym,
        columns: [
          { header: 'ID Producto', key: 'product_id', minWidth: 12 },
          { header: 'Nombre', key: 'name', minWidth: 28 },
          { header: 'SKU', key: 'sku', minWidth: 14 },
          { header: 'UPC / Código', key: 'upc', minWidth: 14 },
          { header: 'Categoría', key: 'category', minWidth: 14 },
          { header: 'Marca', key: 'brand', minWidth: 14 },
          { header: 'Modelo', key: 'model', minWidth: 16 },
          { header: 'Condición', key: 'condition', minWidth: 12 },
          { header: 'En stock', key: 'quantity', type: 'number', minWidth: 10 },
          { header: 'Alerta stock', key: 'stock_warning', type: 'number', minWidth: 12 },
          { header: 'Nivel reorden', key: 'reorder_level', type: 'number', minWidth: 12 },
          { header: 'Precio venta', key: 'price', type: 'currency', minWidth: 12 },
          { header: 'Coste unitario', key: 'unit_cost', type: 'currency', minWidth: 14 },
          { header: 'Proveedor', key: 'supplier', minWidth: 18 },
          { header: 'IMEI', key: 'imei', minWidth: 18 },
          { header: 'Nº Serie', key: 'serial', minWidth: 16 },
          { header: '📍 Ubicación', key: 'storage_location', minWidth: 18 },
          { header: 'Descripción', key: 'description', minWidth: 24 },
        ],
        rows: dataRows,
      });
      downloadXlsx(buffer, `inventario_${new Date().toISOString().slice(0, 10)}`);
      const truncated = totalCount > rows.length;
      toast.success(
        `Excel exportado: ${rows.length} repuesto(s)${truncated ? ` (tope ${EXPORT_MAX_ROWS}; hay ${totalCount} con estos filtros)` : ''}`,
        { id: toastId }
      );
    } catch {
      toast.error('Error al generar el Excel', { id: toastId });
    }
  };

  const reloadProducts = async () => {
    await loadProductsPage();
    toast.success('Lista actualizada');
  };

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Repuestos</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'gap-1.5',
              autoLoadSaved && 'bg-primary/10 text-primary border-primary/30'
            )}
            onClick={() => togglePinSavedFilters()}
            title={
              autoLoadSaved
                ? 'Dejar de cargar filtros guardados al entrar'
                : 'Fijar filtros actuales y guardarlos para la próxima visita'
            }
          >
            {autoLoadSaved ? (
              <Pin className="h-4 w-4 mr-1" />
            ) : (
              <PinOff className="h-4 w-4 mr-1" />
            )}
            {autoLoadSaved ? 'Filtros fijados' : 'Fijar filtros'}
          </Button>
          <Button size="sm" variant="outline">
            Resumen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void exportProductsXlsx()}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Exportar Excel
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                Acciones
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  void exportProductsXlsx();
                }}
              >
                <FileDown className="h-4 w-4" />
                Exportar Excel (filtro actual)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  void reloadProducts();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Recargar desde servidor
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  setIsImportModalOpen(true);
                }}
              >
                <Upload className="h-4 w-4" />
                Importar Excel/CSV…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Crear Repuesto
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters ? (
        <Card className="mb-4 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6 sm:col-span-2">
                <label className="text-xs text-gray-500 block mb-1">ID</label>
                <Input
                  placeholder="Introducir ID"
                  value={filters.id}
                  onChange={(e) => setFilters({ ...filters, id: e.target.value })}
                  className="h-8 text-xs border-gray-300 focus-visible:ring-primary"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                <Input
                  placeholder="Introducir nombre"
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="h-8 text-xs border-gray-300 focus-visible:ring-primary"
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <InventoryCategoryTreeSelect
                  label="Categoría"
                  placeholder="Seleccionar categoría"
                  distinctCategories={distinctCategories}
                  value={filters.categories}
                  onChange={(categories) => setFilters({ ...filters, categories })}
                  disabled={loading}
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <InventoryMultiSelect
                  label="Marca"
                  placeholder="Seleccionar marca"
                  options={brandOptions}
                  value={filters.brands}
                  onChange={(brands) => setFilters({ ...filters, brands })}
                  disabled={loading}
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <InventoryMultiSelect
                  label="Modelo"
                  placeholder="Seleccionar modelo"
                  options={modelOptions}
                  value={filters.models}
                  onChange={(models) => setFilters({ ...filters, models })}
                  disabled={loading}
                />
              </div>

              <div className="col-span-6 sm:col-span-1">
                <label className="text-xs text-gray-500 block mb-1">SKU/UPC</label>
                <Input
                  placeholder="SKU o UPC"
                  value={filters.skuUpc}
                  onChange={(e) => setFilters({ ...filters, skuUpc: e.target.value })}
                  className="h-8 text-xs border-gray-300 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 mt-3">
              <div className="col-span-6 sm:col-span-2">
                <label className="text-xs text-gray-500 block mb-1">IMEI</label>
                <Input
                  placeholder="Introducir IMEI"
                  value={filters.imei}
                  onChange={(e) => setFilters({ ...filters, imei: e.target.value })}
                  className="h-8 text-xs border-gray-300 focus-visible:ring-primary"
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Serie</label>
                <Input
                  placeholder="Introducir número de serie"
                  value={filters.serial}
                  onChange={(e) => setFilters({ ...filters, serial: e.target.value })}
                  className="h-8 text-xs border-gray-300 focus-visible:ring-primary"
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <InventoryMultiSelect
                  label="Proveedor"
                  placeholder="Seleccionar proveedor"
                  options={supplierOptions}
                  value={filters.suppliers}
                  onChange={(suppliers) => setFilters({ ...filters, suppliers })}
                  disabled={loading}
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Condición</label>
                <select
                  value={filters.condition}
                  onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
                  className="w-full h-8 text-xs border border-gray-300 rounded px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Cualquiera</option>
                  <option value="New">Nuevo</option>
                  <option value="Used">Usado</option>
                  <option value="Refurbished">Reacondicionado</option>
                  <option value="Idle">Sin movimiento</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-2">
                <InventoryMultiSelect
                  label="Criterios"
                  placeholder="Seleccionar criterios"
                  options={CRITERIA_OPTIONS}
                  value={filters.criteria}
                  onChange={(criteria) => setFilters({ ...filters, criteria })}
                />
              </div>

              <div className="col-span-6 sm:col-span-2 flex items-end pb-0.5">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <Checkbox
                    checked={filters.hideOutOfStock}
                    onCheckedChange={(c) =>
                      setFilters({ ...filters, hideOutOfStock: c === true })
                    }
                    className="border-gray-300 data-[state=checked]:bg-primary"
                  />
                  Ocultar sin stock
                </label>
              </div>
            </div>

            {(filters.criteria.includes('storage_location') ||
              filters.criteria.includes('date_from') ||
              filters.criteria.includes('date_to')) && (
              <div className="grid grid-cols-12 gap-3 mt-3 rounded-md border border-dashed border-gray-300 bg-primary/5 p-3">
                {filters.criteria.includes('storage_location') ? (
                  <div className="col-span-12 sm:col-span-4">
                    <label className="text-xs text-gray-600 block mb-1">Ubicación física</label>
                    <Input
                      placeholder="Filtrar por ubicación en almacén"
                      value={filters.storageLocation}
                      onChange={(e) => setFilters({ ...filters, storageLocation: e.target.value })}
                      className="h-8 text-xs border-gray-300 focus-visible:ring-primary"
                    />
                  </div>
                ) : null}
                {filters.criteria.includes('date_from') ? (
                  <div className="col-span-6 sm:col-span-3">
                    <label className="text-xs text-gray-600 block mb-1">Desde fecha (alta)</label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="h-8 text-xs border-gray-300 focus-visible:ring-primary"
                    />
                  </div>
                ) : null}
                {filters.criteria.includes('date_to') ? (
                  <div className="col-span-6 sm:col-span-3">
                    <label className="text-xs text-gray-600 block mb-1">Hasta fecha (alta)</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="h-8 text-xs border-gray-300 focus-visible:ring-primary"
                    />
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex flex-col gap-3 mt-4 pt-3 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Resultados con filtros aplicados:{' '}
                <span className="font-semibold text-gray-700">{totalCount}</span>
                {totalCount > 0 ? (
                  <span className="text-gray-400">
                    {' '}
                    · página {page} de {totalPages} ({pageSize} por página)
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reiniciar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => persistSavedFilters()}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Guardar filtro
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => runSearch()}
                >
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs text-primary hover:underline flex items-center"
        >
          <Filter className="h-3 w-3 mr-1" />
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
        <span className="text-xs text-gray-400">|</span>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => persistSavedFilters()}
        >
          Guardar filtros
        </button>
      </div>

      {/* Products Table */}
      <Card className="shadow-sm overflow-hidden">
        {products.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 border-b border-gray-200 bg-slate-50/90">
            <div className="flex items-center gap-2 min-w-0">
              <Checkbox
                id="inv-select-all"
                checked={
                  allPageSelected ? true : somePageSelected ? 'indeterminate' : false
                }
                onCheckedChange={() => toggleSelectAllPage()}
                className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label htmlFor="inv-select-all" className="text-sm text-gray-800 cursor-pointer select-none">
                <span className="font-semibold text-primary">{selectedProductIds.size}</span>{' '}
                seleccionado{selectedProductIds.size === 1 ? '' : 's'} · esta página
              </label>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-primary text-white hover:bg-primary/90"
                  disabled={selectedProductIds.size === 0}
                >
                  Acciones masivas
                  <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm"
                  disabled={selectedProductIds.size === 0}
                  onSelect={(e) => {
                    e.preventDefault();
                    handlePrintSelectedLabels();
                  }}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir etiquetas
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm text-red-600 focus:text-red-700 focus:bg-red-50"
                  disabled={selectedProductIds.size === 0}
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleBulkDeleteSelected();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar solo de este taller
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 w-10 text-center font-medium text-gray-600">
                  <span className="sr-only">Seleccionar</span>
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-600 w-12">ID</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 w-16">Imagen</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">SKU</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">UPC</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">Categoría</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">Marca</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">Modelo</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600 min-w-[200px]">Nombre</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">Condición</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">En stock</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">Alerta stock</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">Nivel reorden</th>
                <th className="px-2 py-2 text-right font-medium text-gray-600">Precio</th>
                <th className="px-2 py-2 text-right font-medium text-gray-600">Coste unit.</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">📍 Ubicación</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={17} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center py-8 text-gray-500">
                    No hay repuestos que coincidan
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-center align-middle">
                      <Checkbox
                        checked={selectedProductIds.has(product.id)}
                        onCheckedChange={(v) => toggleRowSelected(product.id, v === true)}
                        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary mx-auto"
                        aria-label={`Seleccionar ${product.name}`}
                      />
                    </td>
                    <td className="px-2 py-2 text-gray-700">{product.product_id}</td>
                    <td className="px-2 py-2 text-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-8 h-8 object-cover rounded mx-auto" />
                      ) : (
                        <button className="text-primary hover:underline text-xs">Añadir</button>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {product.sku ? (
                        <span className="text-gray-700">{product.sku}</span>
                      ) : (
                        <button className="text-primary hover:underline text-xs">Añadir</button>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {product.upc ? (
                        <span className="text-gray-700">{product.upc}</span>
                      ) : (
                        <button className="text-primary hover:underline text-xs">Añadir</button>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-primary hover:underline cursor-pointer">
                        {product.category || 'Seleccionar'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-primary hover:underline cursor-pointer">
                        {product.brand || 'Seleccionar'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-primary hover:underline cursor-pointer">
                        {product.model || 'Seleccionar'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-gray-800">{product.name}</div>
                    </td>
                    <td className="px-2 py-2">
                      <span className={cn(
                        "text-primary hover:underline cursor-pointer",
                        product.condition === 'New' && "text-green-600",
                        product.condition === 'Used' && "text-amber-600",
                      )}>
                        {etiquetaCondicion(product.condition)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={cn(
                        "font-medium px-2 py-0.5 rounded-full text-xs",
                        product.quantity <= 0 ? "bg-red-100 text-red-700" :
                        product.stock_warning > 0 && product.quantity <= product.stock_warning ? "bg-amber-100 text-amber-700" :
                        "text-gray-700"
                      )}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center text-gray-700">{product.stock_warning}</td>
                    <td className="px-2 py-2 text-center text-gray-700">{product.reorder_level}</td>
                    <td className="px-2 py-2 text-right text-gray-700">
                      {sym} {product.price.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right text-gray-700">
                      {sym} {product.unit_cost.toFixed(2)}
                    </td>
                    <td className="px-2 py-2">
                      {product.storage_location ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium whitespace-nowrap">
                          📍 {product.storage_location}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Pencil className="h-3 w-3 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalCount > 0 ? (
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
                {INVENTORY_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-gray-500">
                {fromRow}–{toRow} de {totalCount}
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
        ) : null}
      </Card>

      {/* Help Button */}
      <button className="fixed bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors">
        <span className="font-bold">?</span>
      </button>

      {/* Product Modal (Create/Edit) */}
      <ProductModal
        isOpen={isCreateModalOpen || !!editingProduct}
        product={editingProduct}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={() => {
          void loadProductsPage();
          if (storageScope) void loadFacets(storageScope.orgId, storageScope.userId);
          setIsCreateModalOpen(false);
          setEditingProduct(null);
        }}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={() => {
          void loadProductsPage();
          if (storageScope) void loadFacets(storageScope.orgId, storageScope.userId);
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
}

// Product Modal Component
function ProductModal({
  isOpen,
  product,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const loc = useOrgLocale();
  const sym = loc.symbol;
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    upc: '',
    category: '',
    brand: '',
    model: '',
    condition: '',
    quantity: 0,
    stock_warning: 0,
    reorder_level: 0,
    price: 0,
    unit_cost: 0,
    supplier: '',
    imei: '',
    serial: '',
    description: '',
    storage_location: '',
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: '',
        sku: '',
        upc: '',
        category: '',
        brand: '',
        model: '',
        condition: '',
        quantity: 0,
        stock_warning: 0,
        reorder_level: 0,
        price: 0,
        unit_cost: 0,
        supplier: '',
        imei: '',
        serial: '',
        description: '',
        storage_location: '',
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('El nombre del repuesto es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión');
        return;
      }

      const orgId = await getActiveOrganizationId(supabase);
      const payload = {
        ...formData,
        user_id: user.id,
        organization_id: orgId,
        product_id: product?.product_id || Math.floor(Math.random() * 100000).toString(),
      };

      if (product) {
        // Update existing
        const { error } = await (supabase as any)
          .from('products')
          .update(payload)
          .eq('id', product.id);
        if (error) throw error;
        toast.success('Repuesto actualizado correctamente');
      } else {
        // Create new
        const { error } = await (supabase as any)
          .from('products')
          .insert([payload]);
        if (error) throw error;
        toast.success('Repuesto creado correctamente');
      }
      onSave();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#2d2d2d]" />
            {product ? 'Editar Repuesto' : 'Crear Nuevo Repuesto'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Basic Info */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Información Básica</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Repuesto *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Pantalla iPhone 14 Pro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full h-10 px-3 border rounded-md text-sm"
            >
              <option value="">Seleccionar categoría</option>
              <option value="PANTALLAS">PANTALLAS</option>
              <option value="BATERIAS">BATERIAS</option>
              <option value="CARGADORES">CARGADORES</option>
              <option value="CABLES">CABLES</option>
              <option value="FLEX">FLEX</option>
              <option value="CARCASAS">CARCASAS</option>
              <option value="CAMARAS">CAMARAS</option>
              <option value="APPLE">APPLE</option>
              <option value="SAMSUNG">SAMSUNG</option>
              <option value="XIAOMI">XIAOMI</option>
              <option value="VARIOS">VARIOS</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <select
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full h-10 px-3 border rounded-md text-sm"
            >
              <option value="">Seleccionar marca</option>
              <option value="APPLE">APPLE</option>
              <option value="SAMSUNG">SAMSUNG</option>
              <option value="XIAOMI">XIAOMI</option>
              <option value="HUAWEI">HUAWEI</option>
              <option value="OPPO">OPPO</option>
              <option value="MOTOROLA">MOTOROLA</option>
              <option value="DYSON">DYSON</option>
              <option value="GENERICO">GENERICO</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="Ej: iPhone 14 Pro"
            />
          </div>

          {/* SKU & Codes */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1 mt-2">Códigos y SKU</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="Código SKU"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="upc">UPC/Código de barras</Label>
            <Input
              id="upc"
              value={formData.upc}
              onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
              placeholder="Código UPC"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imei">IMEI (si aplica)</Label>
            <Input
              id="imei"
              value={formData.imei}
              onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
              placeholder="Número IMEI"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial">Número de Serie</Label>
            <Input
              id="serial"
              value={formData.serial}
              onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
              placeholder="Número de serie"
            />
          </div>

          {/* Stock */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1 mt-2">Inventario</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad en Stock</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_warning">Advertencia de Stock</Label>
            <Input
              id="stock_warning"
              type="number"
              value={formData.stock_warning}
              onChange={(e) => setFormData({ ...formData, stock_warning: parseInt(e.target.value) || 0 })}
              placeholder="Nivel de advertencia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reorder_level">Nivel de Reorden</Label>
            <Input
              id="reorder_level"
              type="number"
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
              placeholder="Cantidad para reordenar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condición</Label>
            <select
              id="condition"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full h-10 px-3 border rounded-md text-sm"
            >
              <option value="">Seleccionar condición</option>
              <option value="New">Nuevo</option>
              <option value="Used">Usado</option>
              <option value="Refurbished">Reacondicionado</option>
              <option value="Idle">Sin movimiento</option>
            </select>
          </div>

          {/* ── Ubicación física (Logística / Picking) ─────────────────── */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1 mt-2 flex items-center gap-1.5">
              📍 Ubicación en almacén
            </h3>
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="storage_location">
              Ubicación
              <span className="text-gray-400 font-normal ml-1 text-xs">(ej: Cajón A-2, Estante B Fila 3, Caja Azul)</span>
            </Label>
            <Input
              id="storage_location"
              value={formData.storage_location ?? ''}
              onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
              placeholder="Ej: Cajón A · Fila 2"
            />
          </div>

          {/* Pricing */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1 mt-2">Precios</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio de Venta ({sym})</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit_cost">Costo Unitario ({sym})</Label>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Supplier */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1 mt-2">Proveedor</h3>
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="supplier">Nombre del Proveedor</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Nombre del proveedor"
            />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1 mt-2">Descripción</h3>
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="description">Notas/Descripción</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción o notas del repuesto"
              className="w-full h-20 px-3 py-2 border rounded-md text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button className="bg-primary text-white hover:bg-primary/90" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {product ? 'Guardar Cambios' : 'Crear Repuesto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
