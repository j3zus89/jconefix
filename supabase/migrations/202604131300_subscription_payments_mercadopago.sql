-- Auditoría de pagos Mercado Pago (webhook). Retención mínima 12 meses: no borrar al bloquear acceso.
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  mercado_pago_payment_id text NOT NULL,
  transaction_amount numeric(14, 2) NOT NULL,
  currency_id text,
  payment_method_id text,
  payment_type_id text,
  status text NOT NULL,
  billing_cycle text,
  date_approved timestamptz,
  raw_payment jsonb,
  CONSTRAINT subscription_payments_mp_id_unique UNIQUE (mercado_pago_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON public.subscription_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_org_id ON public.subscription_payments (organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created ON public.subscription_payments (created_at DESC);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_payments_select_member"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = (SELECT auth.uid())
        AND om.is_active = true
    )
  );

COMMENT ON TABLE public.subscription_payments IS 'Pagos de suscripción AR vía Mercado Pago. Integridad 12+ meses; la plataforma no borra cuentas por inactividad antes de un año.';
