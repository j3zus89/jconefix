'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BrainCircuit,
  Clock,
  CreditCard,
  LucideIcon,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageFloatingGlyphs } from '@/components/landing/image-floating-glyphs';

const ICONS: Record<string, LucideIcon> = {
  reparaciones: Wrench,
  clientes: Users,
  inventario: Package,
  pos: ShoppingCart,
  comunicacion: MessageSquare,
  informes: BarChart3,
  gastos: CreditCard,
  operacion: Clock,
  configuracion: Settings,
  ia: BrainCircuit,
};

const SUBLABELS: Record<string, [string, string]> = {
  reparaciones: ['Reparaciones', 'Tickets y facturas'],
  clientes: ['Clientes', 'CRM y leads'],
  inventario: ['Inventario', 'Stock y ubicación'],
  pos: ['Punto de venta', 'POS y caja'],
  comunicacion: ['Comunicación', 'Chat, portal y QR'],
  informes: ['Informes', 'Negocio y KPIs'],
  gastos: ['Gastos', 'Control financiero'],
  operacion: ['Operación', 'Turnos y equipo'],
  configuracion: ['Configuración', 'Roles e integraciones'],
  ia: ['Asistente IA', 'Diagnóstico y presupuestos'],
};

export type ModuloShowcaseItem = {
  id: string;
  title: string;
  tagline: string;
  bullets: string[];
  image: string;
};

type Props = { modules: ModuloShowcaseItem[] };

const AUTOPLAY_MS = 5000;

export function ModulosFichasShowcase({ modules }: Props) {
  const [activeId, setActiveId] = useState(modules[0]?.id ?? '');
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  /* ── Navega desde hash en la URL ── */
  useEffect(() => {
    const applyHash = () => {
      const m = window.location.hash.match(/^#detalle-(.+)$/);
      if (!m) return;
      const id = m[1];
      if (modules.some((x) => x.id === id)) setActiveId(id);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [modules]);

  /* ── Auto-avance cada 5 s (se pausa al hacer hover sobre la sección) ── */
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveId((curr) => {
        const idx = modules.findIndex((m) => m.id === curr);
        const next = modules[(idx + 1) % modules.length];
        return next?.id ?? curr;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [isPaused, modules]);

  /* ── Reinicia la barra de progreso cada vez que cambia el módulo ── */
  useEffect(() => {
    setProgressKey((k) => k + 1);
  }, [activeId]);

  const active = modules.find((m) => m.id === activeId) ?? modules[0];
  if (!active) return null;

  return (
    <div
      ref={sectionRef}
      className="w-full max-w-6xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/*
        Anclas #detalle-* aquí (no en los botones): si el id está en el tab, el scroll alinea ese botón arriba
        y el header fijo recorta la fila de iconos. Todas las anclas comparten el mismo punto Y + scroll-mt.
      */}
      <div className="relative h-px w-full shrink-0" aria-hidden>
        {modules.map((m) => (
          <span
            key={`anchor-${m.id}`}
            id={`detalle-${m.id}`}
            className="pointer-events-none absolute left-0 top-0 block h-px w-full scroll-mt-[5.5rem] sm:scroll-mt-28"
          />
        ))}
      </div>

      <div
        className="flex flex-wrap justify-center gap-x-1 gap-y-1 px-1 pb-3 pt-5 sm:gap-x-2 sm:gap-y-1.5 sm:pb-4 sm:pt-6 lg:gap-x-3 lg:flex-nowrap"
        role="tablist"
        aria-label="Módulos del software"
      >
        {modules.map((m) => {
          const Icon = ICONS[m.id] ?? Wrench;
          const [l1, l2] = SUBLABELS[m.id] ?? [m.title.split(' ')[0] ?? m.title, m.title.split(' ').slice(1).join(' ')];
          const isActive = m.id === active.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onMouseEnter={() => setActiveId(m.id)}
              onFocus={() => setActiveId(m.id)}
              onClick={() => setActiveId(m.id)}
              className={`relative flex flex-col items-center gap-1.5 px-2 py-2.5 sm:px-3 sm:py-3 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070f18] min-w-[4rem] sm:min-w-[5rem] lg:min-w-0 overflow-hidden ${
                isActive
                  ? 'text-[#F5C518] bg-[#F5C518]/10 border border-[#F5C518]/40 shadow-[0_0_24px_-6px_rgba(245,197,24,0.45)]'
                  : 'text-slate-400 hover:text-white border border-transparent hover:border-white/15 hover:bg-white/[0.05]'
              }`}
            >
              <Icon
                className={`h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 stroke-[1.35] shrink-0 ${isActive ? 'text-[#F5C518]' : 'text-current'}`}
                strokeWidth={1.35}
                aria-hidden
              />
              <span className="text-center text-[9px] sm:text-[10px] lg:text-[11px] font-medium leading-tight">
                <span className={`block ${isActive ? 'text-white' : ''}`}>{l1}</span>
                <span className={`block ${isActive ? 'text-[#F5C518]' : 'opacity-90'}`}>{l2}</span>
              </span>

              {/* Barra de progreso — sólo visible en el tab activo */}
              {isActive && (
                <span
                  key={progressKey}
                  className="absolute bottom-0 left-0 h-[2px] bg-[#F5C518]/70 rounded-full"
                  style={{
                    animation: isPaused
                      ? 'none'
                      : `tabProgress ${AUTOPLAY_MS}ms linear forwards`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Imagen full-width con texto superpuesto */}
      <div
        className="mt-8 sm:mt-10 w-full"
        role="tabpanel"
        aria-live="polite"
      >
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0c1520] shadow-2xl shadow-black/60 ring-1 ring-[#F5C518]/10">
          {/* Imagen */}
          <div className="relative aspect-[5/4] w-full bg-[#050a12] sm:aspect-[16/9] lg:aspect-[16/7]">
            <Image
              src={active.image}
              alt={`Interfaz ${active.title} — software de gestión de taller, stock y facturación ARCA Jconefix`}
              fill
              sizes="(max-width: 1024px) 100vw, min(1200px, 100vw)"
              priority={active.id === modules[0]?.id}
              className="object-cover object-center transition-opacity duration-500"
            />
            {/* Gradiente: oscurece la parte inferior para legibilidad del texto */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050a12] via-[#050a12]/60 to-transparent" />
            {/* Gradiente lateral izquierdo sutil */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050a12]/40 via-transparent to-transparent" />
            <ImageFloatingGlyphs moduleId={active.id} />
          </div>

          {/* Texto superpuesto — posicionado en la parte inferior */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-12 sm:px-6 sm:pb-7 sm:pt-16 md:px-10 md:pb-10">
            {/* Etiqueta módulo */}
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-[#F5C518]" aria-hidden />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#F5C518]">
                {active.id}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              {/* Columna izquierda: título + tagline + bullets */}
              <div className="flex-1 max-w-xl space-y-3">
                <h3 className="font-serif text-xl leading-tight text-white drop-shadow-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold">
                  {active.title}
                </h3>
                <p className="max-w-lg text-xs leading-relaxed text-slate-300 sm:text-sm md:text-base">
                  {active.tagline}
                </p>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-400">
                  {active.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-[#F5C518] shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Columna derecha: botón */}
              <div className="shrink-0">
                <Link href="/register">
                  <Button className="rounded-full bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-bold h-11 px-8 border-0 shadow-xl shadow-[#F5C518]/30 text-sm tracking-wide min-h-[48px]">
                    Prueba gratis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
