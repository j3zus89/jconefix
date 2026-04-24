import Link from 'next/link';
import { JcOneFixAppIcon } from '@/components/jc-one-fix-brand-icons';
import {
  JC_ONE_FIX_APP_ICON_VARIANTS,
  JC_ONE_FIX_JC_BADGE_SIZE_VARIANTS,
} from '@/components/jc-one-fix-app-icon-variants';

export const metadata = {
  title: 'Iconos JC ONE FIX — comparar variantes',
};

export default function IconDemosPage() {
  return (
    <div className="min-h-screen bg-[#050a12] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#0D1117] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[#F5C518]/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-3">Demos internas</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">Icono de app — comparar</h1>
        <p className="text-slate-400 max-w-2xl mb-4 leading-relaxed">
          Base: teal <span className="text-slate-300">#0D1117</span>, lima <span className="text-[#F5C518]">#F5C518</span>.
          Abajo: badge con <strong className="text-slate-200 font-semibold">JC lima en el centro</strong> en 5 proporciones distintas;
          más abajo, otras direcciones de icono.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          URL: <code className="rounded bg-white/10 px-2 py-0.5 text-[#F5C518]">/icon-demos</code>
        </p>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-[#F5C518] hover:text-[#D4A915] transition-colors mb-12"
        >
          ← Volver a landing Aurora
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#070f18]/80 backdrop-blur-xl p-8 mb-10">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-4">Producción (JC lima grande, sin anillos)</p>
          <div className="flex flex-wrap items-end gap-10">
            <div className="flex flex-col items-center gap-3">
              <JcOneFixAppIcon className="scale-[1.75] rounded-xl" />
              <span className="text-xs text-slate-500">Grande</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <JcOneFixAppIcon className="rounded-xl" />
              <span className="text-xs text-slate-500">Tamaño header</span>
            </div>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-4">Badge JC · 5 tamaños / proporciones</p>
        <div className="grid gap-6 sm:grid-cols-2 mb-14">
          {JC_ONE_FIX_JC_BADGE_SIZE_VARIANTS.map(({ id, title, blurb, Icon }) => (
            <div
              key={id}
              className="rounded-2xl border border-[#F5C518]/25 bg-[#070f18]/80 backdrop-blur-md p-6 flex flex-col gap-4 shadow-lg shadow-black/20"
            >
              <div>
                <h2 className="font-semibold text-white text-lg leading-snug">{title}</h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{blurb}</p>
                <p className="text-[10px] font-mono text-slate-600 mt-3">id: {id}</p>
              </div>
              <div className="flex flex-wrap items-end gap-8 pt-2 border-t border-white/10">
                <div className="flex flex-col items-center gap-2">
                  <Icon className="scale-[1.75] rounded-xl" />
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Grande</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Icon className="rounded-xl" />
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">UI</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Icon className="scale-[0.85] rounded-lg" />
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Compacto</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">Otras direcciones (1–5)</p>
        <div className="grid gap-6 sm:grid-cols-2">
          {JC_ONE_FIX_APP_ICON_VARIANTS.map(({ id, title, blurb, Icon }) => (
            <div
              key={id}
              className="rounded-2xl border border-white/10 bg-[#070f18]/70 backdrop-blur-md p-6 flex flex-col gap-4 shadow-lg shadow-black/20"
            >
              <div>
                <h2 className="font-semibold text-white text-lg leading-snug">{title}</h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{blurb}</p>
                <p className="text-[10px] font-mono text-slate-600 mt-3">id: {id}</p>
              </div>
              <div className="flex flex-wrap items-end gap-8 pt-2 border-t border-white/10">
                <div className="flex flex-col items-center gap-2">
                  <Icon className="scale-[1.75] rounded-xl" />
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Grande</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Icon className="rounded-xl" />
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">UI</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Icon className="scale-[0.85] rounded-lg" />
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Compacto</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
