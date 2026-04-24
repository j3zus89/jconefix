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

type Row = {
  id: string;
  from_location: string | null;
  to_location: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
};

export default function InventoryTransfersPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    from_location: '',
    to_location: '',
    status: 'pendiente',
    notes: '',
  });

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = await getActiveOrganizationId(supabase);
    let q = (supabase as any).from('inventory_transfers').select('*').order('created_at', { ascending: false });
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
    if (!form.from_location.trim() || !form.to_location.trim()) {
      toast.error('Origen y destino son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      const { error } = await (supabase as any).from('inventory_transfers').insert([
        {
          user_id: user.id,
          organization_id: orgId,
          from_location: form.from_location.trim(),
          to_location: form.to_location.trim(),
          status: form.status.trim() || 'pendiente',
          notes: form.notes.trim() || null,
        },
      ]);
      if (error) throw error;
      toast.success('Transferencia registrada');
      setOpen(false);
      setForm({ from_location: '', to_location: '', status: 'pendiente', notes: '' });
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const { error } = await (supabase as any).from('inventory_transfers').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Eliminado');
      load();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transferencias</h1>
          <p className="text-sm text-gray-500 mt-1">Movimientos entre ubicaciones o almacenes.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva transferencia
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-14">No hay transferencias.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Origen</th>
                <th className="text-left p-3">Destino</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Notas</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="p-3 text-gray-500">{new Date(r.created_at).toLocaleDateString('es-ES')}</td>
                  <td className="p-3">{r.from_location}</td>
                  <td className="p-3">{r.to_location}</td>
                  <td className="p-3 capitalize">{r.status}</td>
                  <td className="p-3 text-gray-500 max-w-xs truncate">{r.notes || '—'}</td>
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
            <DialogTitle>Nueva transferencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Origen *</Label>
              <Input
                value={form.from_location}
                onChange={(e) => setForm({ ...form, from_location: e.target.value })}
                className="mt-1"
                placeholder="Ej. Almacén principal"
              />
            </div>
            <div>
              <Label>Destino *</Label>
              <Input
                value={form.to_location}
                onChange={(e) => setForm({ ...form, to_location: e.target.value })}
                className="mt-1"
                placeholder="Ej. Tienda calle Mayor"
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1" />
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
