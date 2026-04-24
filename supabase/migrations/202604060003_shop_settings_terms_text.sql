-- Añade columnas de términos y condiciones por jurisdicción a shop_settings.
-- terms_text_es → términos para España (IVA, garantía, LOPD…)
-- terms_text_ar → términos para Argentina (IVA, garantía, datos personales…)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_settings' AND column_name = 'terms_text_es'
  ) THEN
    ALTER TABLE shop_settings ADD COLUMN terms_text_es text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_settings' AND column_name = 'terms_text_ar'
  ) THEN
    ALTER TABLE shop_settings ADD COLUMN terms_text_ar text DEFAULT NULL;
  END IF;
END $$;
