-- Garantía de aislamiento entre facturas internas y facturas AFIP.
-- Las facturas con ar_internal_only = true NUNCA deben tener:
--   - ar_status (lifecycle AFIP)
--   - ar_numero_cbte (numeración AFIP)
--   - ar_cae (CAE AFIP)
-- Esto evita mezclar series numéricas y asegura separación legal.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_ar_internal_no_afip_fields'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT ck_ar_internal_no_afip_fields
      CHECK (
        NOT (
          ar_internal_only = true
          AND (
            ar_status IS NOT NULL
            OR ar_numero_cbte IS NOT NULL
            OR ar_cae IS NOT NULL
          )
        )
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT ck_ar_internal_no_afip_fields ON public.invoices IS
  'Garantiza que facturas internas (ar_internal_only=true) nunca mezclen numeración, CAE ni estado AFIP con la serie oficial.';
