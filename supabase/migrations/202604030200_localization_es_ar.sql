-- Localización España / Argentina
-- Añade country y currency a organizations (sin romper filas existentes que quedan como ES/EUR).
-- Añade iva_condition a shop_settings para soporte a regímenes impositivos de Argentina.

-- ─── organizations ────────────────────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS country  text NOT NULL DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';

-- Registros existentes → España / Euro (regla de oro: no se toca JC ONE FIX)
UPDATE public.organizations
  SET country = 'ES', currency = 'EUR'
  WHERE country NOT IN ('ES', 'AR');

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_country_check,
  DROP CONSTRAINT IF EXISTS organizations_currency_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_country_check  CHECK (country  IN ('ES', 'AR')),
  ADD CONSTRAINT organizations_currency_check CHECK (currency IN ('EUR', 'ARS'));

COMMENT ON COLUMN public.organizations.country  IS 'Código de país de operación: ES (España) | AR (Argentina)';
COMMENT ON COLUMN public.organizations.currency IS 'Moneda principal: EUR (€) | ARS ($)';

-- ─── shop_settings ────────────────────────────────────────────────────────────
-- Campo para condición frente al IVA en Argentina (AFIP/ARCA). NULL = no aplica (ES).
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS iva_condition text DEFAULT NULL;

COMMENT ON COLUMN public.shop_settings.iva_condition
  IS 'AR: condición frente al IVA (Monotributo, Responsable Inscripto, Exento, No Responsable, Consumidor Final). NULL fuera de AR.';

-- ─── Vista admin actualizada ──────────────────────────────────────────────────
DROP VIEW IF EXISTS public.admin_organization_stats;
CREATE VIEW public.admin_organization_stats AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.country,
  o.currency,
  o.subscription_status,
  o.subscription_plan,
  o.plan_type,
  o.billing_cycle,
  o.license_expires_at,
  o.license_unlimited,
  o.created_at,
  o.trial_ends_at,
  o.max_users,
  o.max_tickets,
  u.email AS owner_email,
  (SELECT COUNT(*) FROM public.organization_members om WHERE om.organization_id = o.id AND om.is_active = true) AS active_users,
  (SELECT COUNT(*) FROM public.repair_tickets rt WHERE rt.organization_id = o.id) AS total_tickets,
  (SELECT COUNT(*) FROM public.repair_tickets rt WHERE rt.organization_id = o.id AND rt.status = 'pending') AS pending_tickets,
  (SELECT COUNT(*) FROM public.repair_tickets rt WHERE rt.organization_id = o.id AND rt.status = 'completed') AS completed_tickets,
  (SELECT COUNT(*) FROM public.customers c WHERE c.organization_id = o.id) AS total_customers,
  (SELECT COUNT(*) FROM public.inventory_items ii WHERE ii.organization_id = o.id) AS total_inventory_items,
  (SELECT MAX(rt.created_at) FROM public.repair_tickets rt WHERE rt.organization_id = o.id) AS last_ticket_date,
  CASE
    WHEN o.subscription_status IN ('suspended', 'cancelled') THEN o.subscription_status
    WHEN COALESCE(o.license_unlimited, false) IS TRUE THEN 'active'
    WHEN o.license_expires_at IS NOT NULL AND o.license_expires_at < now()
      AND o.subscription_status IN ('active', 'trial') THEN 'license_expired'
    WHEN o.subscription_status = 'trial' AND o.trial_ends_at IS NOT NULL AND o.trial_ends_at < now() THEN 'expired'
    WHEN o.subscription_status = 'trial' THEN 'trial'
    ELSE o.subscription_status
  END AS effective_status
FROM public.organizations o
LEFT JOIN auth.users u ON u.id = o.owner_id
ORDER BY o.created_at DESC;

GRANT SELECT ON public.admin_organization_stats TO authenticated;
ALTER VIEW public.admin_organization_stats SET (security_barrier = true);
