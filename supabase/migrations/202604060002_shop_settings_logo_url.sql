-- Añade la columna logo_url a shop_settings para almacenar
-- la URL pública del logo del taller (cargado a Supabase Storage).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_settings' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE shop_settings ADD COLUMN logo_url text DEFAULT NULL;
  END IF;
END $$;
