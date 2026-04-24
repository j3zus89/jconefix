-- ARCA/AFIP: credenciales por organización (cifrado en aplicación) y snapshot fiscal en tickets.

-- ─── Credenciales WS (cert/key cifrados en servidor; solo accesibles vía service role) ───
CREATE TABLE IF NOT EXISTS public.organization_arca_credentials (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  cert_pem_enc text NOT NULL,
  key_pem_enc text NOT NULL,
  production boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organization_arca_credentials IS
  'Certificado y clave privada ARCA/AFIP (PEM) cifrados con ARCA_CREDENTIALS_MASTER_KEY en la app. production=false = homologación.';

ALTER TABLE public.organization_arca_credentials ENABLE ROW LEVEL SECURITY;

-- Sin políticas para authenticated: el cliente nunca lee/escribe esta tabla; solo service_role en API routes.

-- ─── Snapshot fiscal en ticket (Argentina) ───
ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS customer_fiscal_id_ar text,
  ADD COLUMN IF NOT EXISTS customer_iva_condition_ar text;

COMMENT ON COLUMN public.repair_tickets.customer_fiscal_id_ar IS
  'AR: DNI/CUIT/CUIL del cliente al abrir el ticket (copiado de customers.id_number).';
COMMENT ON COLUMN public.repair_tickets.customer_iva_condition_ar IS
  'AR: condición IVA del cliente al abrir el ticket (copiado de customers.tax_class).';

-- ─── Factura: condición IVA cliente (Argentina) ───
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_iva_condition_ar text;

COMMENT ON COLUMN public.invoices.customer_iva_condition_ar IS
  'AR: condición frente al IVA del receptor (Monotributo, Responsable Inscripto, Exento, etc.).';
