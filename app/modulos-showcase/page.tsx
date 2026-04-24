'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Wrench, Users, Package, ShoppingCart, MessageSquare,
  BarChart3, CreditCard, Clock, Settings, LucideIcon,
  ChevronRight, Zap, ArrowRight, Check,
} from 'lucide-react';

/* ─── shared data ──────────────────────────────────────────────────────── */
const u = (id: string, w = 1400, h = 875) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const MODULES = [
  {
    id: 'reparaciones', label: 'Reparaciones', sub: 'Tickets y facturas',
    Icon: Wrench,
    title: 'Reparaciones y papeleo',
    tagline: 'Ningún dispositivo se pierde, ningún técnico dice «no sabía». Cada ticket lleva foto del estado inicial, IMEI, presupuesto firmado y seguimiento en tiempo real.',
    bullets: [
      'Ficha completa: modelo, IMEI, fotos del estado inicial, presupuesto aceptado y firma del cliente.',
      'Estados personalizables con asignación de técnico y aviso automático al cliente cuando está listo.',
    ],
    image: u('1576613109753-27804de2cba8'),
  },
  {
    id: 'clientes', label: 'Clientes', sub: 'CRM y leads',
    Icon: Users,
    title: 'Clientes y captación',
    tagline: 'El cliente que ya confió en ti es el más barato de conseguir. Ficha histórica completa para que fidelizar deje de depender de la memoria del técnico.',
    bullets: [
      'Perfil único con historial de reparaciones completo, importes cobrados y notas privadas del equipo.',
      'Pipeline de leads para no perder presupuestos pendientes sin hojas de cálculo ni post-its.',
    ],
    image: u('1556761175-b413da4baf72'),
  },
  {
    id: 'inventario', label: 'Inventario', sub: 'Gestión de stock',
    Icon: Package,
    title: 'Inventario y compras',
    tagline: 'El repuesto que no encuentras te cuesta la reparación y el cliente. Stock en tiempo real con alertas de mínimo y órdenes de compra desde el mismo panel.',
    bullets: [
      'Catálogo de piezas con precio de coste y venta, stock por ubicación y alerta automática.',
      'Órdenes de compra al proveedor y descuento automático de stock al instalar una pieza.',
    ],
    image: u('1586528116311-ad8dd3c8310d'),
  },
  {
    id: 'pos', label: 'Punto de venta', sub: 'POS y caja',
    Icon: ShoppingCart,
    title: 'Punto de venta y caja',
    tagline: 'Cobras el arreglo, vendes la funda y cierras caja sin abrir otra aplicación. TPV conectado al inventario y al historial del cliente.',
    bullets: [
      'TPV táctil con búsqueda rápida, descuentos, IVA automático y ticket en segundos.',
      'Cierre de caja diario, historial de ventas por empleado y arqueo sin calculadora.',
    ],
    image: u('1556742049-0cfed4f6a45d'),
  },
  {
    id: 'comunicacion', label: 'Comunicación', sub: 'Chat interno',
    Icon: MessageSquare,
    title: 'Comunicación y chat',
    tagline: 'Los avisos llegan al panel donde el técnico ya está trabajando — sin grupos externos, sin mensajes perdidos y con el contexto de la reparación a mano.',
    bullets: [
      'Chat en tiempo real entre recepción y técnicos con notificación sonora y color único por usuario.',
      'Historial completo para que el aviso importante no desaparezca entre mensajes del grupo.',
    ],
    image: u('1523240795612-9a054b0db644'),
  },
  {
    id: 'informes', label: 'Informes', sub: 'Negocio y KPIs',
    Icon: BarChart3,
    title: 'Informes y analítica',
    tagline: 'No puedes subir precios ni contratar sin datos. Dashboard con ingresos reales del mes, técnico más productivo y tipo de reparación más frecuente.',
    bullets: [
      'Resumen en tiempo real: tickets abiertos, ingresos del día y del mes, productos más vendidos.',
      'Rendimiento por técnico y canal de entrada para decidir turnos y comisiones con criterio real.',
    ],
    image: u('1454165804606-c3d57bc86b40'),
  },
  {
    id: 'gastos', label: 'Gastos', sub: 'Control financiero',
    Icon: CreditCard,
    title: 'Gastos y control financiero',
    tagline: 'Ingresar mucho no es lo mismo que ganar mucho. Registra alquiler, proveedores y marketing por categoría y ve el margen real del taller.',
    bullets: [
      'Alta rápida de gastos con categoría, proveedor e importe; gastos recurrentes marcados.',
      'Vista mensual de ingresos vs gastos para conocer el margen operativo real.',
    ],
    image: u('1554224155-6726b3ff858f'),
  },
  {
    id: 'operacion', label: 'Operación', sub: 'Turnos y equipo',
    Icon: Clock,
    title: 'Operación diaria del equipo',
    tagline: 'Cuando el técnico estrella coge vacaciones el taller no para. Turnos, fichajes y guías internas documentadas para que cualquier miembro siga el ritmo.',
    bullets: [
      'Registro de entrada y salida del equipo con control de turnos desde cualquier dispositivo.',
      'Comentarios y seguimiento en tickets para dejar constancia de reparaciones complejas al equipo.',
    ],
    image: u('1580894908361-967195033215'),
  },
  {
    id: 'configuracion', label: 'Configuración', sub: 'Roles e integraciones',
    Icon: Settings,
    title: 'Configuración e integraciones',
    tagline: 'Roles, impuestos, plantillas y canal con el cliente: una infraestructura seria evita que cada usuario invente su forma de facturar.',
    bullets: [
      'Roles y permisos por usuario: el técnico ve lo que necesita, el propietario lo ve todo.',
      'Categorías, estados, plantillas de email y ajustes fiscales en un solo panel.',
    ],
    image: u('1517694712202-14dd9538aa97'),
  },
];

/* ─── Tab pills shared sub-component ───────────────────────────────────── */
function TabRow({
  active, onChange, variant = 'default',
}: {
  active: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'minimal' | 'numbered';
}) {
  return (
    <div className="flex flex-nowrap gap-1 sm:gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {MODULES.map((m, i) => {
        const isActive = m.id === active;
        if (variant === 'pills') {
          return (
            <button key={m.id} onClick={() => onChange(m.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                ${isActive ? 'bg-[#F5C518] text-[#0D1117]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'}`}>
              <m.Icon className="h-3 w-3" strokeWidth={2} />
              {m.label}
            </button>
          );
        }
        if (variant === 'minimal') {
          return (
            <button key={m.id} onClick={() => onChange(m.id)}
              className={`shrink-0 px-4 py-2 text-xs font-medium tracking-wide transition-all border-b-2
                ${isActive ? 'border-[#F5C518] text-[#F5C518]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {m.label}
            </button>
          );
        }
        if (variant === 'numbered') {
          return (
            <button key={m.id} onClick={() => onChange(m.id)}
              className={`shrink-0 flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg transition-all
                ${isActive ? 'bg-[#F5C518]/10 text-[#F5C518]' : 'text-slate-500 hover:text-slate-300'}`}>
              <span className="text-[9px] font-mono opacity-50">{String(i + 1).padStart(2, '0')}</span>
              <m.Icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-[9px] font-medium">{m.label}</span>
            </button>
          );
        }
        return (
          <button key={m.id} onClick={() => onChange(m.id)}
            className={`shrink-0 flex flex-col items-center gap-1.5 px-2.5 py-2.5 rounded-xl transition-all min-w-[4.5rem]
              ${isActive
                ? 'text-[#F5C518] bg-[#F5C518]/10 border border-[#F5C518]/40'
                : 'text-slate-400 hover:text-white border border-transparent hover:border-white/15 hover:bg-white/5'}`}>
            <m.Icon className="h-5 w-5" strokeWidth={1.35} />
            <span className="text-[9px] font-medium text-center leading-tight">
              <span className="block">{m.label}</span>
              <span className={`block ${isActive ? 'text-[#F5C518]' : 'opacity-70'}`}>{m.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VARIANT 1 — CINEMATIC
   Full-width image header + clean text below. Majestic, Apple-style.
══════════════════════════════════════════════════════════════════════════ */
function Variant1() {
  const [active, setActive] = useState('reparaciones');
  const mod = MODULES.find((m) => m.id === active)!;
  return (
    <div className="w-full">
      <TabRow active={active} onChange={setActive} variant="pills" />
      <div className="mt-6 relative w-full rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/60">
        {/* Full-width image */}
        <div className="relative w-full" style={{ aspectRatio: '21/9' }}>
          <img
            src={mod.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-all duration-700"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060d14] via-[#060d14]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060d14]/60 via-transparent to-transparent" />
          {/* Module badge top-left */}
          <div className="absolute top-5 left-6 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-[#F5C518]/15 border border-[#F5C518]/30 px-3 py-1 text-[11px] font-semibold text-[#F5C518] backdrop-blur-sm">
              <mod.Icon className="h-3 w-3" strokeWidth={2} />
              {mod.label}
            </span>
          </div>
        </div>
        {/* Content below image, inside the card */}
        <div className="bg-[#060d14] px-8 py-8">
          <div className="max-w-4xl">
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
              {mod.title}
            </h3>
            <p className="text-slate-400 text-lg leading-relaxed mb-6 max-w-2xl">{mod.tagline}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              {mod.bullets.map((b, i) => (
                <div key={i} className="flex-1 flex gap-3 bg-white/[0.04] rounded-xl border border-white/8 p-4">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-[#F5C518]/15 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-[#F5C518]" strokeWidth={2.5} />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{b}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/register">
                <button className="inline-flex items-center gap-2 rounded-full bg-[#F5C518] text-[#0D1117] px-8 py-3 text-sm font-bold hover:bg-[#D4A915] transition-colors shadow-lg shadow-[#F5C518]/20">
                  Prueba gratis — sin tarjeta
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VARIANT 2 — SIDE STORY
   Vertical numbered sidebar + image right, text overlaid on glass card.
══════════════════════════════════════════════════════════════════════════ */
function Variant2() {
  const [active, setActive] = useState('reparaciones');
  const mod = MODULES.find((m) => m.id === active)!;
  return (
    <div className="w-full flex gap-4 min-h-[560px]">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col gap-1 w-48 shrink-0 pt-2">
        {MODULES.map((m, i) => {
          const isActive = m.id === active;
          return (
            <button key={m.id} onClick={() => setActive(m.id)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                ${isActive ? 'bg-[#F5C518]/10 border border-[#F5C518]/25' : 'hover:bg-white/5 border border-transparent'}`}>
              <span className={`font-mono text-[10px] w-4 shrink-0 ${isActive ? 'text-[#F5C518]' : 'text-slate-600'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <m.Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#F5C518]' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={1.5} />
              <div>
                <p className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{m.label}</p>
                <p className={`text-[10px] ${isActive ? 'text-[#F5C518]/70' : 'text-slate-600'}`}>{m.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
      {/* Mobile tabs */}
      <div className="lg:hidden w-full mb-4">
        <TabRow active={active} onChange={setActive} variant="numbered" />
      </div>
      {/* Main panel */}
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/60">
        <img src={mod.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-all duration-700" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060d14]/95 via-[#060d14]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060d14]/70 to-transparent" />
        {/* Glass content card */}
        <div className="relative h-full flex items-center">
          <div className="p-8 lg:p-12 max-w-xl">
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#F5C518]/15 border border-[#F5C518]/30 flex items-center justify-center">
                <mod.Icon className="h-4 w-4 text-[#F5C518]" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#F5C518]">{mod.sub}</span>
            </div>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              {mod.title}
            </h3>
            <p className="text-slate-300 text-base leading-relaxed mb-6">{mod.tagline}</p>
            <div className="space-y-3 mb-8">
              {mod.bullets.map((b, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#F5C518] shrink-0" />
                  <p className="text-sm text-slate-400">{b}</p>
                </div>
              ))}
            </div>
            <Link href="/register">
              <button className="inline-flex items-center gap-2 rounded-full bg-[#F5C518] text-[#0D1117] px-7 py-2.5 text-sm font-bold hover:bg-[#D4A915] transition-colors">
                Prueba gratis <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VARIANT 3 — TERMINAL / IDE
   Window chrome + code-aesthetic. Left: device mockup. Right: CLI output.
══════════════════════════════════════════════════════════════════════════ */
function Variant3() {
  const [active, setActive] = useState('reparaciones');
  const mod = MODULES.find((m) => m.id === active)!;
  const idx = MODULES.findIndex((m) => m.id === active);
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/70 bg-[#0a0f16]">
      {/* Window chrome */}
      <div className="flex items-center gap-0 border-b border-white/8 bg-[#0d1520]">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-r border-white/8">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        {/* File tabs */}
        <div className="flex overflow-x-auto [scrollbar-width:none]">
          {MODULES.map((m) => {
            const isActive = m.id === active;
            return (
              <button key={m.id} onClick={() => setActive(m.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-3 text-[11px] font-mono border-r border-white/8 transition-colors
                  ${isActive ? 'bg-[#131e2c] text-[#F5C518] border-b-2 border-b-[#F5C518]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}`}>
                <m.Icon className="h-3 w-3" strokeWidth={2} />
                {m.id}.mod
              </button>
            );
          })}
        </div>
      </div>
      {/* Content */}
      <div className="grid lg:grid-cols-[1fr_1fr] gap-0 min-h-[480px]">
        {/* Left: image in device frame */}
        <div className="relative border-r border-white/8 bg-[#060d14] p-6 flex items-center justify-center">
          <div className="relative w-full max-w-sm">
            {/* Monitor frame */}
            <div className="relative rounded-xl overflow-hidden border-2 border-[#1e2d3d] shadow-2xl shadow-black/80">
              <div className="bg-[#1e2d3d] h-7 flex items-center px-3 gap-1.5">
                <div className="h-1.5 w-8 rounded-full bg-white/10" />
                <div className="h-1.5 flex-1 rounded-full bg-white/5" />
              </div>
              <div className="relative aspect-video">
                <img src={mod.image} alt="" className="w-full h-full object-cover transition-all duration-700" />
                <div className="absolute inset-0 bg-[#F5C518]/5" />
              </div>
            </div>
            {/* Monitor stand */}
            <div className="mx-auto mt-0 h-6 w-16 bg-[#1e2d3d] rounded-b-xl" />
            <div className="mx-auto h-1.5 w-24 bg-[#1a2535] rounded-full" />
          </div>
        </div>
        {/* Right: terminal output */}
        <div className="p-6 font-mono text-sm bg-[#0a0f16] flex flex-col justify-center">
          <p className="text-slate-600 text-xs mb-4">
            <span className="text-[#F5C518]">jconefix</span>
            <span className="text-slate-500">@panel</span>
            <span className="text-slate-600">:~$</span>
            <span className="text-white ml-2">describe --module {mod.id} --verbose</span>
          </p>
          <div className="space-y-1 mb-4">
            <p className="text-slate-500 text-xs">// Módulo {String(idx + 1).padStart(2, '0')} de 09</p>
            <p className="text-[#F5C518] text-xs font-semibold">──────────────────────────────</p>
          </div>
          <h3 className="text-white text-xl font-bold font-sans mb-3 leading-tight">{mod.title}</h3>
          <p className="text-slate-400 text-xs leading-relaxed mb-5 font-sans">{mod.tagline}</p>
          <div className="space-y-2 mb-6">
            {mod.bullets.map((b, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[#F5C518] shrink-0 text-xs mt-0.5">&gt;</span>
                <p className="text-slate-300 text-xs leading-relaxed font-sans">{b}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-[#F5C518]">jconefix</span><span>:~$</span>
            <Link href="/register" className="inline-flex items-center gap-1 bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] px-3 py-1 rounded hover:bg-[#F5C518]/20 transition-colors font-mono">
              ./register --free
            </Link>
            <span className="w-2 h-4 bg-[#F5C518] animate-pulse ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VARIANT 4 — GLASS BLEED
   Image as hero background (full width), floating glass card with content.
══════════════════════════════════════════════════════════════════════════ */
function Variant4() {
  const [active, setActive] = useState('reparaciones');
  const mod = MODULES.find((m) => m.id === active)!;
  return (
    <div className="w-full">
      {/* Tab row */}
      <TabRow active={active} onChange={setActive} variant="minimal" />
      {/* Hero */}
      <div className="mt-6 relative w-full rounded-2xl overflow-hidden" style={{ minHeight: 540 }}>
        {/* Background image full bleed */}
        <img src={mod.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-all duration-700 scale-[1.02]" />
        <div className="absolute inset-0 bg-[#060d14]/75" />
        {/* Radial lime glow */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-[#F5C518]/8 blur-3xl pointer-events-none" />
        {/* Content in glass card, right side */}
        <div className="relative flex items-center justify-end h-full p-6 sm:p-10 min-h-[540px]">
          <div className="w-full max-w-lg bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-2xl p-7 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-[#F5C518]/15 border border-[#F5C518]/25 flex items-center justify-center">
                <mod.Icon className="h-5 w-5 text-[#F5C518]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5C518]">Módulo</p>
                <p className="text-xs text-slate-300 font-medium">{mod.sub}</p>
              </div>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-snug mb-3">{mod.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-5">{mod.tagline}</p>
            <div className="space-y-2.5 mb-6">
              {mod.bullets.map((b, i) => (
                <div key={i} className="flex gap-2.5 items-start bg-white/[0.04] rounded-lg p-3 border border-white/8">
                  <Zap className="h-3.5 w-3.5 text-[#F5C518] mt-0.5 shrink-0" strokeWidth={2} />
                  <p className="text-xs text-slate-300 leading-relaxed">{b}</p>
                </div>
              ))}
            </div>
            <Link href="/register">
              <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F5C518] text-[#0D1117] py-3 text-sm font-bold hover:bg-[#D4A915] transition-colors shadow-lg shadow-[#F5C518]/25">
                Prueba gratis — sin tarjeta <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
        {/* Module name overlay bottom-left */}
        <div className="absolute bottom-6 left-8 hidden md:block">
          <p className="font-serif text-6xl sm:text-7xl font-black text-white/[0.06] select-none leading-none uppercase tracking-tighter">
            {mod.label}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VARIANT 5 — BENTO GRID
   Modular card grid: big image + info card + two feature cards.
══════════════════════════════════════════════════════════════════════════ */
function Variant5() {
  const [active, setActive] = useState('reparaciones');
  const mod = MODULES.find((m) => m.id === active)!;
  const idx = MODULES.findIndex((m) => m.id === active);
  return (
    <div className="w-full">
      {/* Tabs */}
      <TabRow active={active} onChange={setActive} />
      {/* Bento grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Big image — col-span-2, row-span-2 */}
        <div className="md:col-span-2 md:row-span-2 relative rounded-2xl overflow-hidden bg-[#0c1520] border border-white/8 min-h-[300px] md:min-h-[420px]">
          <img src={mod.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-all duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060d14]/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5C518]/15 border border-[#F5C518]/25 px-3 py-1 text-xs font-semibold text-[#F5C518] mb-2">
              <mod.Icon className="h-3 w-3" strokeWidth={2} />
              {mod.sub}
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">{mod.title}</h3>
          </div>
          {/* Corner number */}
          <div className="absolute top-4 right-5 font-mono text-[10px] text-white/20">{String(idx + 1).padStart(2, '0')}/09</div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl bg-[#0c1520] border border-white/8 p-5 flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="h-9 w-9 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center mb-4">
              <mod.Icon className="h-4.5 w-4.5 text-[#F5C518]" strokeWidth={1.5} />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{mod.tagline}</p>
          </div>
          <Link href="/register">
            <button className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#F5C518] text-[#0D1117] py-2.5 text-xs font-bold hover:bg-[#D4A915] transition-colors">
              Prueba gratis <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>

        {/* Stats/accent card */}
        <div className="rounded-2xl bg-[#F5C518]/5 border border-[#F5C518]/15 p-5 flex flex-col justify-center min-h-[140px]">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-[#F5C518]" strokeWidth={2} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5C518]">Módulo</span>
          </div>
          <p className="font-serif text-4xl font-black text-white/20 leading-none mb-1 select-none">{String(idx + 1).padStart(2, '0')}</p>
          <p className="text-xs text-slate-400">de 9 módulos conectados</p>
        </div>

        {/* Bullet 1 */}
        <div className="rounded-2xl bg-[#0c1520] border border-white/8 p-5 min-h-[140px]">
          <div className="h-1 w-8 rounded-full bg-[#F5C518] mb-4" />
          <p className="text-xs text-slate-300 leading-relaxed">{mod.bullets[0]}</p>
        </div>

        {/* Bullet 2 */}
        <div className="rounded-2xl bg-[#0c1520] border border-white/8 p-5 min-h-[140px]">
          <div className="h-1 w-8 rounded-full bg-[#F5C518]/40 mb-4" />
          <p className="text-xs text-slate-300 leading-relaxed">{mod.bullets[1]}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main showcase page ─────────────────────────────────────────────── */
const VARIANTS = [
  {
    num: 1, name: 'CINEMATIC',
    desc: 'Imagen ultra-ancha 21:9 a todo el ancho, bullets como tarjetas horizontales debajo. Impacto visual máximo.',
    Component: Variant1,
  },
  {
    num: 2, name: 'SIDE STORY',
    desc: 'Sidebar numerado vertical + imagen con gradiente lateral, texto superpuesto con fondo semitransparente. Muy editorial.',
    Component: Variant2,
  },
  {
    num: 3, name: 'TERMINAL / IDE',
    desc: 'Ventana de app con traffic lights, tabs como ficheros de código y la descripción estilo CLI. Para sorprender a técnicos.',
    Component: Variant3,
  },
  {
    num: 4, name: 'GLASS BLEED',
    desc: 'Imagen de fondo a pantalla completa, tarjeta de cristal flotando a la derecha. Muy moderno y atmosférico.',
    Component: Variant4,
  },
  {
    num: 5, name: 'BENTO GRID',
    desc: 'Grid tipo bento box: imagen grande, tarjeta de info, stats y bullets como cards independientes. Tendencia 2026.',
    Component: Variant5,
  },
];

export default function ModulosShowcasePage() {
  return (
    <div className="min-h-screen bg-[#070f18] text-white">
      {/* Header */}
      <div data-web-chrome className="sticky top-0 z-50 border-b border-white/8 bg-[#070f18]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-[#F5C518] flex items-center justify-center">
              <Wrench className="h-3.5 w-3.5 text-[#0D1117]" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-white">JC OneFix</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">Showcase — 5 variantes de diseño</span>
          </div>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Volver a la web
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-32">
        {/* Intro */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-4">Elige tu diseño</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            5 variantes para la sección de módulos
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Todas son interactivas — haz clic en los tabs para ver cada módulo.
            Dime cuál prefieres o si quieres combinar partes de varias.
          </p>
        </div>

        {/* Variants */}
        {VARIANTS.map(({ num, name, desc, Component }) => (
          <section key={num} className="scroll-mt-20">
            {/* Label */}
            <div className="flex items-start gap-4 mb-8">
              <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl bg-[#F5C518]/10 border border-[#F5C518]/25">
                <span className="font-mono text-lg font-black text-[#F5C518]">{num}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Opción {num} — <span className="text-[#F5C518]">{name}</span>
                </h2>
                <p className="text-slate-400 text-sm mt-1">{desc}</p>
              </div>
            </div>
            {/* Component */}
            <div className="rounded-3xl border border-white/8 bg-[#050c13] p-6 sm:p-8 shadow-2xl shadow-black/50">
              <Component />
            </div>
          </section>
        ))}

        {/* Footer CTA */}
        <div className="text-center py-10 border-t border-white/8">
          <p className="text-slate-400 text-sm mb-4">¿Cuál te gusta? Dime el número y lo pongo en producción.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-[#F5C518] text-sm font-semibold hover:text-[#D4A915] transition-colors">
            <ArrowRight className="h-4 w-4 rotate-180" />
            Volver a la web principal
          </Link>
        </div>
      </div>
    </div>
  );
}
