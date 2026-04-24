-- =============================================================================
-- AUDITORÍA TÉCNICA EXTREMA — JC ONE FIX
-- Columnas y tablas faltantes detectadas en la auditoría completa del sistema.
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS en todos los casos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. organizations.gemini_api_key  (migración 202604033400 estaba rota)
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS gemini_api_key text;

COMMENT ON COLUMN public.organizations.gemini_api_key IS
  'Clave de API de Gemini AI por organización. Visible solo para el owner.';

-- ---------------------------------------------------------------------------
-- 2. shop_settings — campos de configuración que la UI usa pero pueden faltar
--    en instancias creadas antes de las migraciones de QZ/SMTP/Portal.
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS receive_emails     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS restocking_fee     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_repairs    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_url           text;

COMMENT ON COLUMN public.shop_settings.receive_emails  IS 'Si el taller acepta notificaciones por email (pendiente wire en UI)';
COMMENT ON COLUMN public.shop_settings.restocking_fee  IS 'Cobrar tarifa de reposición';
COMMENT ON COLUMN public.shop_settings.deposit_repairs IS 'Exigir depósito en reparaciones';
COMMENT ON COLUMN public.shop_settings.logo_url        IS 'URL del logo del taller (pendiente wire en UI)';

-- ---------------------------------------------------------------------------
-- 3. technicians.notes (campo disponible en BD pero no expuesto en UI settings)
-- ---------------------------------------------------------------------------
-- Ya debería existir, pero aseguramos compatibilidad con instancias viejas:
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS notes text;

-- ---------------------------------------------------------------------------
-- 4. invoice_items — añadir referencia opcional a product (para trazabilidad)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invoice_items.product_id IS
  'Referencia al repuesto/producto vendido (opcional; para trazabilidad de stock).';

-- ---------------------------------------------------------------------------
-- 5. pos_sales — guardar efectivo recibido y cambio para cuadre de caja
-- ---------------------------------------------------------------------------
ALTER TABLE public.pos_sales
  ADD COLUMN IF NOT EXISTS cash_given  numeric(12,2),
  ADD COLUMN IF NOT EXISTS cash_change numeric(12,2);

COMMENT ON COLUMN public.pos_sales.cash_given  IS 'Efectivo entregado por el cliente (solo cuando payment_method=cash)';
COMMENT ON COLUMN public.pos_sales.cash_change IS 'Cambio devuelto al cliente';

-- ---------------------------------------------------------------------------
-- 6. products — columna de estado activo (útil para ocultar sin borrar)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.products.is_active IS
  'Soft-delete: false oculta el producto en POS e inventario activo.';

-- ---------------------------------------------------------------------------
-- 7. purchase_order_items — tabla referenciada en políticas RLS pero no creada
--    en 202604021500 (detectada en 202604031000_security_hardening_rls_audit.sql).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description       text NOT NULL DEFAULT '',
  quantity          integer NOT NULL DEFAULT 1,
  unit_cost         numeric(12,2) NOT NULL DEFAULT 0,
  total_cost        numeric(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  notes             text
);

CREATE INDEX IF NOT EXISTS idx_po_items_po    ON public.purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_prod  ON public.purchase_order_items (product_id);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "po_items_select" ON public.purchase_order_items;
DROP POLICY IF EXISTS "po_items_mutate" ON public.purchase_order_items;

CREATE POLICY "po_items_select"
  ON public.purchase_order_items FOR SELECT TO authenticated
  USING (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders
      WHERE user_id = auth.uid()
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    )
  );

CREATE POLICY "po_items_mutate"
  ON public.purchase_order_items FOR ALL TO authenticated
  USING (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders
      WHERE user_id = auth.uid()
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    )
  )
  WITH CHECK (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders
      WHERE user_id = auth.uid()
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Asegurar índice en products para búsquedas del POS (SKU + name)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_sku    ON public.products (sku)     WHERE sku IS NOT NULL AND sku <> '';
CREATE INDEX IF NOT EXISTS idx_products_name   ON public.products USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (organization_id, is_active, quantity)
  WHERE is_active = true AND quantity > 0;
