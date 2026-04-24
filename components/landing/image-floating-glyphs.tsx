'use client';

import { cn } from '@/lib/utils';
import { getModuleFloatingGlyphs } from '@/components/landing/module-float-icons';

type Props = {
  /** ID del módulo (solo datos serializables desde Server Components). */
  moduleId: string;
  className?: string;
};

/** Iconos blancos finos en cápsulas cristal, animación suave (mínimo ruido visual). */
export function ImageFloatingGlyphs({ moduleId, className }: Props) {
  const list = getModuleFloatingGlyphs(moduleId).filter(Boolean).slice(0, 2);
  if (list.length === 0) return null;

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-[6] overflow-hidden rounded-[inherit]', className)}
      aria-hidden
    >
      {list.map((Icon, i) => (
        <div
          key={`${i}-${Icon.displayName ?? 'icon'}`}
          className={cn(
            'absolute flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9',
            'border border-white/20 bg-slate-950/40 backdrop-blur-md',
            'shadow-[0_6px_20px_-4px_rgba(0,0,0,0.55)]',
            i === 0 ? 'animate-landing-soft-float' : 'animate-landing-soft-float-delayed',
            i === 0 && 'left-3 top-3 sm:left-4 sm:top-4',
            i === 1 && 'bottom-3 right-3 sm:bottom-4 sm:right-4'
          )}
        >
          <Icon className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" strokeWidth={1.1} />
        </div>
      ))}
    </div>
  );
}
