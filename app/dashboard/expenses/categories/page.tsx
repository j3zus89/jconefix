'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pencil, Plus, Trash2, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  ensureExpenseCategoriesSeeded,
  fetchExpenseCategoryRows,
  type ExpenseCategoryRow,
} from '@/lib/expense-categories-api';
import { humanizeExpenseCategoriesError } from '@/lib/supabase-setup-hints';

export default function ExpenseCategoriesPage() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<ExpenseCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategoryRow | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('');
  const [expenseCountForDelete, setExpenseCountForDelete] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const oid = await getActiveOrganizationId(supabase);
      setOrgId(oid);
      if (!oid) {
        setRows([]);
        return;
      }
      await ensureExpenseCategoriesSeeded(supabase, oid);
      const list = await fetchExpenseCategoryRows(supabase, oid);
      setRows(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar las categorías';
      toast.error(humanizeExpenseCategoriesError(msg));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (r: ExpenseCategoryRow) => {
    setEditingId(r.id);
    setEditValue(r.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!orgId || !editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    const prev = rows.find((r) => r.id === editingId);
    if (!prev || prev.name === trimmed) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      const { error: uErr } = await supabase
        .from('expense_categories')
        .update({ name: trimmed })
        .eq('id', editingId)
        .eq('organization_id', orgId);
      if (uErr) {
        toast.error(uErr.message.includes('unique') ? 'Ya existe una categoría con ese nombre' : uErr.message);
        return;
      }
      const { error: eErr } = await supabase
        .from('expenses')
        .update({ category: trimmed })
        .eq('organization_id', orgId)
        .eq('category', prev.name);
      if (eErr) {
        toast.error(eErr.message);
        return;
      }
      toast.success('Categoría actualizada');
      cancelEdit();
      void load();
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setAddName('');
    setAddOpen(true);
  };

  const submitAdd = async () => {
    if (!orgId) return;
    const trimmed = addName.trim();
    if (!trimmed) {
      toast.error('Indica un nombre');
      return;
    }
    const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order), -1);
    setSaving(true);
    try {
      const { error } = await supabase.from('expense_categories').insert({
        organization_id: orgId,
        name: trimmed,
        sort_order: maxSort + 1,
      });
      if (error) {
        toast.error(error.message.includes('unique') ? 'Ya existe esa categoría' : error.message);
        return;
      }
      toast.success('Categoría creada');
      setAddOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const openDelete = async (r: ExpenseCategoryRow) => {
    if (!orgId) return;
    const { count, error } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('category', r.name);
    if (error) {
      toast.error(error.message);
      return;
    }
    const n = count ?? 0;
    setExpenseCountForDelete(n);
    setDeleteTarget(r);
    const others = rows.filter((x) => x.id !== r.id);
    setReassignTo(others.find((x) => x.name === 'Otros')?.name || others[0]?.name || '');
  };

  const confirmDelete = async () => {
    if (!orgId || !deleteTarget) return;
    setSaving(true);
    try {
      if (expenseCountForDelete > 0) {
        if (!reassignTo || reassignTo === deleteTarget.name) {
          toast.error('Elige otra categoría para reasignar los gastos');
          return;
        }
        const { error: mErr } = await supabase
          .from('expenses')
          .update({ category: reassignTo })
          .eq('organization_id', orgId)
          .eq('category', deleteTarget.name);
        if (mErr) {
          toast.error(mErr.message);
          return;
        }
      }
      const { error: dErr } = await supabase.from('expense_categories').delete().eq('id', deleteTarget.id);
      if (dErr) {
        toast.error(dErr.message);
        return;
      }
      toast.success('Categoría eliminada');
      setDeleteTarget(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías de gastos</h1>
          <p className="text-sm text-gray-500 mt-2">
            Editá, añadí o eliminá categorías. Los cambios de nombre se aplican a los gastos ya registrados de tu
            organización. Las categorías aparecen al crear o editar un gasto.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Button variant="outline" onClick={openAdd} disabled={!orgId || loading} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Añadir
          </Button>
          <Button asChild className="bg-primary hover:bg-primary">
            <Link href="/dashboard/expenses">Ir a gastos</Link>
          </Button>
        </div>
      </div>

      {!orgId && !loading ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay organización activa asignada a tu usuario. Las categorías de gastos son por taller; revisá tu perfil o
          contactá al administrador.
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Cargando…
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-center gap-2 min-h-[52px]"
            >
              {editingId === r.id ? (
                <>
                  <Input
                    className="h-9 flex-1 text-sm"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                  />
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => void saveEdit()} disabled={saving}>
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={cancelEdit} disabled={saving}>
                    <X className="h-4 w-4 text-gray-500" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-800 flex-1 truncate">{r.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-gray-500 hover:text-gray-800"
                    title="Renombrar"
                    onClick={() => startEdit(r)}
                    disabled={saving}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-gray-400 hover:text-red-600"
                    title="Eliminar"
                    onClick={() => void openDelete(r)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Nombre</Label>
            <Input className="h-9" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Ej. Impuestos" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-primary" disabled={saving} onClick={() => void submitAdd()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar categoría</DialogTitle>
          </DialogHeader>
          {deleteTarget ? (
            <div className="space-y-4 text-sm text-gray-700">
              <p>
                ¿Seguro que querés eliminar <strong>{deleteTarget.name}</strong>?
              </p>
              {expenseCountForDelete > 0 ? (
                <div className="space-y-2">
                  <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Hay {expenseCountForDelete} gasto(s) con esta categoría. Elegí otra categoría para reasignarlos.
                  </p>
                  <Label className="text-xs">Reasignar a</Label>
                  <Select value={reassignTo} onValueChange={setReassignTo}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {rows
                        .filter((x) => x.id !== deleteTarget.id)
                        .map((x) => (
                          <SelectItem key={x.id} value={x.name}>
                            {x.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-gray-500">No hay gastos con esta categoría.</p>
              )}
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={saving} onClick={() => void confirmDelete()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
