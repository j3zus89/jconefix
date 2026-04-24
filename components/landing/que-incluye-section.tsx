import Image from 'next/image';
import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { JcOneFixMark } from '@/components/jc-one-fix-mark';
import { cn } from '@/lib/utils';

export type QueIncluyeModule = {
  id: string;
  title: string;
  tagline: string;
  icon: LucideIcon;
  imageCard?: string;
};

/** Descripción corta visible dentro de la tarjeta */
const SHORT_DESC: Record<string, string> = {
  reparaciones: 'Ficha, IMEI, estado y firma del cliente',
  clientes:     'Historial, leads y notas del equipo',
  inventario:   'Stock en tiempo real, alertas y ubicación por cajón en el taller.',
  pos:          'Cobro, descuentos y cierre de caja',
  comunicacion: 'Chat interno, portal online y seguimiento público con QR.',
  informes:     'Ingresos, productividad y tendencias',
  gastos:       'Categorías, margen y flujo de caja',
  operacion:    'Fichaje, turnos y guías internas',
  configuracion:
    'Roles, ARCA/AFIP (WS) y plantillas: facturación electrónica Argentina.',
  ia:           'Diagnóstico con Gemini y presupuestos listos para WhatsApp con IA.',
};

function ModuleCard({ m }: { m: QueIncluyeModule }) {
  const Icon = m.icon;
  const desc = SHORT_DESC[m.id] ?? '';
  const isIA  = m.id === 'ia';

  return (
    <Link
      href={`#detalle-${m.id}`}
      className={cn(
        // isolate + translateZ fix the square-corners flash on hover zoom
        'group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.10] outline-none isolate [transform:translateZ(0)]',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1.5 hover:border-[#F5C518]/50 hover:shadow-[0_12px_40px_-10px_rgba(245,197,24,0.22)]',
        'focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]',
        isIA && 'ring-1 ring-[#F5C518]/25 border-[#F5C518]/25'
      )}
    >
      {/* Badge IA */}
      {isIA && (
        <span className="absolute right-2.5 top-2.5 z-20 rounded-full bg-[#F5C518] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#0D1117] shadow-md">
          Nuevo
        </span>
      )}

      {/* Tarjeta full — imagen de fondo + contenido centrado */}
      <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-[#070f18] sm:h-52">
        {m.imageCard ? (
          <Image
            src={m.imageCard}
            alt={`Vista del módulo ${m.title} en Jconefix — control de taller, órdenes de reparación y stock`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover opacity-40 transition-all duration-500 will-change-transform group-hover:opacity-52 group-hover:scale-[1.07]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#F5C518]/30 to-[#0D1117]" />
        )}

        {/* Overlay — un poco más oscuro para contraste con título y descripción */}
        <div className="pointer-events-none absolute inset-0 bg-black/72" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/48 to-black/38" />

        {/* Contenido centrado */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center">
          {/* Icono */}
          <span
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl border',
              'border-[#F5C518]/45 bg-[#0D1117]/70 backdrop-blur-md',
              'text-[#F5C518] shadow-[0_0_24px_-4px_rgba(245,197,24,0.45)]',
              'transition-all duration-300',
              'group-hover:border-[#F5C518]/75 group-hover:bg-[#0D1117]/85',
              'group-hover:shadow-[0_0_36px_-4px_rgba(245,197,24,0.65)] group-hover:scale-110'
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={1.3} aria-hidden />
          </span>

          {/* Título */}
          <p className="text-[13px] font-bold leading-snug text-[#F5C518] [text-shadow:0_1px_8px_rgba(0,0,0,0.9)] sm:text-[14px]">
            {m.title}
          </p>

          {/* Descripción corta */}
          <p className="text-[12px] leading-snug text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.95)] sm:text-[13px]">
            {desc}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function QueIncluyeSection({ modules }: { modules: QueIncluyeModule[] }) {
  return (
    <section
      id="que-incluye"
      className="relative scroll-mt-[5.5rem] overflow-x-clip border-t border-white/5 py-14 sm:scroll-mt-24 sm:py-16 lg:py-20"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,197,24,0.18), transparent 55%), radial-gradient(ellipse 45% 35% at 95% 45%, rgba(245,197,24,0.15), transparent)',
        }}
      />

      <div className="relative w-full min-w-0 px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-14">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518]">
            Transparencia comercial
          </p>
          <h2 className="mb-3 font-serif text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-[2.25rem]">
            Qué incluye{' '}
            <JcOneFixMark className="font-bold" />
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Diez módulos completos en un solo panel.{' '}
            <span className="text-slate-200">Haz clic en cualquier tarjeta para ver la ficha detallada.</span>
          </p>
        </div>

        {/* Grid 5 × 2 */}
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-5">
          {modules.map((m) => (
            <ModuleCard key={m.id} m={m} />
          ))}
        </div>
      </div>
    </section>
  );
}
