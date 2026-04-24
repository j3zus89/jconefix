-- Región (AR / ES), tipo de reparación y origen del registro para tarifarios 2026.
-- Precios en moneda local del país (ARS o EUR); no implica conversión cruzada.

ALTER TABLE public.repair_labor_services
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'ES';

ALTER TABLE public.repair_labor_services
  DROP CONSTRAINT IF EXISTS repair_labor_services_country_code_check;

ALTER TABLE public.repair_labor_services
  ADD CONSTRAINT repair_labor_services_country_code_check
  CHECK (country_code IN ('AR', 'ES'));

ALTER TABLE public.repair_labor_services
  ADD COLUMN IF NOT EXISTS repair_type_code TEXT NOT NULL DEFAULT '';

ALTER TABLE public.repair_labor_services
  ADD COLUMN IF NOT EXISTS pricing_year SMALLINT;

ALTER TABLE public.repair_labor_services
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.repair_labor_services
  DROP CONSTRAINT IF EXISTS repair_labor_services_source_check;

ALTER TABLE public.repair_labor_services
  ADD CONSTRAINT repair_labor_services_source_check
  CHECK (source IN ('manual', 'catalog_seed'));

COMMENT ON COLUMN public.repair_labor_services.country_code IS
  'AR = precios en pesos argentinos; ES = precios en euros (España). Tarifas de referencia 2026 por mercado local.';
COMMENT ON COLUMN public.repair_labor_services.repair_type_code IS
  'Clave estable del tipo de reparación (p. ej. mobile_screen) para informes e importaciones.';
COMMENT ON COLUMN public.repair_labor_services.pricing_year IS
  'Año de referencia del precio (p. ej. 2026 para tarifario importado).';
COMMENT ON COLUMN public.repair_labor_services.source IS
  'manual = creado a mano; catalog_seed = generado desde el catálogo de referencia del panel.';

CREATE INDEX IF NOT EXISTS idx_repair_labor_services_org_country
  ON public.repair_labor_services (organization_id, country_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_repair_labor_services_user_country
  ON public.repair_labor_services (user_id, country_code, created_at DESC)
  WHERE organization_id IS NULL;
