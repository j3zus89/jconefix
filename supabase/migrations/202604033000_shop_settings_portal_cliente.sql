-- Portal del cliente (Ajustes → Portal del cliente).

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_require_login boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_show_diagnostic_notes boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_allow_quote_approval boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_show_invoices boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shop_settings.portal_enabled IS 'Cliente puede usar el portal de seguimiento.';
COMMENT ON COLUMN public.shop_settings.portal_require_login IS 'Exige autenticación para ver tickets en el portal.';
