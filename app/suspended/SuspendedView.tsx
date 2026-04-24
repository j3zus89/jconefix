'use client';

import Link from 'next/link';
import { AlertCircle, CreditCard, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NOTIFICATIONS_INBOX_EMAIL } from '@/lib/notifications/notifications-inbox';
import { useRouter } from 'next/navigation';

type Props = { hardBlock: boolean };

export function SuspendedView({ hardBlock }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0c1520] to-[#050a12] flex items-center justify-center p-4 text-white">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-[#070f18]/90 backdrop-blur-xl shadow-2xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl ring-1 ring-red-400/40 mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            {hardBlock ? 'Cuenta suspendida' : 'Acceso al panel pausado'}
          </h1>

          {hardBlock ? (
            <p className="text-slate-400 text-sm leading-relaxed mb-6 text-left">
              El acceso a tu taller fue <strong className="text-slate-200">suspendido o dado de baja</strong> por un
              motivo que debe revisarse con el equipo. <strong className="text-white">No podés reactivar el servicio
              con un pago automático</strong> desde esta pantalla: escribinos desde el correo de la cuenta y
              explicá brevemente la situación.
            </p>
          ) : (
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Tu <strong className="text-slate-200">prueba</strong> ha terminado o tu <strong className="text-slate-200">licencia</strong> necesita
              renovación. <strong className="text-white">Tus datos siguen guardados</strong>: solo hace falta regularizar el pago para volver a
              entrar con el mismo email.
            </p>
          )}

          {hardBlock ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-[#F5C518] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm mb-1">Soporte técnico</p>
                  <p className="text-slate-400 text-xs mb-3">
                    Respondemos por correo. Incluí el email con el que entrás al panel y el nombre del taller si lo sabés.
                  </p>
                  <Button
                    asChild
                    className="w-full bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold border-0 text-sm shadow-none"
                  >
                    <a href={`mailto:${NOTIFICATIONS_INBOX_EMAIL}?subject=Cuenta%20suspendida%20-%20consulta`}>
                      Escribir a {NOTIFICATIONS_INBOX_EMAIL}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-slate-500 mb-5 uppercase tracking-wide font-semibold">Renovar acceso</p>

              <div className="space-y-4 text-left">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-[#F5C518] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm mb-0.5">Renovar en pesos (ARS)</p>
                      <p className="text-slate-400 text-xs mb-3">
                        Mercado Pago: iniciá sesión y completá el pago en el checkout. Tus datos se guardan al menos 12 meses.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button asChild className="flex-1 bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold border-0 text-sm shadow-none">
                          <Link href="/checkout/ar?cycle=mensual">Contratar (mensual / anual)</Link>
                        </Button>
                        <Button asChild className="flex-1 border border-white/40 bg-slate-900/80 text-white hover:bg-slate-800 hover:text-white font-semibold text-sm shadow-none">
                          <Link href="/checkout/ar?cycle=mensual">Checkout</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-6 leading-relaxed">
                Si el pago figura aprobado en Mercado Pago y el acceso no vuelve en pocos minutos, escribinos con el{' '}
                <strong className="text-slate-400">payment_id</strong> a{' '}
                <a href={`mailto:${NOTIFICATIONS_INBOX_EMAIL}`} className="text-[#F5C518] hover:underline font-medium">
                  soporte
                </a>
                .
              </p>
            </>
          )}

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              onClick={handleLogout}
              className="w-full border border-white/40 bg-slate-900/80 text-white hover:bg-slate-800 hover:text-white font-semibold shadow-none"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
