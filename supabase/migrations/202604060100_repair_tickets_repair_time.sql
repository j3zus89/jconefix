-- Tiempo de reparación (duración / cronómetro manual) en la ficha del ticket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repair_tickets' AND column_name = 'repair_time'
  ) THEN
    ALTER TABLE public.repair_tickets ADD COLUMN repair_time text DEFAULT '00:00:00';
  END IF;
END $$;

COMMENT ON COLUMN public.repair_tickets.repair_time IS 'Tiempo de reparación (HH:MM:SS), editable en el panel.';
