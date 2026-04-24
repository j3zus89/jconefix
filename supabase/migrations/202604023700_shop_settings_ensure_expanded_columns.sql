-- Columnas que el panel de configuración envía en upsert y que faltan si no corrió
-- 20260330121150_expand_shop_settings_columns.sql (evita error schema cache / guardado perfil).

ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS alt_name text DEFAULT '';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS phone2 text DEFAULT '';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS fax text DEFAULT '';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS postal_code text DEFAULT '';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS state text DEFAULT '';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS country text DEFAULT 'Spain';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS registration_number text DEFAULT '';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS tax_included boolean DEFAULT true;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS accounting_method text DEFAULT 'accrual';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS time_format text DEFAULT '24';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS language text DEFAULT 'Spanish';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS start_time text DEFAULT '10:00:00';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS end_time text DEFAULT '20:00:00';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS receive_emails boolean DEFAULT true;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS restocking_fee boolean DEFAULT false;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS deposit_repairs boolean DEFAULT false;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS screen_timeout text DEFAULT 'Never';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS decimal_places text DEFAULT '2';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS price_format text DEFAULT 'Decimal';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Madrid';
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS iva_condition text DEFAULT NULL;
