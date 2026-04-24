-- Modo de panel: simple (tienda pequeña) vs full (completo). Por usuario en shop_settings.

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS panel_ui_mode text DEFAULT 'full';

UPDATE public.shop_settings SET panel_ui_mode = 'full' WHERE panel_ui_mode IS NULL;

ALTER TABLE public.shop_settings
  ALTER COLUMN panel_ui_mode SET DEFAULT 'full';

ALTER TABLE public.shop_settings
  ALTER COLUMN panel_ui_mode SET NOT NULL;

ALTER TABLE public.shop_settings
  DROP CONSTRAINT IF EXISTS shop_settings_panel_ui_mode_check;

ALTER TABLE public.shop_settings
  ADD CONSTRAINT shop_settings_panel_ui_mode_check
  CHECK (panel_ui_mode IN ('full', 'simple'));

COMMENT ON COLUMN public.shop_settings.panel_ui_mode IS
  'full = menú e inicio completos; simple = panel reducido para tiendita.';
