-- Tamaño de pantalla opcional para Smart TV (texto libre: "55", "55 pulgadas", etc.).

ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS device_screen_inches text;

COMMENT ON COLUMN public.repair_tickets.device_screen_inches IS
  'Diagonal de pantalla en Smart TV; opcional; texto libre (pulgadas).';
