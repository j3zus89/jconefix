import Link from 'next/link';
import { JcOneFixMark } from '@/components/jc-one-fix-mark';
import { JC_ONE_FIX_ONE_O_WRENCH_STYLE_VARIANTS } from '@/components/jc-one-fix-one-o-wrench-variants';
import { JcOneFixMarkWithOneO } from '@/components/jc-one-fix-one-o-variants';

export const metadata = {
  title: 'JC ONE FIX — variantes O con llave (archivo)',
};

export default function OWrenchDemosPage() {
  return (
    <div className="min-h-screen bg-[#050a12] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-85">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#0D1117] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[#F5C518]/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-3">Demos de marca</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3">O con llave (solo demos)</h1>
        <p className="text-slate-400 max-w-2xl leading-relaxed mb-2">
          En producción la O es ahora <strong className="text-slate-200 font-medium">squircle doble</strong>. Aquí conservas
          variantes con disco + llave lima <span className="text-[#F5C518]">#F5C518</span> por si las quieres retomar.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          <code className="rounded bg-white/10 px-2 py-0.5 text-[#F5C518]">/o-wrench-demos</code>
        </p>
        <Link href="/o-symbol-demos" className="inline-flex text-sm font-medium text-[#F5C518] hover:text-[#D4A915] mr-6">
          ← Otras O (sin llave)
        </Link>
        <Link href="/" className="inline-flex text-sm font-medium text-slate-400 hover:text-white">
          Aurora
        </Link>

        <div className="mt-12 rounded-2xl border border-white/10 bg-[#070f18]/85 backdrop-blur-xl p-8 space-y-5 mb-10">
          <p className="text-xs uppercase tracking-wider text-slate-500">Wordmark actual (squircle doble)</p>
          <div className="font-serif text-2xl sm:text-3xl font-bold">
            <JcOneFixMark tone="onDark" />
          </div>
          <div className="rounded-xl bg-white p-5">
            <div className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
              <JcOneFixMark tone="onLight" />
            </div>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-4">5 variantes nuevas</p>

        <div className="space-y-8">
          {JC_ONE_FIX_ONE_O_WRENCH_STYLE_VARIANTS.map(({ id, title, blurb, OneO }) => (
            <div
              key={id}
              className="rounded-2xl border border-white/10 bg-[#070f18]/80 backdrop-blur-xl p-6 sm:p-8 shadow-lg shadow-black/25"
            >
              <h2 className="font-semibold text-lg text-white">{title}</h2>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
