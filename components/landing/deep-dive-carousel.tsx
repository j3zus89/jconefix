'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ImageFloatingGlyphs } from '@/components/landing/image-floating-glyphs';

export type DeepDiveSlide = {
  title: string;
  subtitle: string;
  teaser: ReactNode;
  image: string;
  detalleId: string;
};

const GAP_PX = 16;
/** Igual que la animación anterior en globals.css (52s por ciclo completo). */
const MARQUEE_DURATION_MS = 52_000;
const DRAG_THRESHOLD_PX = 8;

export function DeepDiveCarousel({ slides }: { slides: DeepDiveSlide[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const offsetRef = useRef(0);
  const loopWidthRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isHoveringRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const didDragRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const cw = el.offsetWidth;
      if (cw <= 0) return;
      const w = Math.floor((cw - GAP_PX * 2) / 3);
      setSlideWidth(Math.max(100, w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || reduceMotion) return;
    const measure = () => {
      const sw = track.scrollWidth;
      if (sw > 0) loopWidthRef.current = sw / 2;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [slideWidth, slides.length, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || slideWidth <= 0) return;

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      const w = loopWidthRef.current;
      const track = trackRef.current;

      if (w > 0 && !isDraggingRef.current && !isHoveringRef.current) {
        offsetRef.current += (w / MARQUEE_DURATION_MS) * dt;
        offsetRef.current %= w;
      }

      if (track) {
        track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [reduceMotion, slideWidth]);

  const normalizeOffset = () => {
    const w = loopWidthRef.current;
    if (w <= 0) return;
    offsetRef.current = ((offsetRef.current % w) + w) % w;
  };

  /** Sin setPointerCapture: si no, el click del enlace no llega a la tarjeta. */
  const endDragListenersRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      endDragListenersRef.current?.();
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    if (e.button !== 0) return;
    endDragListenersRef.current?.();
    didDragRef.current = false;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;

    const onMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartXRef.current;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX) didDragRef.current = true;
      const w = loopWidthRef.current;
      if (w <= 0) return;
      let o = dragStartOffsetRef.current - dx;
      o = ((o % w) + w) % w;
      offsetRef.current = o;
      const track = trackRef.current;
      if (track) track.style.transform = `translate3d(${-o}px,0,0)`;
    };

    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endDragListenersRef.current = null;
      normalizeOffset();
      const track = trackRef.current;
      if (track) track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
    };

    endDragListenersRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endDragListenersRef.current = null;
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  if (slides.length === 0) return null;

  const loopSlides = reduceMotion ? slides : [...slides, ...slides];

  return (
    <div className="relative w-full">
      <div
        ref={viewportRef}
        className={`relative w-full rounded-2xl min-h-[120px] select-none ${
          reduceMotion
            ? 'overflow-x-auto overflow-y-hidden [scrollbar-width:thin] [scrollbar-color:rgba(245,197,24,0.35)_transparent]'
            : 'overflow-hidden touch-none cursor-grab active:cursor-grabbing [&:active]:cursor-grabbing'
        }`}
        aria-label="Carrusel de escenas del taller"
        onPointerDown={onPointerDown}
        onMouseEnter={() => {
          isHoveringRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveringRef.current = false;
        }}
      >
        <div
          ref={reduceMotion ? undefined : trackRef}
          className={`flex gap-4 transition-opacity duration-300 ${slideWidth > 0 ? 'opacity-100' : 'opacity-0'}`}
          style={{ width: 'max-content', willChange: reduceMotion ? undefined : 'transform' }}
        >
          {loopSlides.map((slide, i) => (
            <div
              key={`${slide.detalleId}-${slide.title}-${i}`}
              className="shrink-0"
              style={{
                width: slideWidth > 0 ? slideWidth : undefined,
                minWidth: slideWidth > 0 ? undefined : 'min(30vw, 280px)',
              }}
            >
              <Link
                href={`#detalle-${slide.detalleId}`}
                onClick={(ev) => {
                  if (didDragRef.current) ev.preventDefault();
                }}
                draggable={false}
                className="group relative block overflow-hidden rounded-xl border border-white/10 bg-[#0D1117] shadow-lg shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]"
              >
                <div className="relative aspect-video w-full">
                  <Image
                    src={slide.image}
                    alt={`${slide.title} — panel de taller y facturación Jconefix`}
                    fill
                    sizes="(max-width: 640px) 85vw, 280px"
                    priority={i < 3}
                    className="object-cover transition duration-700 group-hover:scale-[1.03] pointer-events-none"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050a12] via-[#050a12]/55 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[#F5C518]/10 pointer-events-none" />
                  <ImageFloatingGlyphs moduleId={slide.detalleId} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 space-y-1 pointer-events-none">
                  <p className="inline-flex rounded-full border border-[#F5C518]/35 bg-[#0D1117]/80 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#F5C518] backdrop-blur-sm">
                    {slide.subtitle}
                  </p>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">
                    {slide.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300/95 line-clamp-3 leading-relaxed hidden sm:block">
                    {slide.teaser}
                  </p>
                  <span className="inline-flex items-center gap-1 pt-0.5 text-[11px] sm:text-xs font-semibold text-[#F5C518]">
                    Ver ficha del módulo
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
