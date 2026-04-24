'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const STATUSES: { id: string; label: string }[] = [
  { id: 'recibido', label: 'Recibido' },
  { id: 'en-proceso', label: 'En proceso' },
  { id: 'diagnostico', label: 'En diagnóstico' },
  { id: 'reparacion', label: 'En reparación' },
  { id: 'reparado', label: 'Reparado' },
  { id: 'entregado', label: 'Entregado' },
];

/**
 * Solo franjas del borde de la **columna del hero** (donde el bloque foto+mockup no llega
 * y se ve el fondo oscuro con rombos). Nada hacia el centro: ahí está el técnico o el panel.
 */
const BADGE_POSITIONS: string[] = [
  'left-[0.5rem] top-[10%] lg:left-[1%]',
  'left-[0.5rem] top-[28%] lg:left-[1%]',
  'left-[0.5rem] top-[48%] lg:left-[1%]',
  'left-[0.5rem] top-[68%] lg:left-[1%]',
  'left-[0.5rem] bottom-[14%] lg:left-[1%]',
  'left-[0.5rem] bottom-[4%] lg:left-[2%]',
  'right-[0.5rem] top-[12%] lg:right-[1%]',
  'right-[0.5rem] top-[30%] lg:right-[1%]',
  'right-[0.5rem] top-[50%] lg:right-[1%]',
  'right-[0.5rem] top-[70%] lg:right-[1%]',
  'right-[0.5rem] bottom-[16%] lg:right-[1%]',
  'right-[0.5rem] bottom-[5%] lg:right-[2%]',
  'left-[1rem] top-[3%] lg:left-[2%] lg:top-[4%]',
  'right-[1rem] top-[3%] lg:right-[2%] lg:top-[4%]',
  'left-[1rem] bottom-[2%] lg:left-[2%] lg:bottom-[3%]',
  'right-[1rem] bottom-[2%] lg:right-[2%] lg:bottom-[3%]',
];

function pickNextPosition(prev: number, recent: number[]): { next: number; recent: number[] } {
  const n = BADGE_POSITIONS.length;
  const exclude = new Set<number>([prev, ...recent]);
  let pool = BADGE_POSITIONS.map((_, i) => i).filter((i) => !exclude.has(i));
  if (pool.length === 0) {
    pool = BADGE_POSITIONS.map((_, i) => i).filter((i) => i !== prev);
  }
  const next =
    pool[Math.floor(Math.random() * pool.length)] ?? ((prev + 1) % n);
  const nextRecent = [next, ...recent].slice(0, 5);
  return { next, recent: nextRecent };
}

function nextHoldMs(): number {
  const base = 3000;
  const jitter = Math.round((Math.random() - 0.5) * 900);
  return Math.min(3800, Math.max(2400, base + jitter));
}

const floatGlassBadge =
  'rounded-xl border border-white/40 bg-white/[0.14] backdrop-blur-[10px] shadow-[0_8px_28px_rgba(0,0,0,0.45)]';

type BadgeState = { statusIndex: number; posIndex: number; tick: number };

/**
 * Capa bajo el visual (z-10): en el centro la foto/mockup tapan; en los márgenes de columna
 * solo hay fondo con patrón — ahí el texto blanco se lee.
 * max-lg:hidden: en una columna estrecha no hay franja vacía y el badge caería sobre la foto.
 */
export function HeroTicketStatusOrbit({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const recentPosRef = useRef<number[]>([]);
  // Sin Math.random() en el estado inicial: SSR e hidratación deben coincidir (mismo posIndex).
  const [badge, setBadge] = useState<BadgeState>({
    statusIndex: 0,
    posIndex: 0,
    tick: 0,
  });

  const advance = useCallback(() => {
    setBadge((b) => {
      const { next, recent } = pickNextPosition(b.posIndex, recentPosRef.current);
      recentPosRef.current = recent;
      return {
        statusIndex: (b.statusIndex + 1) % STATUSES.length,
        posIndex: next,
        tick: b.tick + 1,
      };
    });
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        advance();
        schedule();
      }, nextHoldMs());
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [advance, reduceMotion]);

  useEffect(() => {
    if (!reduceMotion) return;
    const id = window.setInterval(advance, 3500);
    return () => window.clearInterval(id);
  }, [advance, reduceMotion]);

  const current = STATUSES[badge.statusIndex];
  const positionClass = BADGE_POSITIONS[badge.posIndex] ?? BADGE_POSITIONS[0];

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-[5] overflow-visible',
        'hidden lg:block',
        className
      )}
    >
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Estado del ticket: {current.label}
      </span>
      <AnimatePresence mode="wait">
        <motion.div
          key={badge.tick}
          className={cn(
            'absolute max-w-[min(10.5rem,calc(50vw-4rem))]',
            positionClass
          )}
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 10, scale: 0.94 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.98 }
          }
          transition={{
            duration: reduceMotion ? 0.18 : 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div
            className={cn(
              floatGlassBadge,
              'px-2.5 py-1.5 sm:px-3 sm:py-1.5'
            )}
          >
            <p
              className={cn(
                'text-center text-[10px] font-extralight leading-snug tracking-wide text-white sm:text-[11px]'
              )}
            >
              {current.label}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
