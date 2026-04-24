import { cn } from '@/lib/utils';

function LogoRow({ dark }: { dark?: boolean }) {
  const t = dark ? 'text-slate-400' : 'text-slate-700';
  const t2 = dark ? 'text-slate-500' : 'text-slate-600';
  return (
    <div className="flex items-center gap-12 px-6 shrink-0">
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-2xl font-bold text-orange-500">_</span>
        <span className={`text-xl font-bold ${t}`}>zapier</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[#F5C518] text-2xl">🛍</span>
        <span className={`text-lg font-bold ${t}`}>shopify</span>
      </div>
      <div className="flex items-center shrink-0">
        <span className={`text-lg font-bold ${t2}`}>
          mobile<span className="text-blue-400">Denzo</span>
        </span>
      </div>
      <div className="flex items-center shrink-0">
        <span className="text-2xl font-bold text-purple-600">WOO</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="bg-purple-900 text-white px-2 py-1 text-xs font-bold rounded">MOD</span>
        <span className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-500'} leading-tight`}>
          OFFICIAL
          <br />
          PARTNER
        </span>
      </div>
      <div className="flex items-center justify-center w-16 h-16 bg-[#13B5EA] rounded-full shrink-0">
        <span className="text-white font-bold text-xl">xero</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[#F5C518] text-2xl">📱</span>
        <div className="leading-tight">
          <span className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-500'}`}>mobile</span>
          <span className={`text-lg font-bold ${t} block`}>Sentrix</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[#F5C518] text-2xl">🎯</span>
        <span className={`text-sm font-bold ${t}`}>
          Injured
          <br />
          Gadgets
        </span>
      </div>
    </div>
  );
}

export function PartnersMarquee({
  tone = 'light',
  label,
  /** Oculta toda la franja (claim + logos demo). El contenido se mantiene por si se reactiva. */
  hidden: visuallyHidden = false,
}: {
  tone?: 'light' | 'dark';
  label?: string;
  hidden?: boolean;
}) {
  const isDark = tone === 'dark';
  return (
    <section
      className={cn(
        visuallyHidden && 'hidden',
        isDark
          ? 'py-10 bg-slate-900/60 border-y border-white/10 overflow-hidden'
          : 'py-12 bg-slate-50 border-y border-slate-200 overflow-hidden'
      )}
      aria-hidden={visuallyHidden ? true : undefined}
    >
      <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 mb-6">
        <p
          className={`text-center text-sm ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {label ?? 'Impulsado por más de 40 socios integrados'}
        </p>
      </div>
      <div className="flex animate-marquee">
        <LogoRow dark={isDark} />
        <LogoRow dark={isDark} />
        <LogoRow dark={isDark} />
      </div>
    </section>
  );
}
