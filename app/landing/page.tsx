import Link from 'next/link';
import { ArrowRight, Layers, Leaf, Sparkles } from 'lucide-react';
import { JcOneFixAppIcon } from '@/components/jc-one-fix-mark';

const variants = [
  {
    href: '/',
    title: 'Aurora Command',
    subtitle: 'Modo oscuro premium · sitio oficial',
    desc: 'Gradientes, bento de funciones, KPIs flotantes, testimonios en carrusel, pricing e industrias — tono enterprise sin perder la marca teal + lima. Ahora es la home en /.',
    chip: 'Alta densidad visual',
    accent: 'from-emerald-950 via-slate-900 to-[#0a1628]',
    border: 'border-emerald-500/30',
  },
  {
    href: '/landing-a',
    title: 'Heritage Pro',
    subtitle: 'Landing clásica (respaldo)',
    desc: 'Sticky nav blanca, hero teal con geminix.png, carrusel de socios, iconos interactivos de módulos, rejilla de industrias y CTA — misma página que antes estaba en /.',
    chip: 'Fiel al sitio actual',
    accent: 'from-[#F5C518] via-[#0D1117] to-slate-900',
    border: 'border-[#F5C518]/40',
  },
  {
    href: '/landing-c',
    title: 'Studio Editorial',
    subtitle: 'Narrativa + datos',
    desc: 'Layout asimétrico, mock del dashboard, historia en 3 actos, tabla comparativa, prueba social, FAQ acordeón y cierre en vidrio.',
    chip: 'Storytelling limpio',
    accent: 'from-[#f4f2ed] via-white to-[#e8f5f1]',
    border: 'border-slate-200',
    light: true,
  },
];

export default function LandingExamplesIndex() {
  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#F5C518]/25 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 py-16 lg:py-24">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F5C518]/35 bg-[#F5C518]/10 px-3 py-1 text-xs font-semibold text-[#F5C518]">
            <Sparkles className="h-3.5 w-3.5" />
            Demos de marketing
          </div>
          <span className="text-xs text-slate-500">La ruta principal / no se modifica</span>
        </div>
        <div className="flex items-start gap-3 mb-6">
          <JcOneFixAppIcon className="mt-1 rounded-xl p-2.5 ring-white/10" />
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold font-serif tracking-tight text-white mb-2">
              Tres landings a altura de tu homepage
            </h1>
            <p className="text-slate-300 max-w-2xl leading-relaxed">
              Cada variante está pensada para rivalizar con la riqueza de <span className="text-white font-medium">localhost:3000</span>: navegación completa, prueba social, módulos,
              industrias y cierres comerciales. Abre la que quieras comparar lado a lado con tu home.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-12">
          {variants.map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className={`group relative flex flex-col rounded-3xl border overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl ${
                v.light ? 'bg-white text-slate-900 border-slate-200' : `bg-gradient-to-br ${v.accent} border ${v.border}`
              }`}
            >
              <div className={`h-36 relative ${v.light ? 'bg-gradient-to-br from-[#F5C518]/10 to-[#F5C518]/10' : ''}`}>
                {!v.light && <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath d=%27M30 0L60 30L30 60L0 30Z%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.06)%27/%3E%3C/svg%3E')]" />}
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {v.light ? <Leaf className="h-5 w-5 text-[#F5C518]" /> : <Layers className="h-5 w-5 text-[#F5C518]" />}
                    <span className={`text-xs font-semibold uppercase tracking-wider ${v.light ? 'text-[#F5C518]' : 'text-[#F5C518]'}`}>
                      {v.subtitle}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      v.light ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white/90'
                    }`}
                  >
                    {v.chip}
                  </span>
                </div>
              </div>
              <div className={`p-6 flex flex-col flex-1 ${v.light ? '' : ''}`}>
                <h2 className={`text-xl font-bold font-serif mb-2 ${v.light ? 'text-slate-900' : 'text-white'}`}>{v.title}</h2>
                <p className={`text-sm leading-relaxed flex-1 mb-6 ${v.light ? 'text-slate-600' : 'text-slate-300'}`}>{v.desc}</p>
                <span
                  className={`inline-flex items-center gap-2 text-sm font-semibold ${
                    v.light ? 'text-[#F5C518]' : 'text-[#F5C518] group-hover:text-white'
                  }`}
                >
                  Abrir demo
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
