-- El panel permite registrar la seña solo en repair_tickets.deposit_amount (sin fila en payments).
-- El KPI «cobrado en reparaciones» solo sumaba payments.amount → faltaba la seña (p. ej. 376k órdenes vs 346k cobrado).

CREATE OR REPLACE FUNCTION public.get_dashboard_repair_payments_sum(
  p_organization_id uuid,
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_filter_user_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pay numeric;
  v_dep numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_organization_id IS NOT NULL AND NOT public.user_belongs_to_org(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_organization_id IS NOT NULL THEN
    SELECT COALESCE(SUM(p.amount), 0) INTO v_pay
    FROM public.payments p
    INNER JOIN public.repair_tickets t ON t.id = p.ticket_id
    WHERE p.ticket_id IS NOT NULL
      AND p.created_at >= p_from
      AND p.created_at <= p_to
      AND (p.status IS NULL OR p.status = 'completed')
      AND (
        t.organization_id = p_organization_id
        OR (
          t.organization_id IS NULL
          AND (
            EXISTS (
              SELECT 1
              FROM public.organization_members om
              WHERE om.organization_id = p_organization_id
                AND om.user_id = t.user_id
                AND om.is_active
            )
            OR EXISTS (
              SELECT 1
              FROM public.organizations o
              WHERE o.id = p_organization_id
                AND o.owner_id = t.user_id
                AND o.deleted_at IS NULL
            )
          )
        )
      )
      AND (p_filter_user_id IS NULL OR p.shop_owner_id = p_filter_user_id);

    SELECT COALESCE(SUM(COALESCE(t.deposit_amount, 0)), 0) INTO v_dep
    FROM public.repair_tickets t
    WHERE COALESCE(t.deposit_amount, 0) > 0
      AND t.created_at >= p_from
      AND t.created_at <= p_to
      AND (
        t.organization_id = p_organization_id
        OR (
          t.organization_id IS NULL
          AND (
            EXISTS (
              SELECT 1
              FROM public.organization_members om
              WHERE om.organization_id = p_organization_id
                AND om.user_id = t.user_id
                AND om.is_active
            )
            OR EXISTS (
              SELECT 1
              FROM public.organizations o
              WHERE o.id = p_organization_id
                AND o.owner_id = t.user_id
                AND o.deleted_at IS NULL
            )
          )
        )
      )
      AND (p_filter_user_id IS NULL OR t.user_id = p_filter_user_id);
  ELSE
    SELECT COALESCE(SUM(p.amount), 0) INTO v_pay
    FROM public.payments p
    INNER JOIN public.repair_tickets t ON t.id = p.ticket_id
    WHERE p.ticket_id IS NOT NULL
      AND p.created_at >= p_from
      AND p.created_at <= p_to
      AND (p.status IS NULL OR p.status = 'completed')
      AND p.shop_owner_id = v_uid
      AND t.user_id = v_uid
      AND (p_filter_user_id IS NULL OR p.shop_owner_id = p_filter_user_id);

    SELECT COALESCE(SUM(COALESCE(t.deposit_amount, 0)), 0) INTO v_dep
    FROM public.repair_tickets t
    WHERE COALESCE(t.deposit_amount, 0) > 0
      AND t.created_at >= p_from
      AND t.created_at <= p_to
      AND t.user_id = v_uid
      AND (p_filter_user_id IS NULL OR t.user_id = p_filter_user_id);
  END IF;

  RETURN COALESCE(v_pay, 0) + COALESCE(v_dep, 0);
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_repair_payments_sum(uuid, timestamp with time zone, timestamp with time zone, uuid)
  IS 'Suma cobros de reparación en el período: payments (completed) + señas (deposit_amount) en órdenes creadas en el mismo período; alcance org o modo solo.';

REVOKE ALL ON FUNCTION public.get_dashboard_repair_payments_sum(uuid, timestamp with time zone, timestamp with time zone, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_repair_payments_sum(uuid, timestamp with time zone, timestamp with time zone, uuid) TO authenticated;
