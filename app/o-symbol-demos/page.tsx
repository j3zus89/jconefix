import Link from 'next/link';
import { JcOneFixMark } from '@/components/jc-one-fix-mark';
import {
  JC_ONE_FIX_ONE_O_VARIANTS,
  JcOneFixMarkWithOneO,
} from '@/components/jc-one-fix-one-o-variants';

export const metadata = {
  title: 'JC ONE FIX — variantes de la O',
};

const VARIANTS_A = JC_ONE_FIX_ONE_O_VARIANTS.slice(0, 5);
const VARIANTS_B = JC_ONE_FIX_ONE_O_VARIANTS.slice(5);

function VariantCards({
  items,
}: {
  items: typeof JC_ONE_FIX_ONE_O_VARIANTS;
}) {
  return (
    <>
      {items.map(({ id, title, blurb, OneO }) => (
        <div
          key={id}
          className="rounded-2xl border border-white/10 bg-[#070f18]/75 backdrop-blur-md p-6 sm:p-8 shadow-lg shadow-black/25"
        >
          <h2 className="font-semibold text-lg text-white leading-snug">{title}</h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">{blurb}</p>
          <p className="text-[10px] font-mono text-slate-600 mt-2">id: {id}</p>
          <div className="mt-6 space-y-5 pt-5 border-t border-white/10">
            <div className="font-serif text-2xl sm:text-3xl font-bold">
              <JcOneFixMarkWithOneO tone="onDark" OneO={OneO} />
            </div>
            <div className="rounded-xl bg-white p-5">
              <div className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                <JcOneFixMarkWithOneO tone="onLight" OneO={OneO} />
              </div>
            </div>
            <div className="font-serif text-xl sm:text-2xl font-bold text-slate-300">
              <JcOneFixMarkWithOneO tone="onDark" className="opacity-90" OneO={OneO} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default function OneOSymbolDemosPage() {
  return (
    <div className="min-h-screen bg-[#050a12] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-85">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#0D1117] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-[#F5C518]/12 blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 h-72 w-72 rounded-full bg-[#F5C518]/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-3">Demos de marca</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3">La “O” de ONE — 10 propuestas</h1>
        <p className="text-slate-400 max-w-2xl leading-relaxed mb-2">
          Incluye 5 direcciones nuevas (6–10). Misma paleta: lima <span className="text-[#F5C518]">#F5C518</span>, teal{' '}
          <span className="text-slate-300">#0D1117</span> donde aplica, blanco o tinta según fondo.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Enlace directo:{' '}
          <code className="rounded bg-white/10 px-2 py-0.5 text-[#F5C518]">/o-symbol-demos</code>
        </p>
        <Link href="/" className="inline-flex text-sm font-medium text-[#F5C518] hover:text-[#D4A915] mb-12">
          ← Volver a Aurora
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#070f18]/85 backdrop-blur-xl p-8 mb-10 space-y-6">
          <p className="text-xs uppercase tracking-wider text-slate-500">Actual (squircle doble · producción)</p>
          <div className="space-y-4">
            <div className="font-serif text-3xl sm:text-4xl font-bold">
              <JcOneFixMark tone="onDark" />
            </div>
            <div className="rounded-xl bg-white p-6">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-slate-900">
                <JcOneFixMark tone="onLight" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Serie previa · 1–5</p>
          <VariantCards items={VARIANTS_A} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] pt-4">Nuevas · 6–10</p>
          <VariantCards items={VARIANTS_B} />
        </div>
      </div>
    </div>
  );
}
