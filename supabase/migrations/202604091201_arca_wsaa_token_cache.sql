-- Cache de tokens WSAA por organización + entorno.
-- Solo almacenamos CUÁNDO expira el token (no el token en sí, que viaja solo en TLS).
-- Esto evita round-trips innecesarios a AFIP/app.afipsdk.com en cold-starts.

CREATE TABLE IF NOT EXISTS public.arca_wsaa_tokens (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  production      boolean NOT NULL DEFAULT false,
  expires_at      timestamptz NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, production)
);

COMMENT ON TABLE public.arca_wsaa_tokens IS
  'Timestamps de expiración del token WSAA de AFIP por organización y entorno. No contiene el token en sí.';

ALTER TABLE public.arca_wsaa_tokens ENABLE ROW LEVEL SECURITY;
-- Solo service_role puede acceder
