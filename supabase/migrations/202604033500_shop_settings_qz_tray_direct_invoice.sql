-- Impresión directa de facturas vía QZ Tray (opcional; si falla se abre la vista en navegador).
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_direct_invoice_print boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shop_settings.qz_tray_direct_invoice_print IS
  'Si es true, tras crear una factura se intenta enviar el HTML a la impresora predeterminada vía QZ Tray.';
