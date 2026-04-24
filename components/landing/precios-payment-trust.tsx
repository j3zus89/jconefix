import { Wallet } from 'lucide-react';

/** Contratación en Argentina: solo Mercado Pago (ícono genérico, no isotipo MP). */
export function PreciosPaymentTrustBar() {
  return (
    <section
      className="border-t border-white/10 bg-black/20 px-4 py-10 sm:px-6"
      aria-labelledby="precios-medios-pago"
    >
      <div className="mx-auto max-w-4xl">
        <h2 id="precios-medios-pago" className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
          Medio de pago al contratar
        </h2>
        <ul className="mt-6 flex flex-wrap items-stretch justify-center gap-4 sm:gap-6">
          <li className="flex min-h-[3.25rem] max-w-[16rem] flex-1 basis-[220px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 shadow-sm sm:min-w-[240px]">
            <Wallet className="h-8 w-8 shrink-0 text-[#009EE3]" aria-hidden />
            <p className="text-sm font-semibold text-white">Mercado Pago</p>
          </li>
        </ul>
      </div>
    </section>
  );
}
