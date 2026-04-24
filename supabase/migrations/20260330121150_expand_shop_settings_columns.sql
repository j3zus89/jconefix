/*
  # Expand shop_settings columns

  ## Overview
  Adds the extra columns needed for the full settings panel to the shop_settings table.
  All additions use IF NOT EXISTS pattern to be safe.

  ## Changes
  - Adds: alt_name, phone2, fax, city, postal_code, state, country, registration_number
  - Adds: tax_included, accounting_method, time_format, language, start_time, end_time
  - Adds: receive_emails, restocking_fee, deposit_repairs, screen_timeout, decimal_places, price_format
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'alt_name') THEN
    ALTER TABLE shop_settings ADD COLUMN alt_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'phone2') THEN
    ALTER TABLE shop_settings ADD COLUMN phone2 text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'fax') THEN
    ALTER TABLE shop_settings ADD COLUMN fax text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'city') THEN
    ALTER TABLE shop_settings ADD COLUMN city text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'postal_code') THEN
    ALTER TABLE shop_settings ADD COLUMN postal_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'state') THEN
    ALTER TABLE shop_settings ADD COLUMN state text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'country') THEN
    ALTER TABLE shop_settings ADD COLUMN country text DEFAULT 'Spain';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'registration_number') THEN
    ALTER TABLE shop_settings ADD COLUMN registration_number text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'tax_included') THEN
    ALTER TABLE shop_settings ADD COLUMN tax_included boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'accounting_method') THEN
    ALTER TABLE shop_settings ADD COLUMN accounting_method text DEFAULT 'accrual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'time_format') THEN
    ALTER TABLE shop_settings ADD COLUMN time_format text DEFAULT '24';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'language') THEN
    ALTER TABLE shop_settings ADD COLUMN language text DEFAULT 'Spanish';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'start_time') THEN
    ALTER TABLE shop_settings ADD COLUMN start_time text DEFAULT '10:00:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'end_time') THEN
    ALTER TABLE shop_settings ADD COLUMN end_time text DEFAULT '20:00:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'receive_emails') THEN
    ALTER TABLE shop_settings ADD COLUMN receive_emails boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'restocking_fee') THEN
    ALTER TABLE shop_settings ADD COLUMN restocking_fee boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'deposit_repairs') THEN
    ALTER TABLE shop_settings ADD COLUMN deposit_repairs boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'screen_timeout') THEN
    ALTER TABLE shop_settings ADD COLUMN screen_timeout text DEFAULT 'Never';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'decimal_places') THEN
    ALTER TABLE shop_settings ADD COLUMN decimal_places text DEFAULT '2';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'price_format') THEN
    ALTER TABLE shop_settings ADD COLUMN price_format text DEFAULT 'Decimal';
  END IF;
END $$;
