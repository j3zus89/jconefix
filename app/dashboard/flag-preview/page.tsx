'use client';

import './flag-effects.css';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { MiniFlagSvg } from '@/components/dashboard/MiniFlagSvg';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EFFECTS = [
  {
    id: 1,
    className: 'flag-preview-fx-1',
    title: 'Ondea 3D (actual del panel)',
    desc: 'Perspectiva + rotateY + skewY en 8 pasos; mismo espíritu que el header hoy.',
  },
  {
    id: 2,
    className: 'flag-preview-fx-2',
    title: 'Vaivén suave',
    desc: 'Péndulo en Z, origen abajo-izquierda; movimiento calmado.',
  },
  {
    id: 3,
    className: 'flag-preview-fx-3',
    title: 'Aleteo rápido',
    desc: 'Oscilación corta en Y; sensación de flameo rápido.',
  },
  {
    id: 4,
    className: 'flag-preview-fx-4',
    title: 'Tela al viento',
    desc: 'Skew alternado; parece tela que se tuerce con el aire.',
  },
  {
    id: 5,
    className: 'flag-preview-fx-5',
    title: 'Oleaje vertical',
    desc: 'Sube y baja con ligera torsión; ola suave.',
  },
  {
    id: 6,
    className: 'flag-preview-fx-6',
    title: 'Balanceo amplio',
    desc: 'Giro Z amplio desde el mástil; ritmo pausado.',
  },
  {
    id: 7,
    className: 'flag-preview-fx-7',
    title: 'Respiración',
    desc: 'Escala en X (se “ensancha” y afina); casi sin giro.',
  },
  {
    id: 8,
    className: 'flag-preview-fx-8',
    title: 'Ráfaga horizontal',
    desc: 'Empuje izquierda-derecha con giros cortos.',
  },
  {
    id: 9,
    className: 'flag-preview-fx-9',
    title: 'Twist serpenteante',
    desc: 'Y + skew en bucle rápido; movimiento más nervioso.',
  },
  {
    id: 10,
    className: 'flag-preview-fx-10',
    title: 'Onda lenta y amplia',
    desc: 'Grandes ángulos en Y, ciclo largo; muy visible.',
  },
] as const;

function FlagDemo({
  effectClass,
  country,
  large,
}: {
  effectClass: string;
  country: 'AR' | 'ES';
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-slate-900 ring-1 ring-white/10',
        large ? 'h-28 px-6' : 'h-20 px-4'
      )}
    >
      <span
        className={cn(
          'flag-preview-fx-base inline-block overflow-hidden rounded-[3px] ring-1 ring-white/40 shadow-lg',
          effectClass
        )}
      >
        <MiniFlagSvg
          country={country}
          className={large ? 'h-10 w-[4.5rem] sm:h-11 sm:w-[5rem]' : 'h-6 w-10 sm:h-7 sm:w-11'}
        />
      </span>
    </div>
  );
}

export default function FlagPreviewPage() {
  const [chosen, setChosen] = useState<number>(1);

  const chosenMeta = EFFECTS.find((e) => e.id === chosen) ?? EFFECTS[0];

  const copyClass = useCallback(() => {
    const text = `${chosenMeta.className} flag-preview-fx-base`;
    void navigator.clipboard.writeText(text);
    toast.success('Clases copiadas al portapapeles');
  }, [chosenMeta.className]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#0d9488] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Efectos de bandera</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-600">
            Compara 10 animaciones (Argentina y España). Pulsa <strong>Elegir</strong> en la que te guste;
            luego copia las clases o indica el <strong>número</strong> para aplicarlo en el panel.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">Seleccionado: efecto {chosen}</p>
          <p className="mt-0.5 text-emerald-900/90">{chosenMeta.title}</p>
          <p className="mt-1 font-mono text-xs text-emerald-800">
            {chosenMeta.className}{' '}
            <span className="text-emerald-700">flag-preview-fx-base</span>
          </p>
          <Button type="button" size="sm" variant="outline" className="mt-2 gap-1.5" onClick={copyClass}>
            <Copy className="h-3.5 w-3.5" />
            Copiar clases
          </Button>
        </div>
      </div>

      {/* Simulación fondo oscuro (como el header del panel) */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Vista en header oscuro (como el panel)
        </h2>
        <div className="rounded-xl border border-black/20 bg-[var(--panel-header-bg,#1e293b)] px-4 py-4">
          <div className="flex flex-wrap items-center gap-6">
            {(['AR', 'ES'] as const).map((c) => (
              <div key={c} className="flex items-center gap-3">
                <span className="text-xs font-medium text-white/70">{c === 'AR' ? '🇦🇷 AR' : '🇪🇸 ES'}</span>
                <span
                  className={cn(
                    'flag-preview-fx-base inline-block overflow-hidden rounded-[2px] ring-1 ring-white/35 shadow-md',
                    chosenMeta.className
                  )}
                >
                  <MiniFlagSvg country={c} className="h-[13px] w-[22px]" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {EFFECTS.map((fx) => {
          const isChosen = chosen === fx.id;
          return (
            <article
              key={fx.id}
              className={cn(
                'rounded-xl border bg-white p-4 shadow-sm transition-shadow',
                isChosen ? 'border-[#0d9488] ring-2 ring-[#0d9488]/25' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    <span className="text-[#0d9488]">{fx.id}.</span> {fx.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-600">{fx.desc}</p>
                  <code className="mt-2 block text-[10px] text-gray-500">{fx.className}</code>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isChosen ? 'default' : 'secondary'}
                  className={cn('shrink-0', isChosen && 'bg-[#0d9488] hover:bg-[#0f766e]')}
                  onClick={() => setChosen(fx.id)}
                >
                  {isChosen ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Elegido
                    </>
                  ) : (
                    'Elegir'
                  )}
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <FlagDemo effectClass={fx.className} country="AR" />
                <FlagDemo effectClass={fx.className} country="ES" />
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900">Vista grande del efecto elegido</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FlagDemo effectClass={chosenMeta.className} country="AR" large />
          <FlagDemo effectClass={chosenMeta.className} country="ES" large />
        </div>
      </section>
    </div>
  );
}
