'use client';

import { cn } from '@/lib/utils';
import type { OrgCountry } from '@/lib/locale';
import { MiniFlagSvg } from '@/components/dashboard/MiniFlagSvg';

type Props = {
  country: OrgCountry | string | null | undefined;
  className?: string;
};

/**
 * Bandera gráfica (SVG) con animación de ondeo; AR o ES según la región del taller.
 */
export function RegionWavingFlag({ country, className }: Props) {
  const c = String(country || 'AR').toUpperCase();
  const isAR = c === 'AR';
  const label = isAR ? 'Región operativa: Argentina' : 'Región operativa: España';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center align-middle',
        className
      )}
      title={label}
      role="img"
      aria-label={label}
    >
      {/* Ondear solo el lienzo; el anillo viaja con la tela */}
      <span
        className="animate-region-flag-wave inline-block overflow-hidden rounded-[2px] ring-1 ring-white/35 shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
        aria-hidden
      >
        <MiniFlagSvg country={isAR ? 'AR' : 'ES'} />
      </span>
    </span>
  );
}
