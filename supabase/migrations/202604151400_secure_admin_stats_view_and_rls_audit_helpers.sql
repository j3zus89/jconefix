-- =============================================================================
-- Seguridad Supabase: vista admin sin exponer auth.users a PostgREST + auditoría RLS
-- =============================================================================
-- Contexto:
--   - La vista public.admin_organization_stats hacía JOIN a auth.users y tenía
--     GRANT SELECT … TO authenticated → cualquier usuario logueado podía leer
--     métricas (y emails de dueños) vía API PostgREST.
--   - Supabase Advisor marca RLS desactivado en tablas y vistas que referencian auth.users.
--
-- Qué hace esta migración:
--   1) Función STABLE SECURITY DEFINER que lee email en auth (solo ejecutable por service_role).
--   2) Recrea admin_organization_stats sin JOIN directo a auth.users; usa la función.
--   3) Vista con security_invoker + security_barrier; solo service_role puede SELECT.
--   4) Bloque opcional: habilitar RLS solo en tablas public que YA tienen al menos una policy.
--   5) Consulta de auditoría: tablas public sin RLS o sin policies.
-- =============================================================================

-- ─── 1) Email del dueño: solo backend (service_role), no desde el JWT del taller ───
CREATE OR REPLACE FUNCTION public.admin_organization_stats_owner_email(p_owner_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT u.email FROM auth.users AS u WHERE u.id = p_owner_id LIMIT 1;
$$;

COMMENT ON FUNCTION public.admin_organization_stats_owner_email(uuid) IS
  'Lee email del dueño en auth.users. Ejecutable solo por service_role (rutas /api/admin con service key).';

REVOKE ALL ON FUNCTION public.admin_organization_stats_owner_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_organization_stats_owner_email(uuid) TO service_role;

-- ─── 2–3) Vista: misma forma que 202604030200_localization_es_ar.sql, sin JOIN público a auth.users ───
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
  'Estadísticas por organización. SELECT restringido a service_role; owner_email vía función SECURITY DEFINER.';

REVOKE ALL ON TABLE public.admin_organization_stats FROM PUBLIC;
GRANT SELECT ON TABLE public.admin_organization_stats TO service_role;

-- ─── 4) Activar RLS solo donde ya existen policies (evita bloquear tablas sin políticas) ───
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
      AND EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = c.relname
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    RAISE NOTICE 'RLS habilitado (ya tenía policies): %', r.tbl;
  END LOOP;
END $$;

-- ─── 5) Auditoría manual (ejecutá en SQL Editor y revisá el resultado) ───
-- SELECT * FROM public._audit_public_rls_gaps;
-- La vista temporal siguiente no se crea en migración para no dejar objetos extra;
-- copiá y ejecutá aparte si querés listado puntual:

/*
WITH pol AS (
  SELECT tablename, COUNT(*)::int AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
),
rels AS (
  SELECT c.relname AS tablename, c.relrowsecurity AS rls_on
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
)
SELECT
  r.tablename,
  r.rls_on,
  COALESCE(p.policy_count, 0) AS policy_count,
  CASE
    WHEN NOT r.rls_on AND COALESCE(p.policy_count, 0) = 0 THEN 'CRÍTICO: sin RLS y sin policies'
    WHEN NOT r.rls_on THEN 'ALTO: RLS apagado (hay policies — activá RLS)'
    WHEN COALESCE(p.policy_count, 0) = 0 THEN 'CRÍTICO: RLS on pero sin policies (nadie puede usar la tabla vía API)'
    ELSE 'OK'
  END AS estado
FROM rels r
LEFT JOIN pol p ON p.tablename = r.tablename
ORDER BY estado DESC, r.tablename;
*/
