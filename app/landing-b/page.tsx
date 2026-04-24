'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PartnersMarquee } from '@/components/landing/partners-marquee';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  MessageSquare,
  Monitor,
  Package,
  Smartphone,
  Users,
  FileText,
} from 'lucide-react';
import { useState } from 'react';

const features = [
  {
    icon: Package,
    title: 'Gestión de inventario',
    shortLabel: 'Inventario',
    description:
      'Serializa piezas, genera órdenes de compra y mueve stock entre tiendas sin hojas de cálculo. Alertas de mínimos integradas al ticket.',
    image: 'inventory',
  },
  {
    icon: CreditCard,
    title: 'Cobros y POS',
    shortLabel: 'Pagos',
    description:
      'Unifica tarjeta, efectivo y links de pago. Cierra el ticket y refleja el ingreso en el mismo flujo que usa tu caja.',
    image: 'payments',
  },
  {
    icon: Calendar,
    title: 'Citas en línea',
    shortLabel: 'Citas',
    description:
      'Widget en tu web, recordatorios automáticos y calendario que respeta la capacidad real de cada técnico.',
    image: 'appointments',
  },
  {
    icon: MessageSquare,
    title: 'SMS y email',
    shortLabel: 'Mensajes',
    description:
      'Plantillas por etapa del servicio: recibido, en diagnóstico, listo para retirar. Menos llamadas repetitivas al mostrador.',
    image: 'notifications',
  },
  {
    icon: BarChart3,
    title: 'Reportes',
    shortLabel: 'Datos',
    description:
      'Margen por línea de negocio, productividad y ticket medio. Exporta o comparte con tu asesor fiscal en un clic.',
    image: 'reporting',
  },
];

const industries = [
  { name: 'Móviles', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80', desc: 'Smartphones y tablets' },
  { name: 'Ordenadores', image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&q=80', desc: 'Laptops y desktops' },
  { name: 'TV', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80', desc: 'LED, OLED, Smart TV' },
  { name: 'Drones', image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=500&q=80', desc: 'Equipos aéreos' },
  { name: 'Consolas', image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=500&q=80', desc: 'PS, Xbox, Switch' },
  { name: 'Electrodomésticos', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', desc: 'Línea blanca' },
  { name: 'Audio', image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&q=80', desc: 'Auriculares, altavoces' },
];

export default function LandingB() {
  const [activeFeature, setActiveFeature] = useState(0);
  const f = features[activeFeature];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav data-web-chrome className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-20">
            <Link href="/landing" className="flex items-center gap-2">
              <JcOneFixAppIcon className="rounded-lg" />
              <div className="leading-tight">
                <span className="block text-xl font-bold tracking-tight">
                  <JcOneFixMark tone="onLight" />
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Demo · Heritage</span>
              </div>
            </Link>
            <div className="hidden lg:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-slate-700 hover:text-[#0D1117]">
                Características
              </Link>
              <Link href="#value" className="text-sm font-medium text-slate-700 hover:text-[#0D1117]">
                Ventajas
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-slate-700 hover:text-[#0D1117]">
                Precios
              </Link>
              <Link href="#industries" className="text-sm font-medium text-slate-700 hover:text-[#0D1117]">
                Industrias
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden md:block text-sm font-semibold text-slate-700 hover:text-[#0D1117]">
                Iniciar sesión
              </Link>
              <Link href="/checkout?plan=basico&cycle=mensual">
                <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold rounded-md px-5 h-10 text-sm border-0">
                  Prueba gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative bg-[#0D1117] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative z-10 max-w-2xl">
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-[#F5C518] mb-6 leading-[1.05] tracking-tight drop-shadow-lg">
                La misma fuerza de tu home, en modo captación pura.
              </h1>
              <p className="text-lg text-white/85 mb-8 leading-relaxed max-w-xl">
                Hero, socios, módulos y rejilla de industrias como en la{' '}
                <Link href="/landing-a" className="underline decoration-[#F5C518]/60 hover:text-white">
                  landing clásica (/landing-a)
                </Link>
                —pero depurado para vender: menos ruido en la narrativa, más pruebas sociales y pricing claro.
              </p>
              <div className="flex flex-wrap gap-4 mb-6">
                <Link href="/checkout?plan=basico&cycle=mensual">
                  <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold rounded-md px-6 h-11 border-0">
                    Comenzar prueba
                  </Button>
                </Link>
                <Link href="#pricing">
                  <Button
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 font-semibold rounded-md px-6 h-11 bg-transparent"
                  >
                    Ver planes
                  </Button>
                </Link>
              </div>
              <p className="text-white/60 text-sm">Compatible con integraciones Zapier, Shopify, Xero y más.</p>
            </div>

            <div className="relative hidden lg:block h-[680px]">
              <div className="absolute top-16 left-8 z-10 animate-pulse">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                  <Package className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="absolute top-36 left-0 z-10 animate-pulse" style={{ animationDelay: '0.5s' }}>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-36 right-16 z-10 animate-pulse" style={{ animationDelay: '1s' }}>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute top-24 right-24 z-10 animate-pulse" style={{ animationDelay: '0.3s' }}>
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 shadow-lg">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
              </div>
              <img
                src="/geminix.png"
                alt="Equipo JC ONE FIX"
                className="w-full h-full object-contain object-right scale-[1.35] origin-right translate-x-10"
              />
            </div>
          </div>
        </div>
      </section>

      <PartnersMarquee tone="light" label="Suite de más de 40 socios integrados" hidden />

      <section id="features" className="py-20 bg-[#faf9f6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-slate-900 mb-3">Control de gestión de talleres</h2>
            <p className="text-base text-slate-600 max-w-3xl mx-auto">
              Explora cada módulo como en la home principal: iconos interactivos y panel que cambia al instante.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-5 mb-10">
            {features.map((feature, i) => (
              <button
                key={feature.title}
                type="button"
                onMouseEnter={() => setActiveFeature(i)}
                onClick={() => setActiveFeature(i)}
                className={`flex flex-col items-center text-center w-24 transition-all cursor-pointer ${
                  activeFeature === i ? 'scale-110' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center mb-2 transition-all ${
                    activeFeature === i ? 'bg-white border-[#0D1117] shadow-lg' : 'bg-white border-slate-200 hover:border-[#0D1117]/50'
                  }`}
                >
                  <feature.icon className={`h-6 w-6 ${activeFeature === i ? 'text-[#0D1117]' : 'text-slate-500'}`} />
                </div>
                <span
                  className={`text-xs font-medium ${
                    activeFeature === i ? 'text-[#0D1117]' : 'text-slate-600'
                  }`}
                >
                  {feature.shortLabel}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-sm border border-slate-100">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="relative order-2 lg:order-1">
                <div className="bg-[#f5f5dc] rounded-2xl p-4 lg:p-6 relative">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
                    <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-[#0D1117]" />
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="bg-white px-4 py-1 rounded text-xs text-slate-400 flex items-center justify-center gap-0.5 flex-wrap">
                          <JcOneFixMark tone="onLight" className="text-xs" />
                          <span>· {f.shortLabel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#0D1117]/10 flex items-center justify-center">
                          <f.icon className="h-5 w-5 text-[#0D1117]" />
                        </div>
                        <h4 className="font-semibold text-slate-900">{f.title}</h4>
                      </div>
                      <FeatureMock kind={f.image} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <p className="text-sm font-semibold text-[#0D1117] mb-2">En profundidad</p>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-4">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{f.description}</p>
                <ul className="space-y-2 text-sm text-slate-700">
                  {['Actualización en tiempo real', 'Permisos por rol y sede', 'Listo para multi-marca'].map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#0D1117] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="value" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Por qué los talleres nos eligen</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Tres pilares que ves reflejados en recepción y en la cuenta de resultados.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <ValueCard
              icon={Monitor}
              title="Una sola pantalla por empleado"
              body="Recepción ve cola y pagos; taller ve piezas y estados; gerencia ve KPIs. Sin duplicar Excel."
            />
            <ValueCard
              icon={FileText}
              title="Compliance sin fricción"
              body="Historial de ticket, fotos y firmas enlazados al cobro. Auditoría clara para franquicias."
            />
            <ValueCard
              icon={Users}
              title="Onboarding en horas"
              body="Plantillas por industria y migraciones asistidas. Tu equipo no para una semana por un cambio de software."
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 bg-[#faf9f6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-slate-900 mb-3">Precios simples, sin letra pequeña</h2>
            <p className="text-slate-600">Prueba gratis; escala cuando factures más o abras otra tienda.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <PriceBlock
              title="Plan Básico"
              price="39 €"
              sub="/mes o 390 €/año · 1 sede"
              bullets={['Hasta 3 usuarios', 'Tickets, clientes e inventario', 'Soporte por email']}
            />
            <PriceBlock
              title="Plan Profesional"
              price="49 €"
              sub="/mes o 490 €/año"
              highlight
              bullets={['Usuarios ilimitados', 'Informes avanzados y SMS', 'Inventario avanzado', 'Soporte prioritario']}
            />
          </div>
        </div>
      </section>

      <section id="industries" className="py-20 bg-[#faf9f6]">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-slate-900 mb-3">Industrias que servimos</h2>
            <p className="text-base text-slate-600 max-w-2xl mx-auto">Misma grilla visual que la página principal, lista para tu revisión.</p>
          </div>
          <div className="flex gap-4 w-full overflow-x-auto pb-2 lg:overflow-visible">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer flex-1 min-w-[200px] lg:min-w-0 border border-slate-100"
              >
                <div className="h-52 overflow-hidden">
                  <img
                    src={industry.image}
                    alt={industry.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 text-base mb-1 truncate">{industry.name}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{industry.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#0D1117]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-5">
                Listo para verse tan profesional como tu taller físico
              </h2>
              <Link href="/checkout?plan=basico&cycle=mensual">
                <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold rounded-md px-6 h-11 border-0">
                  Crear cuenta de prueba
                </Button>
              </Link>
            </div>
            <div className="hidden lg:flex justify-end">
              <div className="relative w-[280px] h-[280px]">
                <div className="absolute inset-0 bg-[#0D1117] rounded-full overflow-hidden ring-4 ring-white/20">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=90"
                    alt="Cliente satisfecho"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter variant="light" />
    </div>
  );
}

function FeatureMock({ kind }: { kind: string }) {
  if (kind === 'inventory') {
    return (
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-slate-600 border-b pb-2">
          <span>Valor de stock</span>
          <span className="font-semibold">58.420 €</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600 border-b pb-2">
          <span>Bajo mínimo</span>
          <span className="text-amber-600 font-semibold">9 piezas</span>
        </div>
        <div className="h-20 bg-slate-50 rounded flex items-end p-2 gap-1">
          {[60, 85, 45, 92, 70].map((h, i) => (
            <div key={i} className="flex-1 bg-[#0D1117] rounded" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }
  if (kind === 'payments') {
    return (
      <div className="space-y-3 text-center py-2">
        <CreditCard className="h-10 w-10 text-[#0D1117] mx-auto" />
        <p className="text-sm text-slate-600">Cobro asociado al ticket #4821</p>
        <div className="flex justify-between text-sm bg-slate-50 rounded-lg p-3">
          <span className="text-slate-500">Total</span>
          <span className="font-bold">189,00 €</span>
        </div>
      </div>
    );
  }
  if (kind === 'appointments') {
    return (
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-slate-500 font-medium">
            {d}
          </div>
        ))}
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className={`p-1.5 rounded ${i === 9 ? 'bg-amber-500 text-white font-bold' : 'bg-slate-50 text-slate-700'}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'notifications') {
    return (
      <div className="space-y-2">
        {[
          { t: 'SMS enviado', s: 'Listo para retirar · #4821' },
          { t: 'Email', s: 'Diagnóstico aprobado' },
        ].map((row) => (
          <div key={row.t} className="flex items-center gap-2 p-2 bg-[#0D1117]/5 rounded-lg border border-[#0D1117]/15">
            <MessageSquare className="h-4 w-4 text-[#0D1117]" />
            <div className="text-left text-xs">
              <p className="font-medium text-slate-800">{row.t}</p>
              <p className="text-slate-500">{row.s}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Margen 30 días</span>
        <span className="font-bold text-[#0D1117]">+18%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full w-[72%] bg-[#0D1117] rounded-full" />
      </div>
      <p className="text-xs text-slate-500">Comparativa vs. mismo periodo del año anterior</p>
    </div>
  );
}

function ValueCard({ icon: Icon, title, body }: { icon: typeof Monitor; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-8 hover:border-[#0D1117]/40 transition-colors shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-[#0D1117]/10 flex items-center justify-center mb-5">
        <Icon className="h-6 w-6 text-[#0D1117]" />
      </div>
      <h3 className="font-serif text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function PriceBlock({
  title,
  price,
  sub,
  bullets,
  highlight,
}: {
  title: string;
  price: string;
  sub: string;
  bullets: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 flex flex-col ${
        highlight
          ? 'border-[#0D1117] bg-white shadow-lg ring-2 ring-[#F5C518]/50 scale-[1.02]'
          : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-sm font-semibold text-[#0D1117] mb-1">{title}</p>
      <p className="text-3xl font-bold text-slate-900">{price}</p>
      <p className="text-sm text-slate-500 mb-6">{sub}</p>
      <ul className="space-y-2 mb-8 flex-1 text-sm text-slate-700">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0D1117] shrink-0 mt-0.5" />
            {b}
          </li>
        ))}
      </ul>
      <Link href="/checkout?plan=basico&cycle=mensual" className="w-full">
        <Button
          className={`w-full h-11 font-semibold ${
            highlight ? 'bg-[#0D1117] hover:bg-[#0f3d3a] text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          }`}
        >
          Elegir {title}
        </Button>
      </Link>
    </div>
  );
}
