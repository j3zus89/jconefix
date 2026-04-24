-- Facturación: campos para panel «Administrar facturas», reembolsos, referencias,
-- firma cliente, jurisdicción ES/AR y metadatos reservados para ARCA/AFIP y Verifactu.
-- Tabla de filtros guardados por usuario y función de saldo pendiente por organización.

-- ─── invoices: columnas nuevas ───────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_jurisdiction text NOT NULL DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS clone_of_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_signature_url text,
  ADD COLUMN IF NOT EXISTS ar_cae text,
  ADD COLUMN IF NOT EXISTS ar_cae_expires_at date,
  ADD COLUMN IF NOT EXISTS ar_cbte_tipo integer,
  ADD COLUMN IF NOT EXISTS ar_punto_venta integer,
  ADD COLUMN IF NOT EXISTS ar_numero_cbte bigint,
  ADD COLUMN IF NOT EXISTS ar_cuit_emisor text,
  ADD COLUMN IF NOT EXISTS es_verifactu_uuid text;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_billing_jurisdiction_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_billing_jurisdiction_check
  CHECK (billing_jurisdiction IN ('ES', 'AR', 'OTHER'));

COMMENT ON COLUMN public.invoices.external_reference IS 'Referencia comercial (boleto, pedido, albarán). Si hay ticket, el panel puede mostrar también ticket_number.';
COMMENT ON COLUMN public.invoices.created_by_user_id IS 'Usuario del panel que creó la factura (empleado).';
COMMENT ON COLUMN public.invoices.refunded_amount IS 'Importe total reembolsado (moneda de la factura).';
COMMENT ON COLUMN public.invoices.billing_jurisdiction IS 'Marco fiscal principal de la factura: ES | AR | OTHER.';
COMMENT ON COLUMN public.invoices.clone_of_invoice_id IS 'Si la factura se generó clonando otra, apunta al original.';
COMMENT ON COLUMN public.invoices.customer_signature_url IS 'URL (p. ej. Storage) de imagen de firma del cliente.';
COMMENT ON COLUMN public.invoices.ar_cae IS 'AR: código CAE/CAEA u homólogo cuando exista integración ARCA/AFIP.';
COMMENT ON COLUMN public.invoices.ar_cae_expires_at IS 'AR: vencimiento del CAE.';
COMMENT ON COLUMN public.invoices.ar_cbte_tipo IS 'AR: tipo de comprobante AFIP (ej. 1 Factura A).';
COMMENT ON COLUMN public.invoices.ar_punto_venta IS 'AR: punto de venta AFIP.';
COMMENT ON COLUMN public.invoices.ar_numero_cbte IS 'AR: número de comprobante en AFIP.';
COMMENT ON COLUMN public.invoices.ar_cuit_emisor IS 'AR: CUIT del emisor tal como en el comprobante electrónico.';
COMMENT ON COLUMN public.invoices.es_verifactu_uuid IS 'ES: reservado para identificador Verifactu / trazabilidad.';

CREATE INDEX IF NOT EXISTS idx_invoices_created_at_org
  ON public.invoices (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_created_by
  ON public.invoices (created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;

-- ─── invoice_saved_filters ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filter_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_invoice_saved_filters_org_user
  ON public.invoice_saved_filters (organization_id, user_id);

ALTER TABLE public.invoice_saved_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_saved_filters_select" ON public.invoice_saved_filters;
DROP POLICY IF EXISTS "invoice_saved_filters_insert" ON public.invoice_saved_filters;
DROP POLICY IF EXISTS "invoice_saved_filters_update" ON public.invoice_saved_filters;
DROP POLICY IF EXISTS "invoice_saved_filters_delete" ON public.invoice_saved_filters;

CREATE POLICY "invoice_saved_filters_select"
  ON public.invoice_saved_filters FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

CREATE POLICY "invoice_saved_filters_insert"
  ON public.invoice_saved_filters FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      user_id = auth.uid()
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  );

CREATE POLICY "invoice_saved_filters_update"
  ON public.invoice_saved_filters FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (
      user_id = auth.uid()
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      user_id = auth.uid()
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  );

CREATE POLICY "invoice_saved_filters_delete"
  ON public.invoice_saved_filters FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      user_id = auth.uid()
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_saved_filters TO authenticated;

-- ─── Saldo pendiente global por organización (respeta RLS del llamador) ───────
CREATE OR REPLACE FUNCTION public.organization_invoice_open_balance(p_organization_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(
      GREATEST(
        0::numeric,
        COALESCE(i.total_amount, 0) - COALESCE(i.paid_amount, 0) - COALESCE(i.refunded_amount, 0)
      )
    ),
    0::numeric
  )
  FROM public.invoices i
  WHERE i.organization_id = p_organization_id
    AND i.status NOT IN ('cancelled', 'draft')
    AND GREATEST(
      0::numeric,
      COALESCE(i.total_amount, 0) - COALESCE(i.paid_amount, 0) - COALESCE(i.refunded_amount, 0)
    ) > 0.005;
$$;

COMMENT ON FUNCTION public.organization_invoice_open_balance(uuid) IS
  'Suma de importes pendientes de cobro por organización (excluye borradores y canceladas). Respeta RLS.';

REVOKE ALL ON FUNCTION public.organization_invoice_open_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_invoice_open_balance(uuid) TO authenticated;
