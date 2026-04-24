'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PartnersMarquee } from '@/components/landing/partners-marquee';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import {
  Check,
  ChevronDown,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  Plug,
  Quote,
  Wallet,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: '¿Necesito hardware especial en mostrador?',
    a: (
      <>
        No. <JcOneFixMark tone="onLight" className="font-semibold" /> corre en navegador moderno y tablet. Si ya tienes
        impresora de tickets o lector de barras USB, lo integramos en el flujo estándar.
      </>
    ),
  },
  {
    q: '¿Puedo migrar tickets abiertos desde otra herramienta?',
    a: 'Sí. Importamos CSV o, en planes superiores, sincronizamos vía API con tu stack actual para no perder historial de clientes.',
  },
  {
    q: '¿Cómo funciona el multi-sede?',
    a: 'Cada ubicación tiene su inventario y cola, con transferencias auditadas y reportes consolidados para la matriz o franquicia.',
  },
  {
    q: '¿Qué incluye la prueba gratuita?',
    a: 'Usuarios reales, datos de demo o importación piloto y acceso a módulos core durante el periodo de evaluación sin pedir tarjeta.',
  },
];

const industries = [
  { name: 'Móviles', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80' },
  { name: 'Computación', image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80' },
  { name: 'Gaming', image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=400&q=80' },
  { name: 'Hogar', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
];

export default function LandingC() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-slate-900">
      <nav data-web-chrome className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#f4f2ed]/90 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-3">
            <JcOneFixAppIcon className="h-10 w-10 rounded-2xl p-2 shadow-lg shadow-[#0D1117]/25" />
            <div>
              <span className="block font-bold text-slate-900 tracking-tight">
                <JcOneFixMark tone="onLight" />
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Demo · Editorial</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#story" className="hover:text-[#0D1117]">
              Historia
            </Link>
            <Link href="#compare" className="hover:text-[#0D1117]">
              Comparar
            </Link>
            <Link href="#faq" className="hover:text-[#0D1117]">
              FAQ
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-[#0D1117] hidden sm:inline">
              Acceder
            </Link>
            <Link href="/checkout?plan=basico&cycle=mensual">
              <Button className="bg-[#0D1117] text-white hover:bg-[#D4A915] font-semibold rounded-full px-6 h-10 border-0">
                Probar gratis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D1117]/[0.07] via-transparent to-[#F5C518]/10 pointer-events-none" />
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-[#0D1117] uppercase mb-4">Product story · Studio</p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.35rem] font-bold leading-[1.08] text-slate-900 mb-6">
              Cada reparación cuenta una historia.
              <span className="text-[#0D1117]"> Tu software no puede ser el villano.</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-xl leading-relaxed mb-8">
              Propuesta editorial inspirada en la densidad de tu home principal: tipografía serif para el gancho,
              bloques claros para el viaje del cliente y pruebas que respaldan la promesa —sin sustituir la URL{" "}
              <span className="font-medium text-slate-800">/</span>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/checkout?plan=basico&cycle=mensual">
                <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold rounded-full h-11 px-7 border-0">
                  Empezar en minutos
                </Button>
              </Link>
              <Link href="#story">
                <Button variant="outline" className="rounded-full h-11 px-7 border-slate-300 bg-white/80">
                  Ver el recorrido
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-tr from-[#0D1117]/20 to-[#F5C518]/20 rounded-[2rem] blur-2xl opacity-60" />
            <div className="relative rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
              <div className="h-11 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0D1117]" />
                </div>
                <LayoutDashboard className="h-4 w-4 text-slate-400 ml-2" />
                <span className="text-xs text-slate-500">Pulse · Taller Central</span>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="col-span-2 rounded-xl bg-[#0D1117] text-white p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-white/70">Ingresos hoy</p>
                    <p className="text-2xl font-bold tabular-nums">3.842 €</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">Tickets cerrados</p>
                    <p className="text-xl font-semibold">37</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 mb-2">Cola activa</p>
                  <div className="space-y-2">
                    {['Diagnóstico', 'Esperando pieza', 'QC'].map((s, i) => (
                      <div key={s} className="flex items-center gap-2 text-xs">
                        <span className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-[#0D1117]' : 'bg-slate-300'}`} />
                        <span className="text-slate-700">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 mb-2">Satisfacción</p>
                  <p className="text-3xl font-bold text-[#0D1117]">4.9</p>
                  <p className="text-[10px] text-slate-400 mt-1">últimos 90 días</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Stripe', 'Twilio', 'Zapier', 'Shopify', 'Xero'].map((t) => (
                <span key={t} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PartnersMarquee tone="light" hidden />

      <section id="story" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Del mostrador al cobro, sin perder el hilo</h2>
            <p className="text-slate-600">
              Tres actos —igual que en tu storytelling principal— pero en vertical para lectura rápida en móvil.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-0 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-[#faf9f6]">
            <StoryStep
              n="01"
              icon={ClipboardList}
              title="Recepción que enamora"
              body="Fotos, síntomas y consentimientos en un flujo guiado. El cliente recibe confirmación al instante."
            />
            <StoryStep
              n="02"
              icon={Cpu}
              title="Taller sincronizado"
              body="Estados, reservas de pieza y chat interno. Cada técnico ve solo lo que necesita."
            />
            <StoryStep
              n="03"
              icon={Wallet}
              title="Cierre impecable"
              body="Factura, split de pagos y follow-up automático. Prepárate para reseñas de cinco estrellas."
            />
          </div>
        </div>
      </section>

      <section id="compare" className="py-20 bg-[#f4f2ed]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="font-serif text-3xl font-bold text-slate-900 mb-2">
                Sin <JcOneFixMark tone="onLight" className="font-bold font-serif" /> vs. con{' '}
                <JcOneFixMark tone="onLight" className="font-bold font-serif" />
              </h2>
              <p className="text-slate-600 max-w-xl">Tabla directa para decisiones de compra — estética studio, datos duros.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Plug className="h-4 w-4 text-[#0D1117]" />
              Conectores listos para tu stack actual
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                  <th className="py-4 px-5 font-semibold">Criterio</th>
                  <th className="py-4 px-5 font-semibold text-rose-700">Herramientas sueltas</th>
                  <th className="py-4 px-5 font-semibold text-[#0D1117]">
                    <JcOneFixMark tone="onLight" className="font-semibold" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <CompareRow label="Visibilidad en tiempo real" bad="Spreadsheets y grupos de chat" good="Tablero único multi-rol" />
                <CompareRow label="Experiencia del cliente" bad="Llamadas de '¿ya está?'" good="SMS/email por hito automático" />
                <CompareRow label="Inventario" bad="Errores al facturar piezas" good="Serializado y transferencias entre sedes" />
                <CompareRow label="Reporting" bad="Exportaciones manuales" good="KPIs listos y comparativas de periodo" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="rounded-3xl bg-[#0D1117] px-8 py-10 lg:px-14 lg:py-12 grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
            <div>
              <Quote className="h-10 w-10 text-[#F5C518]/80 mb-4" />
              <p className="font-serif text-2xl sm:text-3xl text-white leading-snug mb-4">
                “Pasamos de reaccionar a anticiparnos. El taller por fin respira al mismo ritmo que marketing.”
              </p>
              <p className="text-sm text-white/70">Irene P. · Directora de operaciones · Cadena 6 tiendas</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/20 p-6 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-widest text-[#F5C518] mb-2">Snapshot</p>
              <ul className="space-y-3 text-white/90 text-sm">
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span>Tickets sin re-clasificar</span>
                  <span className="font-semibold">−61%</span>
                </li>
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span>Tiempo medio en mostrador</span>
                  <span className="font-semibold">−4.2 min</span>
                </li>
                <li className="flex justify-between">
                  <span>Recurrencia 90d</span>
                  <span className="font-semibold text-[#F5C518]">+22%</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#faf9f6] border-t border-slate-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="font-serif text-2xl font-bold text-center text-slate-900 mb-8">Especialistas en categorías que ya muestras en casa</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {industries.map((ind) => (
              <div key={ind.name} className="group relative rounded-2xl overflow-hidden aspect-[4/5] border border-slate-200 shadow-sm">
                <img src={ind.image} alt={ind.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <p className="absolute bottom-4 left-4 font-semibold text-white">{ind.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 bg-white">
        <div className="max-w-[800px] mx-auto px-6 lg:px-12">
          <h2 className="font-serif text-3xl font-bold text-center text-slate-900 mb-3">Preguntas frecuentes</h2>
          <p className="text-center text-slate-600 mb-10">Todo lo que el comprador técnico o el dueño del taller suele preguntar antes de migrar.</p>
          <div className="space-y-3">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} className="rounded-2xl border border-slate-200 bg-[#faf9f6] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-slate-900 hover:bg-slate-50/80 transition-colors"
                  >
                    {item.q}
                    <ChevronDown className={`h-5 w-5 text-[#0D1117] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-[900px] mx-auto rounded-[2rem] border border-slate-200 bg-gradient-to-br from-[#0D1117] to-[#0c302c] p-10 lg:p-14 text-center shadow-2xl shadow-[#0D1117]/20">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">¿Listo para enseñar esta versión al equipo?</h2>
          <p className="text-white/75 mb-8 max-w-lg mx-auto">
            Esta URL es solo demo. Tu landing principal en <span className="text-[#F5C518] font-medium">/</span> permanece intacta.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/checkout?plan=basico&cycle=mensual">
              <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold rounded-full h-11 px-8 border-0">
                Abrir cuenta de prueba
              </Button>
            </Link>
            <Link href="/landing">
              <Button variant="outline" className="rounded-full h-11 px-8 border-white/40 text-white bg-transparent hover:bg-white/10">
                Ver otras propuestas
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter variant="light" />
    </div>
  );
}

function StoryStep({ n, icon: Icon, title, body }: { n: string; icon: typeof ClipboardList; title: string; body: string }) {
  return (
    <div className="p-8 lg:p-10 bg-[#faf9f6]">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold text-[#0D1117] tracking-widest">{n}</span>
        <Icon className="h-5 w-5 text-[#0D1117]" />
      </div>
      <h3 className="font-serif text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function CompareRow({ label, bad, good }: { label: string; bad: string; good: string }) {
  return (
    <tr>
      <td className="py-4 px-5 font-medium text-slate-800">{label}</td>
      <td className="py-4 px-5 text-slate-600">
        <span className="inline-flex items-start gap-2">
          <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          {bad}
        </span>
      </td>
      <td className="py-4 px-5 text-slate-700">
        <span className="inline-flex items-start gap-2">
          <Check className="h-4 w-4 text-[#0D1117] shrink-0 mt-0.5" />
          {good}
        </span>
      </td>
    </tr>
  );
}
