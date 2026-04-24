-- Planes en español: básico / profesional, ciclo mensual o anual, caducidad de licencia.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_type text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_cycle text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS license_expires_at timestamptz;

-- Heredar plan desde valores anteriores
UPDATE organizations SET plan_type = 'profesional'
WHERE subscription_plan IN ('growth', 'pro', 'enterprise', 'profesional');

UPDATE organizations SET plan_type = 'basico'
WHERE plan_type IS NULL
   OR subscription_plan IN ('starter', 'free', 'basic', 'basico');

UPDATE organizations SET billing_cycle = 'mensual' WHERE billing_cycle IS NULL;

UPDATE organizations SET license_expires_at = trial_ends_at
WHERE license_expires_at IS NULL AND trial_ends_at IS NOT NULL;

UPDATE organizations SET license_expires_at = now() + interval '30 days'
WHERE license_expires_at IS NULL;

-- Quitar el CHECK en inglés (02101) antes de asignar basico|profesional a subscription_plan
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

UPDATE organizations SET subscription_plan = plan_type;

ALTER TABLE organizations ALTER COLUMN plan_type SET DEFAULT 'basico';
UPDATE organizations SET plan_type = 'basico' WHERE plan_type IS NULL;
ALTER TABLE organizations ALTER COLUMN plan_type SET NOT NULL;

ALTER TABLE organizations ALTER COLUMN billing_cycle SET DEFAULT 'mensual';
UPDATE organizations SET billing_cycle = 'mensual' WHERE billing_cycle IS NULL;
ALTER TABLE organizations ALTER COLUMN billing_cycle SET NOT NULL;

ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_plan_check
  CHECK (subscription_plan IN ('basico', 'profesional'));

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_type_check
  CHECK (plan_type IN ('basico', 'profesional'));

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_billing_cycle_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_billing_cycle_check
  CHECK (billing_cycle IN ('mensual', 'anual'));

COMMENT ON COLUMN organizations.plan_type IS 'Plan comercial: basico | profesional';
COMMENT ON COLUMN organizations.billing_cycle IS 'Facturación: mensual | anual (afecta renovación de license_expires_at)';
COMMENT ON COLUMN organizations.license_expires_at IS 'Fin del periodo de licencia pagada; tras esta fecha el acceso puede bloquearse';

-- Vista admin: columnas nuevas + estado considerando licencia
DROP VIEW IF EXISTS admin_organization_stats;
CREATE VIEW admin_organization_stats AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.subscription_status,
  o.subscription_plan,
  o.plan_type,
  o.billing_cycle,
  o.license_expires_at,
  o.created_at,
  o.trial_ends_at,
  o.max_users,
  o.max_tickets,
  u.email AS owner_email,
  (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id AND om.is_active = true) AS active_users,
  (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.organization_id = o.id) AS total_tickets,
  (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.organization_id = o.id AND rt.status = 'pending') AS pending_tickets,
  (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.organization_id = o.id AND rt.status = 'completed') AS completed_tickets,
  (SELECT COUNT(*) FROM customers c WHERE c.organization_id = o.id) AS total_customers,
  (SELECT COUNT(*) FROM inventory_items ii WHERE ii.organization_id = o.id) AS total_inventory_items,
  (SELECT MAX(rt.created_at) FROM repair_tickets rt WHERE rt.organization_id = o.id) AS last_ticket_date,
  CASE
    WHEN o.license_expires_at IS NOT NULL AND o.license_expires_at < now()
      AND o.subscription_status IN ('active', 'trial') THEN 'license_expired'
    WHEN o.subscription_status = 'trial' AND o.trial_ends_at IS NOT NULL AND o.trial_ends_at < now() THEN 'expired'
    WHEN o.subscription_status = 'trial' THEN 'trial'
    ELSE o.subscription_status
  END AS effective_status
FROM organizations o
LEFT JOIN auth.users u ON u.id = o.owner_id
ORDER BY o.created_at DESC;

GRANT SELECT ON admin_organization_stats TO authenticated;
ALTER VIEW admin_organization_stats SET (security_barrier = true);

-- Solicitudes comerciales desde la web (lead, sin pago online)
CREATE TABLE IF NOT EXISTS commercial_signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  shop_name text NOT NULL,
  plan_interest text NOT NULL CHECK (plan_interest IN ('basico', 'profesional')),
  billing_interest text NOT NULL CHECK (billing_interest IN ('mensual', 'anual')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE commercial_signup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access commercial_signup_requests" ON commercial_signup_requests;
CREATE POLICY "Service role full access commercial_signup_requests"
  ON commercial_signup_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE commercial_signup_requests IS 'Leads desde la landing: interesados en Plan Básico/Profesional; el SUPER_ADMIN cobra y da de alta manualmente';
