'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Users,
  Receipt,
  BarChart3,
  Sparkles,
  Package,
  MessageCircle,
  Globe,
  ArrowRight,
  FileSpreadsheet,
  FileCheck,
  Clock,
  TrendingUp,
  Bell,
  Lock,
} from 'lucide-react';

const leftFeatures = [
  {
    icon: FileText,
    title: 'Órdenes de Trabajo Inteligentes',
    bullets: [
      'Crea tickets en segundos: IMEI, modelo y estado en un solo lugar.',
      'Flujos de trabajo personalizables (Recibido → Reparando → Listo).',
      'Historial completo: quién trabajó, qué se hizo y cuándo.',
    ],
  },
  {
    icon: Users,
    title: 'Base de Datos de Clientes & Equipos',
    bullets: [
      'Fichas únicas por cliente con todos sus equipos asociados.',
      'Importa tus datos desde Excel en minutos, no en días.',
      'Búsqueda instantánea: encontrá cualquier equipo por IMEI o nombre.',
    ],
  },
  {
    icon: Receipt,
    title: 'Facturación AFIP/ARCA Integrada',
    bullets: [
      'Generá facturas electrónicas sin salir del sistema.',
      'Compatible con Monotributo y Responsable Inscripto.',
      'Reportes automáticos para tu contador: IVA, ingresos, etc.',
    ],
  },
  {
    icon: BarChart3,
    title: 'Dashboard de Finanzas',
    bullets: [
      'Ingresos vs. Egresos por período (día, semana, mes).',
      'Deuda de clientes: quién debe y cuánto.',
      'Costos de reparación: piezas + mano de obra = rentabilidad real.',
    ],
  },
];

const rightFeatures = [
  {
    icon: Sparkles,
    title: 'IA Gemini Integrada',
    bullets: [
      'Redacta informes técnicos profesionales automáticamente.',
      'Sugiere diagnósticos basados en síntomas comunes.',
      'Presupuestos inteligentes que se ajustan a tu lista de precios.',
    ],
  },
  {
    icon: Package,
    title: 'Gestión de Inventario',
    bullets: [
      'Stock en tiempo real: sabé exactamente qué tenés y dónde.',
      'Alertas de reposición: nunca te quedes sin piezas clave.',
      'Códigos de barras para ubicaciones (cajón A-12, estantería B).',
    ],
  },
  {
    icon: MessageCircle,
    title: 'Envíos de WhatsApp Automáticos',
    bullets: [
      'Avisos al cliente: "Su equipo está listo para retirar".',
      'Presupuestos enviados directo al chat del cliente.',
      'Recordatorios de retiro para equipos olvidados.',
    ],
  },
  {
    icon: Globe,
    title: 'Portal del Cliente',
    bullets: [
      'Tu cliente escanea un QR y ve el estado de su reparación.',
      'Cero llamadas de "¿ya está mi celular?".',
      'Mayor transparencia = mayor confianza en tu taller.',
    ],
  },
];

const stats = [
  { icon: FileSpreadsheet, value: '+2.500', label: 'Presupuestos IA redactados' },
  { icon: Users, value: '+850', label: 'Clientes gestionados' },
  { icon: FileCheck, value: '+12.000', label: 'Equipos reparados' },
  { icon: Clock, value: '+6.000', label: 'Horas de trabajo ahorradas' },
];

function FeatureCard({ feature }: { feature: typeof leftFeatures[0] }) {
  const Icon = feature.icon;
  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#F5C518]/30 hover:bg-white/[0.04]">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5C518]/10 text-[#F5C518]">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-serif text-base font-semibold text-white">{feature.title}</h3>
      </div>
      <ul className="space-y-2">
        {feature.bullets.map((bullet, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5C518]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="relative border-y border-white/5 bg-[#0D1117] py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-[#F5C518]/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#F5C518]/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1920px] px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518]">
            Funcionalidades
          </p>
          <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
            Todo lo que tu taller necesita.{" "}
            <span className="text-[#F5C518]">Nada de lo que no.</span>
          </h2>
        </div>

        {/* Features Grid */}
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-4">
            {leftFeatures.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {rightFeatures.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-10 text-center">
          <Link href="/#modulos-detalle">
            <Button
              variant="outline"
              className="h-11 border-white/20 bg-white/[0.05] px-8 text-sm font-semibold text-white hover:border-[#F5C518]/50 hover:bg-[#F5C518]/10 hover:text-[#F5C518]"
            >
              Y mucho más...
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="mt-16 border-t border-white/10 pt-12">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5C518]/10 text-[#F5C518]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="font-serif text-2xl font-bold text-white sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
