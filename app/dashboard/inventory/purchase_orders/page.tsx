'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';

type Row = {
  id: string;
  supplier_name: string | null;
  reference: string | null;
  status: string | null;
  total: number | null;
  notes: string | null;
  created_at: string;
};

export default function PurchaseOrdersPage() {
  const loc = useOrgLocale();
  const sym = loc.symbol;
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplier_name: '',
    reference: '',
    status: 'abierta',
    total: '',
    notes: '',
  });

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = await getActiveOrganizationId(supabase);
    let q = (supabase as any).from('purchase_orders').select('*').order('created_at', { ascending: false });
    q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', user.id);
    const { data, error } = await q;
    if (error) {
      toast.error(error.message + ' · Migración 202604021500');
      setRows([]);
    } else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      const { error } = await (supabase as any).from('purchase_orders').insert([
        {
          user_id: user.id,
          organization_id: orgId,
          supplier_name: form.supplier_name.trim() || null,
          reference: form.reference.trim() || null,
          status: form.status.trim() || 'abierta',
          total: parseFloat(form.total || '0') || 0,
          notes: form.notes.trim() || null,
        },
      ]);
      if (error) throw error;
      toast.success('Orden registrada');
      setOpen(false);
      setForm({ supplier_name: '', reference: '', status: 'abierta', total: '', notes: '' });
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta orden?')) return;
    const { error } = await (supabase as any).from('purchase_orders').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Eliminada');
      load();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de compra</h1>
          <p className="text-sm text-gray-500 mt-1">Seguimiento básico de pedidos a proveedores.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva orden
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-14">No hay órdenes registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Ref.</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Total</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="p-3 text-gray-500">{new Date(r.created_at).toLocaleDateString('es-ES')}</td>
                  <td className="p-3">{r.supplier_name || '—'}</td>
                  <td className="p-3 font-mono text-xs">{r.reference || '—'}</td>
                  <td className="p-3 capitalize">{r.status || '—'}</td>
                  <td className="p-3 text-right tabular-nums">
                    {loc.format(Number(r.total || 0))}
                  </td>
                  <td className="p-3">
                    <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva orden de compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Proveedor</Label>
              <Input
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Referencia</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Total ({sym})</Label>
              <Input value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={save} disabled={saving}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
