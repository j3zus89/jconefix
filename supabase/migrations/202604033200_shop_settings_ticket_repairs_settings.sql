-- Tickets y reparaciones (panel): interfaz, reglas, cronómetro, listados, plantilla de etiqueta.

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS ticket_repairs_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.shop_settings.ticket_repairs_settings IS
  'JSON: toggles de tickets/reparaciones, ids de estados para cronómetro, defaults de listado, plantilla de etiqueta. Ver lib/ticket-repairs-settings.ts';
