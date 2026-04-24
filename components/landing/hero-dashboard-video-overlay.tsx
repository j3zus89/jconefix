'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  getHeroVideoPublicUrl,
  parseVimeoVideoId,
  vimeoPlayerEmbedUrl,
} from '@/lib/hero-video-public-url';

type Props = {
  children: React.ReactNode;
  /** Si no se pasa, usa NEXT_PUBLIC_HERO_VIDEO_URL o /jconefix.mp4 (solo local). */
  videoSrc?: string;
};

/**
 * Botón play centrado sobre el mockup del dashboard (hero) sin alterar el flujo del layout.
 */
export function HeroDashboardVideoOverlay({ children, videoSrc = getHeroVideoPublicUrl() }: Props) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const vimeoId = parseVimeoVideoId(videoSrc);

  useEffect(() => {
    if (!open || vimeoId) {
      videoRef.current?.pause();
      return;
    }
    const t = window.setTimeout(() => {
      void videoRef.current?.play().catch(() => {});
    }, 120);
    return () => window.clearTimeout(t);
  }, [open, vimeoId]);

  return (
    <>
      <div className="relative">
        {children}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl">
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'pointer-events-auto relative z-10 flex h-14 w-14 shrink-0 sm:h-16 sm:w-16 items-center justify-center rounded-full transform-gpu',
              'bg-[#F5C518] text-[#0D1117] shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-4 ring-white/25',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
            )}
            aria-label="Reproducir video de JC ONE FIX"
            animate={
              reduceMotion
                ? undefined
                : {
                    scale: [1, 1.07, 1],
                    boxShadow: [
                      '0 8px 32px rgba(0,0,0,0.35)',
                      '0 10px 36px rgba(0,0,0,0.4), 0 0 0 8px rgba(245,197,24,0.2)',
                      '0 8px 32px rgba(0,0,0,0.35)',
                    ],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
            }
            whileHover={reduceMotion ? undefined : { scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
          >
            <motion.span
              className="inline-flex"
              aria-hidden
              animate={reduceMotion ? undefined : { x: [0, 1.5, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <Play className="ml-0.5 h-7 w-7 shrink-0 sm:h-8 sm:w-8" strokeWidth={2.5} />
            </motion.span>
          </motion.button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl border-slate-800 bg-black p-2 sm:p-3 hover:!scale-100">
          <DialogTitle className="sr-only">Video JC ONE FIX</DialogTitle>
          {open && vimeoId ? (
            <iframe
              title="JC ONE FIX — video"
              src={vimeoPlayerEmbedUrl(vimeoId)}
              className="aspect-video w-full max-h-[min(80vh,720px)] min-h-[12rem] rounded-lg bg-black"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : open ? (
            <video
              ref={videoRef}
              className="w-full max-h-[min(80vh,720px)] rounded-lg bg-black"
              controls
              playsInline
              preload="auto"
              autoPlay
              src={videoSrc}
            >
              Tu navegador no reproduce video HTML5.
            </video>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
