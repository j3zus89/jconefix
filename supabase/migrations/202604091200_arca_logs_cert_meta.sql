-- ─── Metadatos del certificado AFIP en credenciales de organización ───────────
ALTER TABLE public.organization_arca_credentials
  ADD COLUMN IF NOT EXISTS cert_expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS cert_cuit_detected text;

COMMENT ON COLUMN public.organization_arca_credentials.cert_expires_at IS
  'Fecha de vencimiento del certificado AFIP (extraída al subir el .p12). Usada para pre-flight validation.';
COMMENT ON COLUMN public.organization_arca_credentials.cert_cuit_detected IS
  'CUIT detectado en el certificado al momento de subirlo. Útil para detectar desajuste con shop_settings.registration_number.';

-- ─── Tabla de auditoría de operaciones AFIP ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.afip_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  cuit          text,
  endpoint      text NOT NULL,   -- 'wsfe.test' | 'wsfe.auth' | 'wsfe.voucher' | 'wsfe.preflight' | etc.
  result        text NOT NULL,   -- 'ok' | 'fail' | 'skip' | 'mock'
  error_message text,
  detail        jsonb           -- datos adicionales no sensibles (PV, tipo comprobante, nro. etc.)
);

COMMENT ON TABLE public.afip_logs IS
  'Registro de operaciones AFIP/ARCA por organización. No almacena certificados ni claves privadas.';

-- Solo service_role puede leer/escribir (nunca el cliente)
ALTER TABLE public.afip_logs ENABLE ROW LEVEL SECURITY;

-- Índices para soporte y debugging
CREATE INDEX IF NOT EXISTS afip_logs_org_created ON public.afip_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS afip_logs_result ON public.afip_logs (result, created_at DESC);
