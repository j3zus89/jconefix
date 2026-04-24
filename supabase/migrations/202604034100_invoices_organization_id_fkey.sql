-- PostgREST: relación invoices ↔ organizations para embed `organizations(...)` en select.
-- Sin FK explícita (p. ej. columna añadida solo como uuid), aparece:
-- «Could not find a relationship between 'invoices' and 'organizations' in the schema cache».

UPDATE public.invoices i
SET organization_id = NULL
WHERE i.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = i.organization_id);

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class tbl ON tbl.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'invoices'
      AND c.contype = 'f'
      AND c.confrelid = 'public.organizations'::regclass
  ) LOOP
    EXECUTE format('ALTER TABLE public.invoices DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT invoices_organization_id_fkey ON public.invoices IS
  'FK para embed PostgREST: invoices → organizations.';
