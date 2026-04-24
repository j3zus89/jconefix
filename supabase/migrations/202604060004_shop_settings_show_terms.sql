-- Añade columna para controlar si se muestran los términos en la factura impresa.
-- Por defecto false: no aparecen. El usuario lo activa voluntariamente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_settings' AND column_name = 'invoice_show_terms'
  ) THEN
    ALTER TABLE shop_settings ADD COLUMN invoice_show_terms boolean DEFAULT false;
  END IF;
END $$;
