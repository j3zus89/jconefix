-- Configuración Bandeja QZ (puerto, WSS, certificado público PEM opcional).

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_port integer NOT NULL DEFAULT 8182;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_using_secure boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_certificate_pem text DEFAULT NULL;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_certificate_label text DEFAULT NULL;

COMMENT ON COLUMN public.shop_settings.qz_tray_port IS 'Puerto WebSocket de QZ Tray (8182 ws habitual, 8181 wss en HTTPS).';
COMMENT ON COLUMN public.shop_settings.qz_tray_using_secure IS 'true = wss://, false = ws://';
COMMENT ON COLUMN public.shop_settings.qz_tray_certificate_pem IS 'Certificado público del sitio (PEM) para confianza con QZ Tray; la firma de peticiones requiere backend aparte.';
