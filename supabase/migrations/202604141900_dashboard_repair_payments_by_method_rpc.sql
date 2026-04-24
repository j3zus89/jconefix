-- Distribución por forma de pago de cobros de reparación (payments + señas en órdenes del período).
-- El gráfico «Formas de pago» del resumen solo usaba pos_sales; esto alimenta la fusión en el cliente.

CREATE OR REPLACE FUNCTION public.get_dashboard_repair_payments_by_method(
  p_organization_id uuid,
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_filter_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_out jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_organization_id IS NOT NULL AND NOT public.user_belongs_to_org(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_organization_id IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object('payment_method', method_key, 'total_amount', total_amount)
        ORDER BY total_amount DESC
      ),
      '[]'::jsonb
    )
    INTO v_out
    FROM (
      SELECT method_key, SUM(amt)::numeric AS total_amount
      FROM (
        SELECT
          lower(trim(both FROM coalesce(nullif(trim(both FROM p.payment_method), ''), 'cash'))) AS method_key,
          p.amount::numeric AS amt
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
          AND (p_filter_user_id IS NULL OR p.shop_owner_id = p_filter_user_id)

        UNION ALL

        SELECT
          'deposit'::text AS method_key,
          COALESCE(t.deposit_amount, 0)::numeric AS amt
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
          AND (p_filter_user_id IS NULL OR t.user_id = p_filter_user_id)
      ) u
      GROUP BY method_key
    ) g;
  ELSE
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object('payment_method', method_key, 'total_amount', total_amount)
        ORDER BY total_amount DESC
      ),
      '[]'::jsonb
    )
    INTO v_out
    FROM (
      SELECT method_key, SUM(amt)::numeric AS total_amount
      FROM (
        SELECT
          lower(trim(both FROM coalesce(nullif(trim(both FROM p.payment_method), ''), 'cash'))) AS method_key,
          p.amount::numeric AS amt
        FROM public.payments p
        INNER JOIN public.repair_tickets t ON t.id = p.ticket_id
        WHERE p.ticket_id IS NOT NULL
          AND p.created_at >= p_from
          AND p.created_at <= p_to
          AND (p.status IS NULL OR p.status = 'completed')
          AND p.shop_owner_id = v_uid
          AND t.user_id = v_uid
          AND (p_filter_user_id IS NULL OR p.shop_owner_id = p_filter_user_id)

        UNION ALL

        SELECT
          'deposit'::text AS method_key,
          COALESCE(t.deposit_amount, 0)::numeric AS amt
        FROM public.repair_tickets t
        WHERE COALESCE(t.deposit_amount, 0) > 0
          AND t.created_at >= p_from
          AND t.created_at <= p_to
          AND t.user_id = v_uid
          AND (p_filter_user_id IS NULL OR t.user_id = p_filter_user_id)
      ) u
      GROUP BY method_key
    ) g;
  END IF;

  RETURN COALESCE(v_out, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_repair_payments_by_method(uuid, timestamp with time zone, timestamp with time zone, uuid)
  IS 'JSON [{payment_method, total_amount}] de cobros de reparación en el período (payments + señas); para combinar con POS en el dashboard.';

REVOKE ALL ON FUNCTION public.get_dashboard_repair_payments_by_method(uuid, timestamp with time zone, timestamp with time zone, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_repair_payments_by_method(uuid, timestamp with time zone, timestamp with time zone, uuid) TO authenticated;
