-- SMTP y preferencias de notificación al cliente (Ajustes → Correo y WhatsApp).

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS smtp_host text NOT NULL DEFAULT '';

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS smtp_port integer NOT NULL DEFAULT 587;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS smtp_user text NOT NULL DEFAULT '';

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS smtp_password text NOT NULL DEFAULT '';

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS customer_notify_channels jsonb NOT NULL DEFAULT
    '{"ticket_created":{"email":true,"whatsapp":false},"status_change":{"email":true,"whatsapp":false},"ready_pickup":{"email":true,"whatsapp":false},"estimate_pending":{"email":true,"whatsapp":false},"invoice_issued":{"email":true,"whatsapp":false}}'::jsonb;

COMMENT ON COLUMN public.shop_settings.smtp_host IS 'Servidor saliente (panel); la contraseña vive en la fila del usuario — proteger con RLS.';
COMMENT ON COLUMN public.shop_settings.customer_notify_channels IS 'Por evento: { email, whatsapp }; usado por la UI de notificaciones automáticas.';
