-- Vista admin: incluir settings (cuota polish_ai_monthly_limit) y deleted_at para filtrar soft-delete.

DROP VIEW IF EXISTS public.admin_organization_stats;

CREATE VIEW public.admin_organization_stats
WITH (security_invoker = true, security_barrier = true) AS
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
  o.settings,
  o.deleted_at,
  public.admin_organization_stats_owner_email(o.owner_id) AS owner_email,
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
ORDER BY o.created_at DESC;

COMMENT ON VIEW public.admin_organization_stats IS
  'Estadísticas por organización (incl. settings y deleted_at). SELECT service_role.';

REVOKE ALL ON TABLE public.admin_organization_stats FROM PUBLIC;
GRANT SELECT ON TABLE public.admin_organization_stats TO service_role;
