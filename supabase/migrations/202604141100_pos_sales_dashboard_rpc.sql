-- Agregaciones POS en servidor (evita descargar miles de filas de pos_sales al cliente).
-- Aislamiento: org vía user_belongs_to_org(); modo sin org solo filas del usuario autenticado.

CREATE INDEX IF NOT EXISTS idx_pos_sales_org_created
  ON public.pos_sales (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pos_sales_user_created
  ON public.pos_sales (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_pos_sales_dashboard_aggregates(
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_organization_id IS NOT NULL AND NOT public.user_belongs_to_org(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN (
    WITH base AS (
      SELECT
        ps.total,
        ps.subtotal,
        ps.discount_pct,
        ps.tax_amount,
        ps.payment_method,
        ps.created_at
      FROM public.pos_sales ps
      WHERE ps.created_at >= p_from
        AND ps.created_at <= p_to
        AND (
          (p_organization_id IS NOT NULL AND ps.organization_id = p_organization_id)
          OR (p_organization_id IS NULL AND ps.user_id = v_uid)
        )
        AND (p_filter_user_id IS NULL OR ps.user_id = p_filter_user_id)
    ),
    daily AS (
      SELECT
        ((created_at AT TIME ZONE 'UTC'))::date AS sale_day,
        SUM(total)::numeric AS venta,
        SUM(subtotal * (discount_pct / 100.0))::numeric AS descuento,
        SUM(subtotal)::numeric AS neto,
        SUM(tax_amount)::numeric AS impuesto
      FROM base
      GROUP BY 1
    ),
    pm AS (
      SELECT
        lower(trim(both FROM coalesce(nullif(trim(both FROM payment_method), ''), 'cash'))) AS method_key,
        SUM(total)::numeric AS total_amount
      FROM base
      GROUP BY 1
    ),
    totals AS (
      SELECT
        COALESCE(SUM(total), 0)::numeric AS pos_total,
        COALESCE(SUM(subtotal * (discount_pct / 100.0)), 0)::numeric AS discount_total,
        COALESCE(SUM(subtotal), 0)::numeric AS neto_total,
        COALESCE(SUM(tax_amount), 0)::numeric AS tax_total,
        COUNT(*)::bigint AS sale_count
      FROM base
    )
    SELECT jsonb_build_object(
      'daily',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'sale_day', sale_day::text,
              'venta', venta,
              'descuento', descuento,
              'neto', neto,
              'impuesto', impuesto
            )
            ORDER BY sale_day
          )
          FROM daily
        ),
        '[]'::jsonb
      ),
      'by_payment',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'payment_method', method_key,
              'total_amount', total_amount
            )
            ORDER BY total_amount DESC
          )
          FROM pm
        ),
        '[]'::jsonb
      ),
      'period',
      (
        SELECT jsonb_build_object(
          'pos_total', pos_total,
          'discount_total', discount_total,
          'neto_total', neto_total,
          'tax_total', tax_total,
          'sale_count', sale_count
        )
        FROM totals
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_pos_sales_dashboard_aggregates(uuid, timestamp with time zone, timestamp with time zone, uuid)
  IS 'Agregados POS por día, método de pago y totales del período; respeta organización (user_belongs_to_org) o user_id en modo sin org.';

REVOKE ALL ON FUNCTION public.get_pos_sales_dashboard_aggregates(uuid, timestamp with time zone, timestamp with time zone, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pos_sales_dashboard_aggregates(uuid, timestamp with time zone, timestamp with time zone, uuid) TO authenticated;
