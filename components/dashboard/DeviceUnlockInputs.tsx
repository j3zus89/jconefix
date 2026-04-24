'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Color de acento del panel (Personalización visual). */
const PRIMARY_COLOR = 'hsl(var(--primary))';
const VB = 300;
const DOTS: { id: number; cx: number; cy: number }[] = [
  { id: 1, cx: 50, cy: 50 },
  { id: 2, cx: 150, cy: 50 },
  { id: 3, cx: 250, cy: 50 },
  { id: 4, cx: 50, cy: 150 },
  { id: 5, cx: 150, cy: 150 },
  { id: 6, cx: 250, cy: 150 },
  { id: 7, cx: 50, cy: 250 },
  { id: 8, cx: 150, cy: 250 },
  { id: 9, cx: 250, cy: 250 },
];

/** Android-style: saltar solo si el del medio no está ya en el camino. */
function intermediateBetween(from: number, to: number): number | null {
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  const m: Record<string, number> = {
    '1,3': 2,
    '1,7': 4,
    '1,9': 5,
    '2,8': 5,
    '3,7': 5,
    '3,9': 6,
    '4,6': 5,
    '7,9': 8,
  };
  return m[`${a},${b}`] ?? null;
}

function extendPath(path: number[], next: number): number[] {
  if (path.includes(next)) return path;
  if (path.length === 0) return [next];
  const last = path[path.length - 1];
  const mid = intermediateBetween(last, next);
  if (mid != null && !path.includes(mid)) {
    return [...path, mid, next];
  }
  return [...path, next];
}

export function isGridPatternString(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  return /^[1-9](-[1-9])*$/.test(t);
}

function parseGridPattern(s: string): number[] {
  if (!s.trim()) return [];
  return s
    .trim()
    .split('-')
    .map((x) => parseInt(x, 10))
    .filter((n) => n >= 1 && n <= 9);
}

type PatternLockGridProps = {
  value: string;
  onChange: (sequence: string) => void;
  className?: string;
};

function PatternLockGrid({ value, onChange, className }: PatternLockGridProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const captureIdRef = useRef<number | null>(null);
  const [dragPath, setDragPath] = useState<number[] | null>(null);
  const [pointerTail, setPointerTail] = useState<{ x: number; y: number } | null>(null);

  const committed = useMemo(() => parseGridPattern(value), [value]);
  const displayPath = dragPath ?? committed;

  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * VB;
    const y = ((clientY - r.top) / r.height) * VB;
    return { x, y };
  }, []);

  const hitDot = useCallback((x: number, y: number): number | null => {
    const threshold = 38;
    for (const d of DOTS) {
      const dx = x - d.cx;
      const dy = y - d.cy;
      if (dx * dx + dy * dy <= threshold * threshold) return d.id;
    }
    return null;
  }, []);

  const lines = useMemo(() => {
    const pts = displayPath.map((id) => DOTS.find((d) => d.id === id)).filter(Boolean) as {
      id: number;
      cx: number;
      cy: number;
    }[];
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 1; i < pts.length; i++) {
      segs.push({
        x1: pts[i - 1].cx,
        y1: pts[i - 1].cy,
        x2: pts[i].cx,
        y2: pts[i].cy,
      });
    }
    if (dragPath && dragPath.length && pointerTail) {
      const last = DOTS.find((d) => d.id === dragPath[dragPath.length - 1]);
      if (last) {
        segs.push({
          x1: last.cx,
          y1: last.cy,
          x2: pointerTail.x,
          y2: pointerTail.y,
        });
      }
    }
    return segs;
  }, [displayPath, dragPath, pointerTail]);

  useEffect(() => {
    const releaseCapture = () => {
      const id = captureIdRef.current;
      const svg = svgRef.current;
      if (id != null && svg?.releasePointerCapture) {
        try {
          if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
        } catch {
          /* ignore */
        }
      }
      captureIdRef.current = null;
    };

    const end = () => {
      releaseCapture();
      setDragPath((cur) => {
        if (cur && cur.length > 0) {
          onChange(cur.join('-'));
        }
        return null;
      });
      setPointerTail(null);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const p = toSvgPoint(e.clientX, e.clientY);
    if (!p) return;
    const id = hitDot(p.x, p.y);
    if (id == null) return;
    captureIdRef.current = e.pointerId;
    svgRef.current?.setPointerCapture(e.pointerId);
    setDragPath([id]);
    setPointerTail(p);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragPath == null) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    if (!p) return;
    setPointerTail(p);
    const id = hitDot(p.x, p.y);
    if (id != null && id !== dragPath[dragPath.length - 1]) {
      setDragPath((prev) => (prev ? extendPath(prev, id) : prev));
    }
  };

  return (
    <div className={cn('select-none touch-none', className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB} ${VB}`}
        className="w-full max-w-[280px] mx-auto aspect-square touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        style={{ touchAction: 'none' }}
      >
        {lines.map((ln, i) => (
          <line
            key={i}
            x1={ln.x1}
            y1={ln.y1}
            x2={ln.x2}
            y2={ln.y2}
            stroke={PRIMARY_COLOR}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {DOTS.map((d) => {
          const idx = displayPath.indexOf(d.id);
          const active = idx >= 0;
          return (
            <g key={d.id}>
              <circle
                cx={d.cx}
                cy={d.cy}
                r={active ? 24 : 14}
                fill={active ? PRIMARY_COLOR : '#111827'}
                stroke={active ? PRIMARY_COLOR : 'transparent'}
                strokeWidth={active ? 3 : 0}
              />
              {active && <circle cx={d.cx} cy={d.cy} r={9} fill="#fff" />}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-center mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-gray-500 h-8"
          onClick={() => onChange('')}
        >
          Borrar patrón
        </Button>
      </div>
    </div>
  );
}

export type DeviceUnlockInputsProps = {
  pin: string;
  pattern: string;
  onPinChange: (v: string) => void;
  onPatternChange: (v: string) => void;
  className?: string;
  labelClassName?: string;
  /** Texto del encabezado sobre el segmento PIN / Patrón (p. ej. «Tipo de bloqueo»). */
  sectionLabel?: string;
};

export function DeviceUnlockInputs({
  pin,
  pattern,
  onPinChange,
  onPatternChange,
  className,
  labelClassName,
  sectionLabel = 'Acceso al dispositivo',
}: DeviceUnlockInputsProps) {
  const [mode, setMode] = useState<'pin' | 'pattern'>(() =>
    pattern.trim() ? 'pattern' : 'pin'
  );
  const [patternEntryMode, setPatternEntryMode] = useState<'grid' | 'text'>(() =>
    pattern.trim() && !isGridPatternString(pattern) ? 'text' : 'grid'
  );

  useEffect(() => {
    if (pattern.trim() && isGridPatternString(pattern)) {
      setMode('pattern');
      setPatternEntryMode('grid');
    } else if (pattern.trim() && !isGridPatternString(pattern)) {
      setMode('pattern');
      setPatternEntryMode('text');
    }
  }, [pattern]);

  const useTextFallback = patternEntryMode === 'text';

  return (
    <div className={cn('space-y-2', className)}>
      <Label className={cn('text-xs font-medium text-gray-600', labelClassName)}>
        {sectionLabel}
      </Label>
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex rounded-md bg-gray-100 p-0.5 mb-3">
          <button
            type="button"
            onClick={() => setMode('pin')}
            className={cn(
              'flex-1 rounded py-2 text-xs font-medium transition-colors',
              mode === 'pin' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'
            )}
          >
            Código de acceso
          </button>
          <button
            type="button"
            onClick={() => setMode('pattern')}
            className={cn(
              'flex-1 rounded py-2 text-xs font-medium transition-colors',
              mode === 'pattern' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'
            )}
          >
            Patrón
          </button>
        </div>

        {mode === 'pin' ? (
          <div className="max-w-[11rem]">
            <Input
              className="h-9 w-full font-mono tracking-wider"
              placeholder="Ej. 1234"
              value={pin}
              onChange={(e) => onPinChange(e.target.value)}
              autoComplete="off"
              inputMode="numeric"
            />
          </div>
        ) : useTextFallback ? (
          <div className="space-y-2">
            <Textarea
              className="min-h-[72px] text-sm"
              placeholder="Describe el patrón o cómo desbloquearlo…"
              value={pattern}
              onChange={(e) => onPatternChange(e.target.value)}
            />
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setPatternEntryMode('grid');
                onPatternChange('');
              }}
            >
              Dibujar en la cuadrícula
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <PatternLockGrid value={pattern} onChange={onPatternChange} />
            <button
              type="button"
              className="w-full text-center text-xs text-gray-500 hover:text-primary hover:underline"
              onClick={() => setPatternEntryMode('text')}
            >
              Prefiero describirlo por texto
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">
        {mode === 'pin'
          ? 'PIN o código numérico del dispositivo.'
          : 'Dibuja el patrón en la cuadrícula (como en Android) o usa texto si es más fácil.'}
      </p>
    </div>
  );
}
