'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Loader2, Save, Trash2 } from 'lucide-react';
import { adminFetch } from '@/lib/auth/adminFetch';

const MAX = 2000;

export default function AdminBroadcastPage() {
  const [draft, setDraft] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/system-broadcast');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      const msg = typeof j.data?.message === 'string' ? j.data.message : '';
      setDraft(msg.slice(0, MAX));
      setSavedAt(typeof j.data?.updated_at === 'string' ? j.data.updated_at : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (clear: boolean) => {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const message = clear ? '' : draft.trim().slice(0, MAX);
      const res = await adminFetch('/api/admin/system-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      setDraft(typeof j.data?.message === 'string' ? j.data.message : message);
      setSavedAt(typeof j.data?.updated_at === 'string' ? j.data.updated_at : new Date().toISOString());
      setOkMsg(clear ? 'Mensaje borrado. El banner ya no se muestra en los talleres.' : 'Publicado. Los técnicos lo verán arriba del panel.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0f766e]">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">La voz del dueño</h1>
          <p className="mt-1 text-sm text-slate-600">
            Aviso global para <strong>todos los técnicos</strong>: mantenimiento, novedades del producto o incidencias.
            Aparece en un <strong>banner superior</strong> dentro del panel del taller (no reemplaza al soporte por chat).
          </p>
          {savedAt && !loading && (
            <p className="mt-1 text-xs text-slate-400">
              Último guardado: {new Date(savedAt).toLocaleString('es-AR')}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {okMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{okMsg}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="broadcast-body" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Mensaje (texto plano, máx. {MAX} caracteres)
        </label>
        <textarea
          id="broadcast-body"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          disabled={loading || saving}
          rows={5}
          placeholder='Ej.: "Actualizamos el motor de IA para pulir textos; si ves algo raro, avisá por soporte."'
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0d9488]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 disabled:opacity-60"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{draft.length} / {MAX}</span>
          <span>Los usuarios pueden cerrar el banner en su sesión; si cambiás el texto, volverá a mostrarse.</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void save(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0f766e] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publicar en paneles
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void save(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Borrar aviso
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}
