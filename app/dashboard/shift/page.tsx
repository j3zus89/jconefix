'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, ClipboardList, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ShiftPage() {
  const supabase = createClient();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveShift();
    loadTechnicians();
  }, []);

  const loadActiveShift = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('shifts')
        .select('*, tickets(*)')
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('status', 'active')
        .single();

      setActiveShift(data);
      if (data?.tickets) setTickets(data.tickets);
    } catch (error) {
      console.error('Error loading shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('technicians')
        .select('*')
        .eq('shop_owner_id', user.id)
        .eq('is_active', true);

      setTechnicians(data || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const startShift = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      await supabase.from('shifts').insert({
        user_id: user.id,
        date: today,
        start_time: new Date().toISOString(),
        status: 'active',
      });

      toast.success('Turno iniciado correctamente');
      loadActiveShift();
    } catch (error: any) {
      toast.error('Error al iniciar turno: ' + error.message);
    }
  };

  const endShift = async () => {
    try {
      if (!activeShift) return;

      await supabase
        .from('shifts')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', activeShift.id);

      toast.success('Turno finalizado correctamente');
      setActiveShift(null);
    } catch (error: any) {
      toast.error('Error al finalizar turno: ' + error.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Comienzo de Turno</h1>

      {/* Shift Status Card */}
      <Card className={cn("mb-6", activeShift ? "border-primary" : "border-gray-200")}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                activeShift ? "bg-primary" : "bg-gray-100 text-gray-500"
              )}>
                <Clock className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {activeShift ? 'Turno Activo' : 'Sin Turno Activo'}
                </h2>
                <p className="text-gray-500">
                  {activeShift
                    ? `Iniciado a las ${new Date(activeShift.start_time).toLocaleTimeString('es-ES')}`
                    : 'Inicia un turno para comenzar'}
                </p>
              </div>
            </div>
            <div>
              {!activeShift ? (
                <Button
                  size="lg"
                  onClick={startShift}
                  className="bg-primary hover:bg-primary"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Iniciar Turno
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={endShift}
                  variant="destructive"
                >
                  <Pause className="h-5 w-5 mr-2" />
                  Finalizar Turno
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5 text-primary" />
              Tickets del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{tickets.length}</div>
            <p className="text-sm text-gray-500">tickets asignados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Técnicos Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{technicians.length}</div>
            <p className="text-sm text-gray-500">técnicos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-gray-800">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-primary text-white hover:bg-primary">
              Ver tickets pendientes
            </Button>
            <Button className="bg-primary text-white hover:bg-primary">
              Asignar trabajo
            </Button>
            <Button className="bg-primary text-white hover:bg-primary">
              Ver inventario
            </Button>
            <Button className="bg-primary text-white hover:bg-primary">
              Reportar incidencia
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
