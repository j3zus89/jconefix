'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const INTERVAL_MS = 5000;

type FeedItem = {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  dot: string;
  time: string;
};

export type LiveSlide = {
  headerTitle: string;
  stats: { label: string; value: string; color: string }[];
  feed: FeedItem[];
  footer: string;
};

function buildSlides(isAR: boolean): LiveSlide[] {
  return [
    {
      headerTitle: 'Panel en tiempo real',
      stats: isAR
        ? [
            { label: 'Tickets hoy', value: '14', color: 'text-[#F5C518]' },
            { label: 'Ingresos hoy', value: '$ 487k', color: 'text-blue-300' },
            { label: 'Técnicos activos', value: '3', color: 'text-amber-300' },
          ]
        : [
            { label: 'Tickets hoy', value: '14', color: 'text-[#F5C518]' },
            { label: 'Ingresos hoy', value: '1.4k€', color: 'text-blue-300' },
            { label: 'Técnicos activos', value: '3', color: 'text-amber-300' },
          ],
      feed: isAR
        ? [
            {
              icon: '✓',
              iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
              iconColor: 'text-[#F5C518]',
              title: 'Ticket #4823 — iPhone 15 Pro · Pantalla',
              sub: 'Estado: Reparado · WhatsApp enviado al cliente',
              dot: 'bg-[#F5C518]',
              time: 'hace 1 min',
            },
            {
              icon: '$',
              iconBg: 'bg-blue-400/15 border-blue-400/30',
              iconColor: 'text-blue-300 font-bold text-base',
              title: 'Cobro registrado · MacBook Air — $ 185.000',
              sub: 'POS · efectivo · Taller principal',
              dot: 'bg-blue-400',
              time: 'hace 3 min',
            },
            {
              icon: '📦',
              iconBg: 'bg-amber-400/15 border-amber-400/30',
              iconColor: 'text-amber-300',
              title: 'Stock actualizado · Pantalla OLED S24',
              sub: 'Inventario · 4 unidades disponibles tras recepción',
              dot: 'bg-amber-400',
              time: 'hace 7 min',
            },
            {
              icon: '🔧',
              iconBg: 'bg-purple-400/15 border-purple-400/30',
              iconColor: 'text-purple-300',
              title: 'Nuevo ticket asignado · Samsung S24',
              sub: 'Diagnóstico · No carga · Técnico asignado',
              dot: 'bg-purple-400',
              time: 'hace 12 min',
            },
          ]
        : [
            {
              icon: '✓',
              iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
              iconColor: 'text-[#F5C518]',
              title: 'Ticket #4823 — iPhone 15 Pro · Pantalla',
              sub: 'Estado actualizado: Reparado · WhatsApp enviado al cliente',
              dot: 'bg-[#F5C518]',
              time: 'hace 1 min',
            },
            {
              icon: '€',
              iconBg: 'bg-blue-400/15 border-blue-400/30',
              iconColor: 'text-blue-300 font-bold text-base',
              title: 'Cobro registrado · MacBook Air — 185 €',
              sub: 'POS · efectivo · Taller principal',
              dot: 'bg-blue-400',
              time: 'hace 3 min',
            },
            {
              icon: '📦',
              iconBg: 'bg-amber-400/15 border-amber-400/30',
              iconColor: 'text-amber-300',
              title: 'Stock actualizado · Pantalla OLED S24',
              sub: 'Inventario · 4 unidades disponibles tras recepción',
              dot: 'bg-amber-400',
              time: 'hace 7 min',
            },
            {
              icon: '🔧',
              iconBg: 'bg-purple-400/15 border-purple-400/30',
              iconColor: 'text-purple-300',
              title: 'Nuevo ticket asignado · Samsung S24',
              sub: 'Diagnóstico · No carga · Técnico: Jesús',
              dot: 'bg-purple-400',
              time: 'hace 12 min',
            },
          ],
      footer:
        'Todo lo que ves aquí sucede dentro del panel — tickets, cobros, stock y equipo en una sola pantalla.',
    },
    {
      headerTitle: 'Presupuestos Inteligentes',
      stats: isAR
        ? [
            { label: 'Presupuestos IA', value: '6', color: 'text-[#F5C518]' },
            { label: 'Avisos WhatsApp', value: '5', color: 'text-[#F5C518]' },
            { label: 'Aceptados', value: '3', color: 'text-blue-300' },
          ]
        : [
            { label: 'Presupuestos IA', value: '6', color: 'text-[#F5C518]' },
            { label: 'Avisos WhatsApp', value: '5', color: 'text-[#F5C518]' },
            { label: 'Aceptados', value: '3', color: 'text-blue-300' },
          ],
      feed: isAR
        ? [
            {
              icon: '✨',
              iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
              iconColor: 'text-[#F5C518]',
              title: 'IA redactó presupuesto: Cambio de pantalla iPhone 15',
              sub: 'Listo para enviar por WhatsApp · precio calculado automáticamente',
              dot: 'bg-[#F5C518]',
              time: 'hace 1 min',
            },
            {
              icon: '↗',
              iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
              iconColor: 'text-[#F5C518] font-bold',
              title: 'Cliente aceptó presupuesto vía WhatsApp · Samsung S23',
              sub: 'Ticket creado automáticamente · aviso enviado al técnico',
              dot: 'bg-emerald-400',
              time: 'hace 3 min',
            },
            {
              icon: '📦',
              iconBg: 'bg-amber-400/15 border-amber-400/30',
              iconColor: 'text-amber-300',
              title: 'Stock actualizado: Quedan 3 módulos de MacBook Pro',
              sub: 'Alerta automática · reordenar antes de quedarse sin stock',
              dot: 'bg-amber-400',
              time: 'hace 7 min',
            },
            {
              icon: '✓',
              iconBg: 'bg-blue-400/15 border-blue-400/30',
              iconColor: 'text-blue-300',
              title: 'Reparación completada · Notificación automática enviada',
              sub: 'Cliente vio el aviso en WhatsApp · listo para retirar',
              dot: 'bg-blue-400',
              time: 'hace 9 min',
            },
          ]
        : [
            {
              icon: '✨',
              iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
              iconColor: 'text-[#F5C518]',
              title: 'IA redactó presupuesto: Cambio de pantalla iPhone 15',
              sub: 'Listo para enviar por WhatsApp · precio calculado automáticamente',
              dot: 'bg-[#F5C518]',
              time: 'hace 1 min',
            },
            {
              icon: '↗',
              iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
              iconColor: 'text-[#F5C518] font-bold',
              title: 'Cliente aceptó presupuesto vía WhatsApp · Samsung S23',
              sub: 'Ticket creado automáticamente · aviso enviado al técnico',
              dot: 'bg-emerald-400',
              time: 'hace 3 min',
            },
            {
              icon: '📦',
              iconBg: 'bg-amber-400/15 border-amber-400/30',
              iconColor: 'text-amber-300',
              title: 'Stock actualizado: Quedan 3 módulos de MacBook Pro',
              sub: 'Alerta automática · reordenar antes de quedarse sin stock',
              dot: 'bg-amber-400',
              time: 'hace 7 min',
            },
            {
              icon: '✓',
              iconBg: 'bg-blue-400/15 border-blue-400/30',
              iconColor: 'text-blue-300',
              title: 'Reparación completada · Notificación automática enviada',
              sub: 'Cliente vio el aviso en WhatsApp · listo para retirar',
              dot: 'bg-blue-400',
              time: 'hace 9 min',
            },
          ],
      footer:
        'La IA redacta presupuestos profesionales y los manda por WhatsApp mientras vos seguís reparando.',
    },
    {
      headerTitle: 'Seguimiento público · QR',
      stats: isAR
        ? [
            { label: 'Escaneos hoy', value: '28', color: 'text-[#F5C518]' },
            { label: 'Vistas estado', value: '41', color: 'text-cyan-300' },
            { label: 'Activos', value: '19', color: 'text-violet-300' },
          ]
        : [
            { label: 'Escaneos hoy', value: '28', color: 'text-[#F5C518]' },
            { label: 'Vistas estado', value: '41', color: 'text-cyan-300' },
            { label: 'Activos', value: '19', color: 'text-violet-300' },
          ],
      feed: [
        {
          icon: '▣',
          iconBg: 'bg-cyan-400/15 border-cyan-400/30',
          iconColor: 'text-cyan-300 font-bold',
          title: 'QR escaneado · Ticket #4811 · iPhone 14',
          sub: 'Cliente abrió el portal público · sin iniciar sesión',
          dot: 'bg-cyan-400',
          time: 'hace 1 min',
        },
        {
          icon: '👁',
          iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
          iconColor: 'text-[#F5C518]',
          title: 'Estado visible: En reparación · ETA estimado',
          sub: 'Texto claro para el cliente · mismo dato que en tu panel',
          dot: 'bg-[#F5C518]',
          time: 'hace 3 min',
        },
        {
          icon: '🔗',
          iconBg: 'bg-violet-400/15 border-violet-400/30',
          iconColor: 'text-violet-300',
          title: 'Enlace + QR regenerados · ticket #4804',
          sub: 'Etiqueta impresa para mostrador o entrega',
          dot: 'bg-violet-400',
          time: 'hace 8 min',
        },
        {
          icon: '✓',
          iconBg: 'bg-blue-400/15 border-blue-400/30',
          iconColor: 'text-blue-300',
          title: 'Listo para retirar · notificación vista',
          sub: 'El cliente vio “reparación terminada” desde su móvil',
          dot: 'bg-blue-400',
          time: 'hace 11 min',
        },
      ],
      footer:
        'QR y página pública de estado: el cliente consulta la reparación cuando quiera, sin llamadas al taller.',
    },
    {
      headerTitle: 'Logística de repuestos',
      stats: isAR
        ? [
            { label: 'Piezas ubicadas', value: '312', color: 'text-[#F5C518]' },
            { label: 'Cajones en uso', value: '24', color: 'text-amber-300' },
            { label: 'Búsquedas hoy', value: '17', color: 'text-orange-300' },
          ]
        : [
            { label: 'Piezas ubicadas', value: '312', color: 'text-[#F5C518]' },
            { label: 'Cajones en uso', value: '24', color: 'text-amber-300' },
            { label: 'Búsquedas hoy', value: '17', color: 'text-orange-300' },
          ],
      feed: [
        {
          icon: '📍',
          iconBg: 'bg-amber-400/15 border-amber-400/30',
          iconColor: 'text-amber-200 text-base',
          title: 'Ubicación asignada · Flex iPhone 13 · Cajón A-12',
          sub: 'Registrado al recibir mercadería del proveedor',
          dot: 'bg-amber-400',
          time: 'hace 2 min',
        },
        {
          icon: '→',
          iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
          iconColor: 'text-[#F5C518] font-bold',
          title: 'Retirada para ticket #4820 · Pantalla OLED',
          sub: 'Desde cajón B-04 · descuenta stock al enlazar al ticket',
          dot: 'bg-[#F5C518]',
          time: 'hace 5 min',
        },
        {
          icon: '!',
          iconBg: 'bg-orange-400/15 border-orange-400/30',
          iconColor: 'text-orange-300 font-bold',
          title: 'Stock bajo · Conector USB-C · mínimo 2 u.',
          sub: 'Alerta en panel · ubicación C-07',
          dot: 'bg-orange-400',
          time: 'hace 14 min',
        },
        {
          icon: '↻',
          iconBg: 'bg-slate-500/15 border-slate-400/30',
          iconColor: 'text-slate-300',
          title: 'Transferencia entre sedes · módulo camión',
          sub: 'Origen Centro · destino Norte · trazabilidad completa',
          dot: 'bg-slate-400',
          time: 'hace 22 min',
        },
      ],
      footer:
        'Cada repuesto con cajón o ubicación física: menos “¿dónde estaba?” y más reparaciones cerradas a tiempo.',
    },
    {
      headerTitle: 'Lo esencial JC ONE FIX',
      stats: isAR
        ? [
            { label: 'Técnicos', value: '∞', color: 'text-[#F5C518]' },
            { label: 'Sedes', value: 'Multi', color: 'text-cyan-300' },
            { label: 'IA en tickets', value: 'Sí', color: 'text-violet-300' },
          ]
        : [
            { label: 'Técnicos', value: '∞', color: 'text-[#F5C518]' },
            { label: 'Sedes', value: 'Multi', color: 'text-cyan-300' },
            { label: 'IA en tickets', value: 'Sí', color: 'text-violet-300' },
          ],
      feed: [
        {
          icon: '◇',
          iconBg: 'bg-[#F5C518]/15 border-[#F5C518]/30',
          iconColor: 'text-[#F5C518]',
          title: 'Notificación interna · Ticket asignado a vos',
          sub: 'Aviso en panel + pitido opcional · sin perder turnos',
          dot: 'bg-[#F5C518]',
          time: 'hace 1 min',
        },
        {
          icon: '🧠',
          iconBg: 'bg-violet-400/15 border-violet-400/30',
          iconColor: 'text-violet-300',
          title: 'Gemini en ticket #4818 · pasos de diagnóstico',
          sub: 'Sugerencias según modelo y síntoma · editable por el técnico',
          dot: 'bg-violet-400',
          time: 'hace 4 min',
        },
        {
          icon: '🖨',
          iconBg: 'bg-blue-400/15 border-blue-400/30',
          iconColor: 'text-blue-300',
          title: 'QZ Tray · etiqueta de recepción impresa',
          sub: 'Sin cuadros del navegador · flujo de mostrador ágil',
          dot: 'bg-blue-400',
          time: 'hace 9 min',
        },
        {
          icon: '⚡',
          iconBg: 'bg-amber-400/15 border-amber-400/30',
          iconColor: 'text-amber-300',
          title: 'Portal + WhatsApp + inventario · mismo panel',
          sub: 'Una sola verdad operativa para dueño, mostrador y taller',
          dot: 'bg-amber-400',
          time: 'hace 12 min',
        },
      ],
      footer:
        'Técnicos ilimitados, multi-sede, IA, impresión directa y comunicación con el cliente: el panel que crece con tu taller.',
    },
  ];
}

function LivePanelCard({ slide }: { slide: LiveSlide }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-black/35 backdrop-blur-md shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-3.5 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C518] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F5C518]" />
          </span>
          <p className="text-white text-sm font-semibold truncate">{slide.headerTitle}</p>
        </div>
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest shrink-0">En vivo</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
        {slide.stats.map((s) => (
          <div key={s.label} className="px-2 py-2.5 text-center sm:px-4 sm:py-3">
            <p className={`text-base font-bold tabular-nums sm:text-lg ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-500 sm:text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-white/[0.07]">
        {slide.feed.map((item) => (
          <li
            key={`${slide.headerTitle}-${item.title}`}
            className="flex items-start gap-2.5 px-3 py-3 sm:gap-3.5 sm:px-5 sm:py-3.5 hover:bg-white/[0.03] transition-colors"
          >
            <div
              className={`shrink-0 h-9 w-9 rounded-xl border flex items-center justify-center text-sm mt-0.5 ${item.iconBg}`}
            >
              <span className={item.iconColor}>{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-white/90 leading-snug">{item.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.sub}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              <span className="text-[10px] text-slate-600 whitespace-nowrap">{item.time}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-3 py-3 sm:px-5 border-t border-white/10 bg-white/[0.02]">
        <p className="text-[10px] text-slate-600 text-center leading-snug sm:text-[11px]">{slide.footer}</p>
      </div>
    </div>
  );
}

export function LiveActivityCarousel(_props?: { region?: 'AR' }) {
  const slides = useMemo(() => buildSlides(true), []);
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const advance = useCallback(() => {
    setActive((i) => (i + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(advance, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [advance, reducedMotion]);

  return (
    <div className="w-full min-w-0">
      <p className="sr-only" aria-live={reducedMotion ? 'off' : 'polite'}>
        Vista {active + 1} de {slides.length}: {slides[active]?.headerTitle}
      </p>
      {/* Cross-fade: contenedor relativo, capas absolutas superpuestas, solo opacidad (1 s). */}
      <div className="relative isolate w-full min-h-[26rem] overflow-visible sm:min-h-[28rem] lg:min-h-[30rem]">
        {slides.map((slide, i) => (
          <div
            key={slide.headerTitle}
            className={cn(
              'absolute inset-0 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none motion-reduce:duration-0',
              i === active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none',
            )}
            aria-hidden={i !== active}
          >
            <LivePanelCard slide={slide} />
          </div>
        ))}
      </div>
    </div>
  );
}
