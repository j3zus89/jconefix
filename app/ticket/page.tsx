'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Wrench, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle, Package, User, Calendar, ChevronRight } from 'lucide-react';
import { JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: Clock },
  entrada: { label: 'ENTRADA', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: Clock },
  en_proceso: { label: 'EN PROCESO', color: 'text-repairdesk-700', bg: 'bg-repairdesk-50 border-repairdesk-200', icon: Wrench },
  diagnostico: { label: 'DIAGNÓSTICO', color: 'text-repairdesk-700', bg: 'bg-repairdesk-50 border-repairdesk-200', icon: Search },
  presupuesto: { label: 'PRESUPUESTO', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: Clock },
  pendiente_pieza: { label: 'PENDIENTE DE PIEZA', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: Package },
  pendiente_cliente: { label: 'PENDIENTE CLIENTE', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: User },
  reparado: { label: 'REPARADO', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
  repaired_collected: { label: 'REPARADO Y RECOGIDO', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
  no_reparado: { label: 'NO REPARADO', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: AlertCircle },
  cancelled: { label: 'CANCELADO', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: AlertCircle },
  waiting_parts: { label: 'ESPERANDO PIEZAS', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: Package },
  in_progress: { label: 'EN PROCESO', color: 'text-repairdesk-700', bg: 'bg-repairdesk-50 border-repairdesk-200', icon: Wrench },
  completed: { label: 'COMPLETADO', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
};

type Ticket = {
  id: string;
  ticket_number: string;
  device_brand: string;
  device_model: string;
  issue_description: string;
  status: string;
  created_at: string;
  estimated_completion: string | null;
  customer_name?: string;
};

export default function CustomerPortalPage() {
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    setError('');
    setTicket(null);

    const { data, error: err } = await (supabase as any)
      .from('repair_tickets')
      .select('id, ticket_number, device_brand, device_model, issue_description, status, created_at, estimated_completion')
      .or(`ticket_number.ilike.%${q}%,id.eq.${q.length === 36 ? q : '00000000-0000-0000-0000-000000000000'}`)
      .maybeSingle();

    if (err || !data) {
      setError('No encontramos ningún ticket con ese número. Verifica e intenta de nuevo.');
    } else {
      setTicket(data);
    }
    setLoading(false);
  };

  const statusInfo = ticket ? (STATUS_MAP[ticket.status] || { label: ticket.status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: Clock }) : null;
  const StatusIcon = statusInfo?.icon || Clock;

  const progress = ticket ? (() => {
    const closed = ['reparado', 'repaired_collected', 'completed'];
    const mid = ['en_proceso', 'diagnostico', 'pendiente_pieza', 'pendiente_cliente', 'presupuesto', 'in_progress'];
    if (closed.includes(ticket.status)) return 100;
    if (mid.includes(ticket.status)) return 60;
    return 25;
  })() : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      <header className="bg-white/5 backdrop-blur border-b border-white/10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <JcOneFixAppIcon className="h-8 w-8 rounded-lg p-1.5" />
            <div>
              <span className="text-white font-bold text-sm">VIAMOVIL</span>
              <p className="text-white/50 text-[10px]">Centro de Reparaciones</p>
            </div>
          </div>
          <Link href="/login" className="text-xs text-white/60 hover:text-white transition-colors">
            Acceso empleados →
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-repairdesk-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-repairdesk-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Estado de tu reparación</h1>
            <p className="text-white/60">Introduce el número de ticket que recibiste para consultar el estado de tu reparación</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">Número de ticket</label>
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                placeholder="Ej: 0-12345"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="bg-repairdesk-500 hover:bg-repairdesk-400 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </button>
            </div>
          </div>

          {searched && error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-red-300 text-sm text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
              {error}
            </div>
          )}

          {ticket && statusInfo && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#F5C518] px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs">Ticket</p>
                  <p className="text-white font-bold text-lg">#{ticket.ticket_number}</p>
                </div>
                <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold', statusInfo.bg, statusInfo.color)}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusInfo.label}
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 bg-repairdesk-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Wrench className="h-5 w-5 text-repairdesk-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{ticket.device_brand} {ticket.device_model}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{ticket.issue_description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Progreso de reparación</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    {['Recibido', 'En proceso', 'Finalizado'].map((step, i) => (
                      <span key={step} className={cn('text-[10px]', progress >= (i === 0 ? 1 : i === 1 ? 50 : 100) ? 'text-repairdesk-600 font-semibold' : 'text-gray-400')}>
                        {step}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Fecha de entrada</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(ticket.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Entrega estimada</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {ticket.estimated_completion
                        ? new Date(ticket.estimated_completion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                        : 'Por confirmar'}
                    </p>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-5">
                  Para más información, contacta con nosotros indicando tu número de ticket.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-white/30 text-xs border-t border-white/5">
        © {new Date().getFullYear()} VIAMOVIL — Centro de Reparaciones
      </footer>
    </div>
  );
}
