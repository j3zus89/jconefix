'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ImportDemoInteractive() {

  return (
    <section
      id="import-demo"
      className="scroll-mt-[5.5rem] border-y border-white/5 bg-[#0D1117]/95 py-14 sm:scroll-mt-28 sm:py-20"
      aria-labelledby="import-demo-heading"
    >
      <div className="mx-auto w-full max-w-[1920px] min-w-0 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-stretch lg:gap-14">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518]">
              Smart Import
            </p>
            <h2
              id="import-demo-heading"
              className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl"
            >
              ¿Tenés tus clientes en Excel? Traelos en un clic
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              <strong className="text-[#F5C518]">La IA hace el trabajo sucio por vos.</strong> Subí tu planilla desordenada y nuestro sistema reconoce automáticamente nombres, teléfonos, modelos y estados. En segundos, todo organizado y listo para facturar.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-400">
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C518]" aria-hidden />
                <span>
                  <strong className="font-medium text-slate-300">IA que lee tu desorden:</strong> Columnas mal nombradas, datos dispersos, formatos raros — nosotros lo interpretamos todo.
                </span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C518]" aria-hidden />
                <span>
                  <strong className="font-medium text-slate-300">Cero pérdida de datos:</strong> Tu historial de clientes intacto, listo para que empieces a cobrar desde el día 1.
                </span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C518]" aria-hidden />
                <span>
                  <strong className="font-medium text-slate-300">De Excel a WhatsApp en 2 minutos:</strong> Una vez importado, usá la IA para mandar avisos a tus clientes automáticamente.
                </span>
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-full bg-[#F5C518] px-6 font-semibold text-[#0D1117] hover:bg-[#D4A915]"
              >
                <Link href="/register">Probar en mi taller (gratis)</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/25 bg-white/5 px-6 font-semibold text-white hover:bg-white/10"
              >
                <Link href="/ayuda/importar-datos-taller" className="inline-flex items-center gap-2">
                  Guía de migración
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </Button>
            </div>
            <p className="mt-5 max-w-xl text-xs leading-relaxed text-slate-500">
              <strong className="text-[#F5C518]">✓ Compatible con:</strong> SAT Network, Líder Gestión, Google Sheets, o cualquier Excel que tengas. La IA se adapta a TU formato.
            </p>
          </div>

          <div className="relative h-full min-h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0D1117]/80">
            <Image
              src="/jconefix_excel_ia_transition.png"
              alt="Transformación mágica: de Excel caótico a sistema organizado con IA"
              fill
              className="object-cover scale-[1.08]"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
