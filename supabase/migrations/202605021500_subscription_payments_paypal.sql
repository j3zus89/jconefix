-- Agrega soporte PayPal a subscription_payments (originalmente solo MP).
-- Puntos:
--   1. `paypal_order_id` nullable + índice único → idempotencia
--   2. `platform` → 'mercadopago' | 'paypal'
--   3. `mercado_pago_payment_id` pasa a nullable (ya existe en filas viejas)
--   4. CHECK: al menos uno de los dos IDs de plataforma debe estar presente

ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS paypal_order_id text;

-- Índice único para dedupe PayPal (ignora NULLs en Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_paypal_order_id_unique
  ON public.subscription_payments (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- mercado_pago_payment_id puede ser NULL en pagos PayPal
ALTER TABLE public.subscription_payments
  ALTER COLUMN mercado_pago_payment_id DROP NOT NULL;

-- Constraint: al menos un ID de plataforma presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_payments_platform_id_check'
  ) THEN
    ALTER TABLE public.subscription_payments
      ADD CONSTRAINT subscription_payments_platform_id_check
      CHECK (
        mercado_pago_payment_id IS NOT NULL
        OR paypal_order_id IS NOT NULL
      );
  END IF;
END$$;

-- Índice en platform para filtrar por plataforma en Super Admin
CREATE INDEX IF NOT EXISTS idx_subscription_payments_platform
  ON public.subscription_payments (platform);

COMMENT ON COLUMN public.subscription_payments.platform IS 'Plataforma de pago: mercadopago | paypal';
COMMENT ON COLUMN public.subscription_payments.paypal_order_id IS 'PayPal order ID único. NULL en pagos MP. Índice único previene doble-activación.';
