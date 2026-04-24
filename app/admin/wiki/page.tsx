'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import {
  BookOpen, Plus, Pencil, Trash2, Save, X, Search,
  Bot, Tag, ChevronDown, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Article = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  { value: 'general',       label: 'General' },
  { value: 'tickets',       label: 'Tickets' },
  { value: 'facturación',   label: 'Facturación' },
  { value: 'inventario',    label: 'Inventario' },
  { value: 'pos',           label: 'Punto de Venta' },
  { value: 'configuración', label: 'Configuración' },
  { value: 'técnico',       label: 'Técnico' },
  { value: 'pagos',         label: 'Pagos' },
];

function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

const CATEGORY_COLORS: Record<string, string> = {
  general:       'bg-slate-100 text-slate-700',
  tickets:       'bg-blue-100 text-blue-700',
  'facturación': 'bg-emerald-100 text-emerald-700',
  inventario:    'bg-violet-100 text-violet-700',
  pos:           'bg-orange-100 text-orange-700',
  'configuración':'bg-yellow-100 text-yellow-700',
  'técnico':     'bg-rose-100 text-rose-700',
  pagos:         'bg-pink-100 text-pink-700',
};

// ─── Componente Modal ────────────────────────────────────────────────────────

type ModalProps = {
  initial?: Article | null;
  onSave: (title: string, content: string, category: string) => Promise<void>;
  onClose: () => void;
  saving: boolean;
};

function ArticleModal({ initial, onSave, onClose, saving }: ModalProps) {
  const [title,    setTitle]    = useState(initial?.title    ?? '');
  const [content,  setContent]  = useState(initial?.content  ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const chars = content.length;
  const isNew = !initial;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#F5C518]" />
            {isNew ? 'Nuevo artículo de Wiki' : 'Editar artículo'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto">
          {/* Título */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ej: Cómo añadir un producto al inventario"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#F5C518] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Categoría
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#F5C518] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20 pr-10"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Contenido */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Contenido <span className="text-red-400">*</span>
              </label>
              <span className={cn('text-xs', chars > 4500 ? 'text-red-500 font-semibold' : 'text-slate-400')}>
                {chars} / 5000
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
              rows={10}
              placeholder={`Escribe la solución paso a paso.\n\nEj:\n1. Ve a Inventario → Productos.\n2. Pulsa "Nuevo producto".\n3. Rellena los campos y guarda.\n\nEl bot usará SOLO este texto para responder a los clientes.`}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 leading-relaxed focus:border-[#F5C518] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20"
            />
            <p className="mt-1.5 text-xs text-slate-400 flex items-start gap-1.5">
              <Bot className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#F5C518]" />
              Gemini usará este texto literalmente. Sé claro y conciso — sin jerga interna.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(title.trim(), content.trim(), category)}
            disabled={saving || !title.trim() || !content.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D4A915] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isNew ? 'Crear artículo' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function WikiPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modal,    setModal]    = useState<'new' | Article | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast,    setToast]    = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await adminFetch('/api/admin/support-bot/wiki');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar artículos');
      setArticles(json.articles ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadArticles(); }, []);

  const handleSave = async (title: string, content: string, category: string) => {
    if (!title || !content) {
      showToast('err', 'Título y contenido son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'new') {
        const res  = await adminFetch('/api/admin/support-bot/wiki', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, category }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error al crear');
        setArticles((prev) => [json.article, ...prev]);
        showToast('ok', 'Artículo creado correctamente.');
      } else if (modal && typeof modal === 'object') {
        const res  = await adminFetch(`/api/admin/support-bot/wiki?id=${modal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, category }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error al actualizar');
        setArticles((prev) => prev.map((a) => (a.id === modal.id ? json.article : a)));
        showToast('ok', 'Artículo actualizado.');
      }
      setModal(null);
    } catch (e: unknown) {
      showToast('err', e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este artículo? El bot ya no podrá usarlo.')) return;
    setDeleting(id);
    try {
      const res = await adminFetch(`/api/admin/support-bot/wiki?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Error al eliminar');
      }
      setArticles((prev) => prev.filter((a) => a.id !== id));
      showToast('ok', 'Artículo eliminado.');
    } catch (e: unknown) {
      showToast('err', e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  // Filtrado local
  const filtered = articles.filter((a) => {
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || a.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-5 right-5 z-[100] flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl',
            toast.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200',
          )}
        >
          {toast.type === 'ok'
            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5C518]/10">
              <BookOpen className="h-5 w-5 text-[#F5C518]" />
            </div>
            Wiki del Bot
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-lg">
            Añade artículos de soluciones y el bot de Gemini los usará como contexto para responder a los clientes.
            Cuanto más detallados, mejores respuestas.
          </p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D4A915] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo artículo
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#F5C518]/20 bg-[#F5C518]/5 px-4 py-3.5">
        <Bot className="h-5 w-5 text-[#F5C518] mt-0.5 shrink-0" />
        <div className="text-sm text-slate-700 leading-relaxed">
          <span className="font-semibold">¿Cómo funciona?</span>{' '}
          Cuando un cliente escribe, Gemini busca los{' '}
          <span className="font-semibold">3 artículos más relevantes</span>{' '}
          de esta Wiki y responde con ellos. Si no encuentra solución, envía automáticamente{' '}
          <span className="font-semibold text-[#F5C518]">[TRANSFERIR]</span>{' '}
          y te notifica con prioridad alta.
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar artículos..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:border-[#F5C518] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20"
          />
        </div>
        <div className="relative">
          <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2.5 text-sm focus:border-[#F5C518] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
        <span className="text-sm text-slate-400 ml-auto">
          {filtered.length} artículo{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Estado de carga / error */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[#F5C518]" />
        </div>
      )}
      {error && !loading && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button
            onClick={loadArticles}
            className="text-sm text-[#F5C518] underline underline-offset-2 hover:text-[#D4A915]"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Lista de artículos */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <BookOpen className="h-10 w-10 text-slate-300" />
          <div>
            <p className="font-semibold text-slate-500">
              {articles.length === 0 ? 'La Wiki está vacía' : 'Sin resultados para este filtro'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {articles.length === 0
                ? 'Crea tu primer artículo y el bot empezará a usarlo.'
                : 'Prueba con otras palabras o categoría.'}
            </p>
          </div>
          {articles.length === 0 && (
            <button
              onClick={() => setModal('new')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D4A915] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Crear primer artículo
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((article) => (
            <div
              key={article.id}
              className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#F5C518]/30 hover:shadow-md transition-all"
            >
              {/* Cabecera */}
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide shrink-0 mt-0.5',
                    CATEGORY_COLORS[article.category] ?? 'bg-slate-100 text-slate-600',
                  )}
                >
                  {categoryLabel(article.category)}
                </span>
                <h3 className="flex-1 text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                  {article.title}
                </h3>
              </div>

              {/* Preview contenido */}
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                {article.content}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  {new Date(article.updated_at).toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal(article)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    disabled={deleting === article.id}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    {deleting === article.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modal !== null && (
        <ArticleModal
          initial={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
