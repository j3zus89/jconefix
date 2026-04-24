-- Constancias de devolución / abono al cliente (registro aparte de la factura de cobro).

CREATE TABLE IF NOT EXISTS public.customer_return_constancias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  shop_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  repair_ticket_id uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  related_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  reference_code text NOT NULL,
  scenario text NOT NULL DEFAULT 'other',
  settlement_method text,
  summary_line text NOT NULL DEFAULT '',
  detail text,
  amount_money numeric(12, 2),
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'delivered', 'void')),
  delivered_at timestamptz,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_return_constancias_ticket
  ON public.customer_return_constancias (repair_ticket_id);

CREATE INDEX IF NOT EXISTS idx_customer_return_constancias_org_created
  ON public.customer_return_constancias (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_return_constancias_status
  ON public.customer_return_constancias (status);

COMMENT ON TABLE public.customer_return_constancias IS
  'Registro de devolución o constancia al cliente (dinero, equipo, mixto, abono, etc.). Una fila viva por boleto; al anular en el ticket se borra.';
COMMENT ON COLUMN public.customer_return_constancias.scenario IS
  'Tipo de actuación: refund_money, return_goods, mixed, store_credit, warranty_labor, warranty_parts, order_cancel, service_adjustment, other.';
COMMENT ON COLUMN public.customer_return_constancias.settlement_method IS
  'Cómo se liquida: cash, transfer, card_refund, none_goods_only, exchange, store_voucher, pending, other.';

-- Código legible único por fila
CREATE OR REPLACE FUNCTION public.set_customer_return_reference_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NOT NULL AND trim(NEW.reference_code) <> '' THEN
    RETURN NEW;
  END IF;
  NEW.reference_code :=
    'DEV-'
    || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_return_reference ON public.customer_return_constancias;
CREATE TRIGGER trg_customer_return_reference
  BEFORE INSERT ON public.customer_return_constancias
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_return_reference_code();

ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS return_scenario text,
  ADD COLUMN IF NOT EXISTS return_settlement_method text,
  ADD COLUMN IF NOT EXISTS return_related_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.repair_tickets.return_scenario IS
  'Copia operativa del tipo de devolución (sincronizada con customer_return_constancias).';
COMMENT ON COLUMN public.repair_tickets.return_settlement_method IS
  'Forma de liquidación acordada con el cliente.';

ALTER TABLE public.customer_return_constancias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS return_const_select ON public.customer_return_constancias;
DROP POLICY IF EXISTS return_const_insert ON public.customer_return_constancias;
DROP POLICY IF EXISTS return_const_update ON public.customer_return_constancias;
DROP POLICY IF EXISTS return_const_delete ON public.customer_return_constancias;

CREATE POLICY return_const_select ON public.customer_return_constancias
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = customer_return_constancias.repair_ticket_id
        AND (
          rt.organization_id IN (SELECT public.user_organization_ids())
          OR rt.user_id = auth.uid()
        )
    )
  );

CREATE POLICY return_const_insert ON public.customer_return_constancias
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = customer_return_constancias.repair_ticket_id
        AND (
          rt.organization_id IN (SELECT public.user_organization_ids())
          OR rt.user_id = auth.uid()
        )
    )
  );

CREATE POLICY return_const_update ON public.customer_return_constancias
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = customer_return_constancias.repair_ticket_id
        AND (
          rt.organization_id IN (SELECT public.user_organization_ids())
          OR rt.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = customer_return_constancias.repair_ticket_id
        AND (
          rt.organization_id IN (SELECT public.user_organization_ids())
          OR rt.user_id = auth.uid()
        )
    )
  );

CREATE POLICY return_const_delete ON public.customer_return_constancias
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = customer_return_constancias.repair_ticket_id
        AND (
          rt.organization_id IN (SELECT public.user_organization_ids())
          OR rt.user_id = auth.uid()
        )
    )
  );

CREATE OR REPLACE FUNCTION public.touch_customer_return_constancia()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_return_touch ON public.customer_return_constancias;
CREATE TRIGGER trg_customer_return_touch
  BEFORE UPDATE ON public.customer_return_constancias
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_customer_return_constancia();
