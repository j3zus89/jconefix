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
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

export default function SuppliersPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = await getActiveOrganizationId(supabase);
    let q = (supabase as any).from('suppliers').select('*').order('created_at', { ascending: false });
    q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', user.id);
    const { data, error } = await q;
    if (error) {
      toast.error(error.message + ' · Ejecuta la migración 202604021500 en Supabase si falta la tabla.');
      setRows([]);
    } else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Nombre obligatorio');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      const { error } = await (supabase as any).from('suppliers').insert([
        {
          user_id: user.id,
          organization_id: orgId,
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        },
      ]);
      if (error) throw error;
      toast.success('Proveedor creado');
      setOpen(false);
      setForm({ name: '', email: '', phone: '', notes: '' });
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return;
    const { error } = await (supabase as any).from('suppliers').delete().eq('id', id);
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
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">Directorio de proveedores de repuestos y servicios.</p>
        </div>
        <Button className="bg-[#0d9488] hover:bg-[#0f766e]" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo proveedor
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-14">Aún no hay proveedores.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Teléfono</th>
                <th className="text-left p-3">Notas</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-gray-600">{r.email || '—'}</td>
                  <td className="p-3 text-gray-600">{r.phone || '—'}</td>
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
            <DialogTitle>Nuevo proveedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-[#0d9488]" onClick={save} disabled={saving}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
