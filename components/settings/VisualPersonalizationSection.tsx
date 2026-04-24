'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { LayoutDashboard, Wrench, Palette, ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  applyVisualPreferencesToDocument,
  buildPreviewInlineStyle,
  DEFAULT_VISUAL_PREFERENCES,
  fileToBrandingLogoDataUrl,
  PANEL_DESIGN_OPTIONS,
  readPanelVisualPreferences,
  writePanelVisualPreferences,
  type PanelDesignId,
  type PanelThemeId,
  type VisualPreferencesState,
} from '@/lib/visual-preferences';
import { JcOneFixMark } from '@/components/jc-one-fix-mark';

const THEMES: { id: PanelThemeId; label: string; hint: string }[] = [
  { id: 'light', label: 'Claro', hint: 'Superficies claras, alto contraste de lectura' },
  { id: 'dark_deep', label: 'Oscuro profundo', hint: 'Grises neutros, ideal para entornos con poca luz' },
  { id: 'night_blue', label: 'Noche (azul marino)', hint: 'Fondo azul profundo, menos fatiga nocturna' },
];

export function VisualPersonalizationSection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VisualPreferencesState>(() => ({ ...DEFAULT_VISUAL_PREFERENCES }));
  const [logoInputKey, setLogoInputKey] = useState(0);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      const uid = user?.id ?? null;
      setUserId(uid);
      if (uid) setDraft(readPanelVisualPreferences(uid));
    });
  }, []);

  const previewStyle = useMemo(
    () => buildPreviewInlineStyle(draft.design, draft.theme, draft.primaryHex),
    [draft.design, draft.theme, draft.primaryHex]
  );

  const applySuggestedPrimary = (designId: PanelDesignId) => {
    const opt = PANEL_DESIGN_OPTIONS.find((o) => o.id === designId);
    if (opt) setDraft((d) => ({ ...d, primaryHex: opt.suggestedPrimary }));
  };

  /**
   * Aplica al panel al instante y guarda en el navegador (sin esperar a «Guardar»).
   * Sin userId no tocamos el documento: evita un flash del tema por defecto antes de cargar la sesión.
   */
  useEffect(() => {
    if (!userId) return;
    applyVisualPreferencesToDocument(draft);
    const persistTimer = window.setTimeout(() => writePanelVisualPreferences(userId, draft), 280);
    return () => window.clearTimeout(persistTimer);
  }, [draft, userId]);

  /** Al salir de la sección, persiste y aplica el estado coherente con localStorage (p. ej. color # completo). */
  useEffect(() => {
    return () => {
      if (userId) {
        writePanelVisualPreferences(userId, draftRef.current);
        applyVisualPreferencesToDocument(readPanelVisualPreferences(userId));
      }
    };
  }, [userId]);

  const handleSave = () => {
    if (!userId) {
      toast.error('Sesión no lista; recargá la página.');
      return;
    }
    writePanelVisualPreferences(userId, draft);
    applyVisualPreferencesToDocument(draft);
    toast.success('Personalización guardada en este navegador');
  };

  const handleReset = () => {
    if (!userId) {
      toast.error('Sesión no lista; recargá la página.');
      return;
    }
    const d = { ...DEFAULT_VISUAL_PREFERENCES };
    setDraft(d);
    writePanelVisualPreferences(userId, d);
    applyVisualPreferencesToDocument(d);
    setLogoInputKey((k) => k + 1);
    toast.message('Valores por defecto restaurados');
  };

  const onLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToBrandingLogoDataUrl(file);
      setDraft((prev) => ({ ...prev, brandingLogoDataUrl: dataUrl }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la imagen');
    }
  };

  const clearLogo = () => {
    setDraft((prev) => ({ ...prev, brandingLogoDataUrl: null }));
    setLogoInputKey((k) => k + 1);
  };

  const onFaviconPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToBrandingLogoDataUrl(file);
      setDraft((prev) => ({ ...prev, faviconUrl: dataUrl }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el favicon');
    }
  };

  const clearFavicon = () => {
    setDraft((prev) => ({ ...prev, faviconUrl: null }));
    setLogoInputKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Personalización visual</h2>
        <p className="mt-1 text-sm text-gray-600">
          Estilo visual, modo, color, tablas compactas y logo. Al elegir una opción el panel entero cambia al momento; se
          guarda en este navegador automáticamente. <strong className="font-semibold">Guardar</strong> solo confirma con un
          aviso.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(260px,320px)]">
        <div className="space-y-8">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Diseño del panel</h3>
            </div>
            <p className="mb-3 text-sm text-gray-600">
              Cada opción ajusta fondos, bordes y acentos para que combinen con <strong className="font-medium">Claro</strong>,{' '}
              <strong className="font-medium">Oscuro</strong> o <strong className="font-medium">Noche</strong>. Inspirado en
              las mismas líneas visuales que la web pública.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PANEL_DESIGN_OPTIONS.map((d) => (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDraft((prev) => ({ ...prev, design: d.id }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDraft((prev) => ({ ...prev, design: d.id }));
                    }
                  }}
                  className={cn(
                    'cursor-pointer rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    draft.design === d.id
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-gray-200 bg-gray-50/80 hover:border-gray-300'
                  )}
                >
                  <span className="font-medium text-gray-900">{d.label}</span>
                  <span className="mt-1 block text-xs text-gray-500 leading-snug">{d.hint}</span>
                  {draft.design === d.id && d.id !== 'classic' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        applySuggestedPrimary(d.id);
                      }}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      Usar color sugerido ({d.suggestedPrimary})
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Modo (claro / oscuro)</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, theme: t.id }))}
                  className={cn(
                    'rounded-lg border px-3 py-3 text-left text-sm transition-colors',
                    draft.theme === t.id
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-gray-200 bg-gray-50/80 hover:border-gray-300'
                  )}
                >
                  <span className="font-medium text-gray-900">{t.label}</span>
                  <span className="mt-1 block text-xs text-gray-500 leading-snug">{t.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">Color de identidad (primario)</h3>
            <p className="mb-3 text-sm text-gray-600">
              Se aplica a botones del sistema, barra superior, anillos de foco y barras de progreso.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={draft.primaryHex}
                  onChange={(e) => setDraft((d) => ({ ...d, primaryHex: e.target.value }))}
                  className="h-12 w-14 cursor-pointer rounded-md border border-gray-200 bg-white p-1"
                  aria-label="Elegir color primario"
                />
                <InputHex
                  value={draft.primaryHex}
                  onChange={(hex) => setDraft((d) => ({ ...d, primaryHex: hex }))}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Modo compacto en tablas</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Reduce el padding en la lista de tickets y en las tablas de clientes.
                </p>
              </div>
              <Switch
                checked={draft.compactTables}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, compactTables: v }))}
                className="no-ui-hover-grow"
              />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Logotipo de carga y login</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Imagen que verás al iniciar sesión y en la pantalla de carga del panel (máx. ~450 KB). Formatos: PNG, JPG,
              WebP.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                key={logoInputKey}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                onChange={(e) => void onLogoPick(e)}
              />
              {draft.brandingLogoDataUrl ? (
                <Button type="button" size="sm" className="bg-[#0f766e] text-white hover:bg-[#115e59]" onClick={clearLogo}>
                  Quitar logo
                </Button>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Icono de pestaña (favicon)</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Imagen que aparece en la pestaña del navegador. Debe ser cuadrada, preferiblemente 32×32 o 64×64 píxeles. 
              Formatos: PNG, ICO, SVG. Si no subes ninguno, no habrá icono.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                key={`favicon-${logoInputKey}`}
                type="file"
                accept="image/png,image/x-icon,image/svg+xml"
                className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                onChange={(e) => void onFaviconPick(e)}
              />
              {draft.faviconUrl ? (
                <div className="flex items-center gap-2">
                  <img src={draft.faviconUrl} alt="Favicon" className="h-8 w-8 rounded object-contain border" />
                  <Button type="button" size="sm" variant="outline" onClick={clearFavicon}>
                    Quitar
                  </Button>
                </div>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              💡 Consejo: Para que sea circular, usa una imagen PNG con fondo transparente o sube un SVG.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={handleSave}>
              Guardar personalización
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              Restaurar predeterminados
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Los cambios se aplican al panel al instante y se van guardando en este navegador.
          </p>
        </div>

        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Previsualización en vivo
          </Label>
          <div
            className="panel-preview-scope overflow-hidden rounded-xl border border-gray-200 shadow-md"
            data-panel-design={draft.design}
            data-panel-theme={draft.theme}
            style={previewStyle}
          >
            <div className="flex items-center gap-2 px-3 py-2 text-white bg-[var(--panel-header-bg)]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
                L
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">Mi Taller</div>
                <div className="text-[10px] text-white/60">Centro de Reparaciones</div>
              </div>
              <nav className="hidden gap-1 sm:flex">
                <span className="flex items-center gap-1 rounded bg-white/20 px-2 py-1 text-[10px] font-medium">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Inicio
                </span>
                <span className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-white/80">
                  <Wrench className="h-3.5 w-3.5" />
                  Reparaciones
                </span>
              </nav>
            </div>
            <div
              className="space-y-3 p-3"
              style={{
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
              }}
            >
              <div
                className="rounded-lg border p-3 shadow-sm"
                style={{
                  borderColor: 'hsl(var(--border))',
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                }}
              >
                <p className="text-xs font-medium text-muted-foreground">Progreso de ejemplo</p>
                <div className="mt-2">
                  <Progress value={62} className="h-2" />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="h-8 text-xs">
                    Acción primaria
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-[#0f766e] text-white hover:bg-[#115e59]">
                    Secundario
                  </Button>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Misma lógica que el panel real: diseño + modo + tu color primario.
              </p>
            </div>
            <div className="relative flex items-center justify-center overflow-hidden border-t border-white/15 bg-[var(--panel-footer-bg)] py-1.5">
              <div className="pointer-events-none absolute inset-0 bg-black/30" aria-hidden />
              <div className="relative z-[1] flex flex-wrap items-center justify-center gap-1.5 px-2">
                <span className="select-none text-[10px] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
                  {new Date().getFullYear()}
                </span>
                <JcOneFixMark
                  tone="onDark"
                  className="text-[10px] font-bold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                />
                <span className="select-none text-[10px] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
                  · Todos los derechos reservados.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputHex({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="primary-hex" className="sr-only">
        Código hexadecimal
      </Label>
      <input
        id="primary-hex"
        value={value}
        onChange={(e) => {
          let v = e.target.value.trim();
          if (!v.startsWith('#')) v = `#${v}`;
          if (/^#[0-9A-Fa-f]{0,6}$/.test(v) && v.length <= 7) onChange(v);
        }}
        onBlur={() => {
          if (!/^#[0-9A-Fa-f]{6}$/.test(value)) onChange('#F5C518');
        }}
        className="h-10 w-28 rounded-md border border-gray-200 bg-white px-2 font-mono text-sm"
        spellCheck={false}
      />
    </div>
  );
}
