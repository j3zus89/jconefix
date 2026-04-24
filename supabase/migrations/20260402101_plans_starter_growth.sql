-- Ampliar planes comerciales: starter y growth (manteniendo valores legacy en filas existentes).

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

-- Compatible con bases donde 02102 ya existió o hay slugs/planes en español: el CHECK siguiente
-- no incluye basico|profesional; mapamos al equivalente starter|growth antes de añadirlo.
UPDATE organizations
SET subscription_plan = 'starter'
WHERE subscription_plan = 'basico';

UPDATE organizations
SET subscription_plan = 'growth'
WHERE subscription_plan = 'profesional';

UPDATE organizations
SET subscription_plan = 'starter'
WHERE subscription_plan IS NOT NULL
  AND subscription_plan NOT IN ('free', 'basic', 'pro', 'enterprise', 'starter', 'growth');

ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_plan_check
  CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise', 'starter', 'growth'));

COMMENT ON COLUMN organizations.subscription_plan IS 'Plan comercial: starter | growth (recomendado); free/basic/pro/enterprise = legacy';
