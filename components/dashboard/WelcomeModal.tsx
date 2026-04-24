'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  BookOpen,
  ArrowRight,
  Sparkles,
  Wrench,
  Users,
  Package,
  ShoppingCart,
  LayoutTemplate,
  LayoutGrid,
} from 'lucide-react';
/** Shown once per browser / user after first login. */
export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const key = `jc_welcome_shown_${user.id}`;
      if (typeof window !== 'undefined' && localStorage.getItem(key)) return;

      // Only show for recently created accounts (within last 5 minutes)
      const createdAt = new Date(user.created_at ?? 0);
      const diffMin = (Date.now() - createdAt.getTime()) / 60_000;
      if (diffMin > 5) return;

      setOpen(true);
      if (typeof window !== 'undefined') localStorage.setItem(key, '1');
    }

    void check();
  }, []);

  function close() {
    setOpen(false);
  }

  function goToGuide() {
    setOpen(false);
    router.push('/dashboard/guide-ar');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      <div
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        <div className="flex-shrink-0 bg-gradient-to-br from-primary to-primary/80 px-6 pb-8 pt-7 text-primary-foreground sm:px-8 sm:pb-9 sm:pt-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Bienvenido a</p>
              <h2 id="welcome-modal-title" className="text-2xl font-bold text-white">
                JC ONE FIX
              </h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/90">
            Tu panel de gestión para talleres de reparación electrónica está listo. Aquí tienes un resumen de lo que puedes
            hacer, cómo ajustar la intensidad del menú y dónde encontrar la documentación.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
          <p className="mb-3 text-sm font-semibold text-gray-900">¿Qué puedes hacer en el panel?</p>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {[
              { icon: Wrench, label: 'Gestionar reparaciones y tickets', color: 'bg-primary/10 text-primary' },
              { icon: Users, label: 'Base de datos de clientes', color: 'bg-blue-50 text-blue-600' },
              { icon: Package, label: 'Control de inventario y stock', color: 'bg-purple-50 text-purple-600' },
              { icon: ShoppingCart, label: 'Punto de venta y caja', color: 'bg-orange-50 text-orange-500' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-start gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 sm:py-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <span className="text-xs font-medium leading-snug text-gray-700">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-gradient-to-b from-primary/10 to-white px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Experiencia del panel</p>
                <p className="text-sm font-semibold text-gray-900">Modo sencillo o modo completo</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Misma cuenta y mismos datos: eliges cuánto ves en el menú superior y en la pantalla de inicio. El cambio se
                  guarda al instante al seleccionarlo.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm ring-1 ring-gray-900/[0.03]">
                <div className="mb-1.5 flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-xs font-semibold text-gray-900">Modo sencillo</span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-600">
                  Menú reducido e inicio claro con <strong>Nuevo ingreso</strong>, contadores de trabajo y accesos a tickets,
                  clientes y ventas. Oculta inventario, informes y gastos hasta que los necesites.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm ring-1 ring-gray-900/[0.03]">
                <div className="mb-1.5 flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-xs font-semibold text-gray-900">Modo completo</span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-600">
                  Todos los módulos visibles y un inicio con resumen de caja y reparaciones (KPIs, gráficos y tablas según tu
                  región).
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings?tab=config_general"
              onClick={close}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/90 hover:underline"
            >
              Abrir Configuración → Configuración general
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <p className="mt-1.5 text-[10px] leading-snug text-gray-500">
              En esa página, baja hasta la sección <strong>Experiencia del panel</strong> y elige la tarjeta que prefieras.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Guía de usuario integrada</p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                En el menú <strong>Configuración</strong> encontrarás <strong>📖 Guía de usuario</strong>: temas paso a paso,
                modo sencillo y completo del panel.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col gap-2 border-t border-gray-100 bg-gray-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-8">
          <button
            type="button"
            onClick={close}
            className="order-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:order-1 sm:w-auto"
          >
            Empezar en el panel
          </button>
          <button
            type="button"
            onClick={goToGuide}
            className="order-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:order-2 sm:w-auto"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            Abrir la guía
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
