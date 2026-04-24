-- Columna generada para contar filas con bajo stock sin escanear quantity/min_quantity en el cliente.
-- PostgREST permite: .eq('is_low_stock', true) + count exact + head.

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS is_low_stock boolean
  GENERATED ALWAYS AS (quantity <= COALESCE(min_quantity, 0)) STORED;

CREATE INDEX IF NOT EXISTS idx_inventory_items_org_low_stock
  ON public.inventory_items (organization_id)
  WHERE is_low_stock = true AND organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_user_low_stock
  ON public.inventory_items (user_id)
  WHERE is_low_stock = true;
