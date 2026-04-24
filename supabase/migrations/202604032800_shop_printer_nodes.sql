-- Impresoras del nodo de impresión (por organización; estado en vivo vía QZ Tray en el cliente).

CREATE TABLE IF NOT EXISTS public.shop_printer_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  printer_type text NOT NULL DEFAULT 'thermal_80',
  qz_printer_name text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_printer_nodes_org
  ON public.shop_printer_nodes (organization_id);

CREATE INDEX IF NOT EXISTS idx_shop_printer_nodes_org_sort
  ON public.shop_printer_nodes (organization_id, sort_order, name);

ALTER TABLE public.shop_printer_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_printer_nodes_select ON public.shop_printer_nodes;
DROP POLICY IF EXISTS shop_printer_nodes_insert ON public.shop_printer_nodes;
DROP POLICY IF EXISTS shop_printer_nodes_update ON public.shop_printer_nodes;
DROP POLICY IF EXISTS shop_printer_nodes_delete ON public.shop_printer_nodes;

CREATE POLICY shop_printer_nodes_select
  ON public.shop_printer_nodes
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.user_belongs_to_org (organization_id)
  );

CREATE POLICY shop_printer_nodes_insert
  ON public.shop_printer_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND public.user_belongs_to_org (organization_id)
  );

CREATE POLICY shop_printer_nodes_update
  ON public.shop_printer_nodes
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.user_belongs_to_org (organization_id)
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND public.user_belongs_to_org (organization_id)
  );

CREATE POLICY shop_printer_nodes_delete
  ON public.shop_printer_nodes
  FOR DELETE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.user_belongs_to_org (organization_id)
  );

DROP TRIGGER IF EXISTS update_shop_printer_nodes_updated_at ON public.shop_printer_nodes;

CREATE TRIGGER update_shop_printer_nodes_updated_at
  BEFORE UPDATE ON public.shop_printer_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column ();

COMMENT ON TABLE public.shop_printer_nodes IS 'Impresoras configuradas por taller; qz_printer_name debe coincidir con el nombre en QZ Tray para mostrar «En línea».';
