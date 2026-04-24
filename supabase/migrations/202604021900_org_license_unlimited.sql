-- Cuentas internas (fundadores, socios): sin bloqueo por fecha de licencia ni fin de trial en middleware.
-- El SUPER_ADMIN activa esto desde el detalle de organización → Licencia.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS license_unlimited boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN organizations.license_unlimited IS
  'Si true: no aplica caducidad de licencia ni trial para acceso al dashboard (sigue respetándose suspended/cancelled).';

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
  o.license_unlimited,
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
    WHEN o.subscription_status IN ('suspended', 'cancelled') THEN o.subscription_status
    WHEN COALESCE(o.license_unlimited, false) IS TRUE THEN 'active'
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
