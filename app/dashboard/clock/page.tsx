'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  LogIn,
  LogOut,
  History,
  Coffee,
  PauseCircle,
  ClipboardList,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PunchType = 'in' | 'out' | 'break_start' | 'break_end';

type TimeRecord = {
  id: string;
  type: PunchType;
  timestamp: string;
  note: string | null;
  technician_id: string | null;
};

type TechnicianRow = { id: string; name: string };

/** Permisos por defecto al crear el empleado implícito del dueño (misma idea que en Configuración). */
const IMPLICIT_TECH_PERMISSIONS: Record<string, boolean> = {
  can_create_tickets: true,
  can_edit_tickets: true,
  can_delete_tickets: false,
  can_view_reports: false,
  can_manage_inventory: true,
  can_manage_customers: true,
  can_manage_settings: false,
  can_create_invoices: true,
  can_view_all_tickets: true,
  can_manage_pos: false,
  can_manage_expenses: false,
  can_export_data: false,
  can_collect_payment: false,
  can_open_drawer: false,
};

const TYPE_LABEL: Record<PunchType, string> = {
  in: 'Entrada',
  out: 'Salida',
  break_start: 'Inicio descanso',
  break_end: 'Fin descanso',
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Estado derivado del último fichaje del día (para el empleado seleccionado). */
function deriveShiftState(records: TimeRecord[]): 'out' | 'in' | 'break' {
  const sorted = [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const last = sorted[0];
  if (!last) return 'out';
  switch (last.type) {
    case 'out':
      return 'out';
    case 'in':
      return 'in';
    case 'break_start':
      return 'break';
    case 'break_end':
      return 'in';
    default:
      return 'out';
  }
}

export default function ClockPage() {
  const supabase = createClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shopLabel, setShopLabel] = useState<string>('Taller');
  const [technicians, setTechnicians] = useState<TechnicianRow[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [sheetRecords, setSheetRecords] = useState<TimeRecord[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingTechs, setLoadingTechs] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [punching, setPunching] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadShopAndTechs = useCallback(async () => {
    setLoadingTechs(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);

      if (orgId) {
        const { data: mem } = await supabase
          .from('organization_members')
          .select('organizations!inner(name)')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .maybeSingle();
        const org = mem?.organizations as { name?: string } | undefined;
        if (org?.name?.trim()) setShopLabel(org.name.trim());
      }

      const { data: shopRow } = await (supabase as any)
        .from('shop_settings')
        .select('shop_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (shopRow?.shop_name?.trim()) setShopLabel(shopRow.shop_name.trim());

      let tq = (supabase as any).from('technicians').select('id,name').eq('is_active', true).order('name');
      tq = orgId ? tq.eq('organization_id', orgId) : tq.eq('shop_owner_id', user.id);
      const { data: techs, error } = await tq;
      if (error) {
        console.error(error);
        toast.error('No se pudieron cargar empleados: ' + error.message);
        setTechnicians([]);
        return;
      }
      let list = (techs || []) as TechnicianRow[];

      // Sin empleados dados de alta: crear fila técnico para quien usa la cuenta (dueño / miembro) y poder fichar.
      if (list.length === 0 && user.email) {
        const fromMeta = String(user.user_metadata?.full_name ?? '').trim();
        const displayName =
          fromMeta || user.email.split('@')[0]?.trim() || 'Mi cuenta';
        const payload: Record<string, unknown> = {
          shop_owner_id: user.id,
          name: displayName,
          email: user.email,
          role: 'admin',
          is_active: true,
          color: 'bg-primary',
          permissions: IMPLICIT_TECH_PERMISSIONS,
          panel_user_id: user.id,
          clock_pin: null,
        };
        if (orgId) payload.organization_id = orgId;
        const { data: created, error: insErr } = await (supabase as any)
          .from('technicians')
          .insert([payload])
          .select('id,name')
          .single();
        if (!insErr && created?.id) {
          list = [created as TechnicianRow];
        } else if (insErr) {
          console.error('[clock] ensure self technician:', insErr);
          toast.error(
            'No se pudo crear un empleado para tu cuenta. Añade uno en Configuración → Gestionar empleados.'
          );
        }
      }

      setTechnicians(list);
      setSelectedTechId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id ?? '';
      });
    } finally {
      setLoadingTechs(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadShopAndTechs();
  }, [loadShopAndTechs]);

  const loadTodayRecords = useCallback(async () => {
    if (!selectedTechId) {
      setRecords([]);
      return;
    }
    setLoadingRecords(true);
    try {
      const start = startOfTodayIso();
      const end = endOfTodayIso();
      const { data, error } = await supabase
        .from('time_records')
        .select('id,type,timestamp,note,technician_id')
        .eq('technician_id', selectedTechId)
        .gte('timestamp', start)
        .lte('timestamp', end)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error(error);
        if (error.message.includes('time_records') || error.code === '42P01') {
          toast.error(
            'Falta tabla o función en Supabase. Ejecuta las migraciones 202604052300 y 202604052301 (fichaje).'
          );
        }
        setRecords([]);
        return;
      }
      setRecords((data as TimeRecord[]) || []);
    } finally {
      setLoadingRecords(false);
    }
  }, [supabase, selectedTechId]);

  useEffect(() => {
    void loadTodayRecords();
  }, [loadTodayRecords]);

  const shiftState = useMemo(() => deriveShiftState(records), [records]);

  const openSheet = async () => {
    if (!selectedTechId) {
      toast.message('Selecciona un empleado');
      return;
    }
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data, error } = await supabase
      .from('time_records')
      .select('id,type,timestamp,note,technician_id')
      .eq('technician_id', selectedTechId)
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSheetRecords((data as TimeRecord[]) || []);
    setSheetOpen(true);
  };

  const doPunch = async (type: PunchType) => {
    if (!selectedTechId) {
      toast.error('Selecciona un empleado');
      return;
    }
    setPunching(true);
    try {
      const { data, error } = await supabase.rpc('clock_punch', {
        p_technician_id: selectedTechId,
        p_type: type,
        p_pin: pin,
        p_note: note.trim() || null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const res = data as { ok?: boolean; error?: string } | null;
      if (!res?.ok) {
        const code = res?.error;
        if (code === 'bad_pin') toast.error('PIN incorrecto');
        else if (code === 'forbidden') toast.error('No tienes permiso para fichar a este empleado');
        else if (code === 'technician_not_found') toast.error('Empleado no encontrado');
        else toast.error(code || 'No se pudo registrar el fichaje');
        return;
      }
      toast.success(TYPE_LABEL[type] + ' registrada');
      setNote('');
      setShowNote(false);
      void loadTodayRecords();
    } finally {
      setPunching(false);
    }
  };

  const dateBar = currentTime.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusBlock = () => {
    if (shiftState === 'in') {
      return (
        <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-50 px-4 py-4 text-center">
          <p className="text-sm font-bold text-emerald-800">En jornada</p>
          <p className="text-xs text-emerald-700/80 mt-1">Puedes registrar salida o descanso</p>
        </div>
      );
    }
    if (shiftState === 'break') {
      return (
        <div className="rounded-xl border-2 border-amber-400/60 bg-amber-50 px-4 py-4 text-center">
          <p className="text-sm font-bold text-amber-900">En descanso</p>
          <p className="text-xs text-amber-800/80 mt-1">Finaliza el descanso al volver</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border-2 border-red-400/70 bg-red-50 px-4 py-4 text-center">
        <p className="text-sm font-bold text-red-800">Sin fichar / fuera de jornada</p>
        <p className="text-xs text-red-700/85 mt-1">Salida automática o pendiente de entrada</p>
      </div>
    );
  };

  const canIn = shiftState === 'out';
  const canOut = shiftState === 'in';
  const canBreakStart = shiftState === 'in';
  const canBreakEnd = shiftState === 'break';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reloj de Entrada / Salida</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ingrese su PIN para fichar entrada / salida (empleado y PIN de acceso).
          </p>
        </div>
      </div>

      {/* Barra taller + fecha */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm">
        <span className="font-semibold text-gray-800 truncate">{shopLabel}</span>
        <span className="text-gray-600 capitalize truncate max-w-[min(100%,20rem)]">{dateBar}</span>
      </div>

      {/* Reloj grande */}
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-5xl sm:text-6xl font-bold text-primary mb-2 tabular-nums">
            {currentTime.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
          <div className="text-gray-500 text-sm capitalize">{dateBar}</div>
        </CardContent>
      </Card>

      {/* Panel fichaje estilo referencia */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fichaje del empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-600">Nombre del empleado</Label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  disabled={loadingTechs}
                >
                  {technicians.length === 0 ? (
                    <option value="">— Sin empleados —</option>
                  ) : (
                    technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">PIN de acceso del empleado</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  className="mt-1 h-10"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Si el empleado no tiene PIN en Ajustes → Empleados, déjalo vacío.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado</p>
                {statusBlock()}
              </div>

              {!showNote ? (
                <button
                  type="button"
                  onClick={() => setShowNote(true)}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Añadir nota al próximo fichaje
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-gray-600">Nota (opcional)</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNote(false);
                        setNote('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Cerrar nota"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    className="w-full min-h-[72px] rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Comentario con el fichaje…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 text-sm font-semibold bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-800"
                  disabled={!selectedTechId || !canIn || punching}
                  onClick={() => void doPunch('in')}
                >
                  Entradas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 text-sm font-semibold bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-800"
                  disabled={!selectedTechId || !canOut || punching}
                  onClick={() => void doPunch('out')}
                >
                  Salidas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 text-sm font-semibold bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-800"
                  disabled={!selectedTechId || !canBreakStart || punching}
                  onClick={() => void doPunch('break_start')}
                >
                  Iniciar descanso
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 text-sm font-semibold bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-800"
                  disabled={!selectedTechId || !canBreakEnd || punching}
                  onClick={() => void doPunch('break_end')}
                >
                  Finalizar descanso
                </Button>
              </div>
              <Button
                type="button"
                className="w-full h-12 font-semibold bg-primary hover:bg-primary text-white border-0 hover:bg-primary/90"
                onClick={() => void openSheet()}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Ver planilla de control de horas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Atajos visuales (misma lógica) */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          size="lg"
          onClick={() => void doPunch('in')}
          disabled={!selectedTechId || !canIn || punching}
          className={cn(
            'bg-green-600 hover:bg-green-700 text-white px-6',
            (!selectedTechId || !canIn) && 'opacity-50'
          )}
        >
          <LogIn className="h-5 w-5 mr-2" />
          Registrar entrada
        </Button>
        <Button
          size="lg"
          onClick={() => void doPunch('out')}
          disabled={!selectedTechId || !canOut || punching}
          className={cn(
            'bg-red-600 hover:bg-red-700 text-white px-6',
            (!selectedTechId || !canOut) && 'opacity-50'
          )}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Registrar salida
        </Button>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              shiftState === 'out' && 'bg-gray-400',
              shiftState === 'in' && 'bg-green-500',
              shiftState === 'break' && 'bg-gray-500'
            )}
          />
          <span className="text-sm font-medium text-gray-700">
            {shiftState === 'out' && 'Fuera de trabajo'}
            {shiftState === 'in' && 'En el trabajo'}
            {shiftState === 'break' && 'En descanso'}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" />
            Registros de hoy
            {selectedTechId && (
              <span className="text-sm font-normal text-gray-500">
                — {technicians.find((t) => t.id === selectedTechId)?.name ?? ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <p className="text-gray-500 text-center py-6">Cargando…</p>
          ) : records.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No hay registros hoy</p>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        record.type === 'in' && 'bg-green-100 text-green-600',
                        record.type === 'out' && 'bg-red-100 text-red-600',
                        record.type === 'break_start' && 'bg-amber-100 text-amber-700',
                        record.type === 'break_end' && 'bg-sky-100 text-sky-700'
                      )}
                    >
                      {record.type === 'in' && <LogIn className="h-5 w-5" />}
                      {record.type === 'out' && <LogOut className="h-5 w-5" />}
                      {record.type === 'break_start' && <Coffee className="h-5 w-5" />}
                      {record.type === 'break_end' && <PauseCircle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{TYPE_LABEL[record.type]}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(record.timestamp).toLocaleString('es-ES')}
                      </p>
                      {record.note ? (
                        <p className="text-xs text-gray-600 mt-1 truncate" title={record.note}>
                          Nota: {record.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planilla de control de horas</DialogTitle>
            <p className="text-sm text-gray-500 font-normal">
              Últimos 30 días — {technicians.find((t) => t.id === selectedTechId)?.name ?? ''}
            </p>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden text-sm">
            <table className="w-full">
              <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Fecha y hora</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sheetRecords.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-gray-500">
                      Sin registros en este periodo
                    </td>
                  </tr>
                ) : (
                  sheetRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(r.timestamp).toLocaleString('es-ES')}
                      </td>
                      <td className="px-3 py-2">{TYPE_LABEL[r.type]}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={r.note ?? ''}>
                        {r.note || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
