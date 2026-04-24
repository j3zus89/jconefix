'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';

type Snapshot = {
  by_status: Record<string, number>;
  by_plan: Record<string, number>;
  trials_expiring_14d: number;
  tickets_7d: number;
  tickets_30d: number;
  orgs_total: number;
};

function MiniCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/analytics/snapshot?t=${Date.now()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setSnap(json.data);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const planRows = useMemo(() => {
    const p = snap?.by_plan || {};
    return Object.entries(p).sort((a, b) => (b[1] as number) - (a[1] as number));
  }, [snap]);

  const statusRows = useMemo(() => {
    const s = snap?.by_status || {};
    return Object.entries(s).sort((a, b) => (b[1] as number) - (a[1] as number));
  }, [snap]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">KPIs globales por plan/estado y volumen.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm"
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MiniCard label="Orgs (total)" value={loading ? '—' : snap?.orgs_total ?? 0} />
        <MiniCard label="Tickets 7d" value={loading ? '—' : snap?.tickets_7d ?? 0} />
        <MiniCard label="Tickets 30d" value={loading ? '—' : snap?.tickets_30d ?? 0} />
        <MiniCard
          label="Trials expiran 14d"
          value={loading ? '—' : snap?.trials_expiring_14d ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="font-semibold text-gray-900">Distribución por plan</div>
          <div className="text-sm text-gray-500 mt-1">Conteo de organizaciones por `subscription_plan`.</div>
          <div className="mt-4 space-y-2">
            {planRows.length === 0 ? (
              <div className="text-sm text-gray-500">—</div>
            ) : (
              planRows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{k}</span>
                  <span className="text-gray-900">{v}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="font-semibold text-gray-900">Distribución por estado</div>
          <div className="text-sm text-gray-500 mt-1">Estado efectivo (trial/active/suspended/expired).</div>
          <div className="mt-4 space-y-2">
            {statusRows.length === 0 ? (
              <div className="text-sm text-gray-500">—</div>
            ) : (
              statusRows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{k}</span>
                  <span className="text-gray-900">{v}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

