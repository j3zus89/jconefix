-- Datos fiscales del cliente en factura (DNI/NIF/CUIT y dirección de facturación).
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_tax_id text;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_billing_address text;

COMMENT ON COLUMN public.invoices.customer_tax_id IS 'Documento fiscal del cliente (DNI, NIF, CIF, CUIT, etc.).';
COMMENT ON COLUMN public.invoices.customer_billing_address IS 'Dirección fiscal / de facturación del cliente.';
