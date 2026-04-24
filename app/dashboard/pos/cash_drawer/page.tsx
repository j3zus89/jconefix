'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';

export default function CashDrawerPage() {
  const loc = useOrgLocale();
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCash, setTodayCash] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data: orgRow } = await (supabase as any)
        .from('organizations')
        .select('id')
        .maybeSingle();
      const orgId = orgRow?.id ?? null;
      let q = (supabase as any)
        .from('pos_sales')
        .select('total, payment_method')
        .gte('created_at', start.toISOString());
      if (orgId) {
        q = q.eq('organization_id', orgId);
      } else {
        q = q.eq('user_id', user.id);
      }
      const { data, error } = await q;
      if (error) {
        toast.error(error.message + ' · Migración 202604021500');
        setLoading(false);
        return;
      }
      const list = data || [];
      setCount(list.length);
      setTodayTotal(list.reduce((a: number, r: { total?: number }) => a + Number(r.total || 0), 0));
      setTodayCash(
        list
          .filter((r: { payment_method?: string }) => r.payment_method === 'cash')
          .reduce((a: number, r: { total?: number }) => a + Number(r.total || 0), 0)
      );
      setLoading(false);
    };
    run();
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" />
            Caja (hoy)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de ventas POS registradas hoy.</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-white hover:bg-primary/90">
          <Link href="/dashboard/pos">POS</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs uppercase text-gray-500 font-semibold">Ventas hoy</p>
            <p className="text-3xl font-bold mt-2 tabular-nums">{count}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
            <p className="text-xs uppercase text-emerald-800 font-semibold">Total ingresado hoy</p>
            <p className="text-3xl font-bold text-emerald-900 mt-2 tabular-nums">
              {loc.format(todayTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs uppercase text-gray-500 font-semibold">Efectivo (método «cash»)</p>
            <p className="text-2xl font-semibold mt-2 tabular-nums">
              {loc.format(todayCash)}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Para arqueos formales, exporta o cruza con tu TPV físico. Este resumen solo refleja cobros registrados en la app.
          </p>
        </div>
      )}
    </div>
  );
}
