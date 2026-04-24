-- =============================================
-- EMERGENCY FIX: Todos los posibles problemas
-- =============================================

-- 1. Arreglar constraint de estados faltante 'pre_orden_pendiente'
ALTER TABLE repair_tickets DROP CONSTRAINT IF EXISTS repair_tickets_status_check;

ALTER TABLE repair_tickets
  ADD CONSTRAINT repair_tickets_status_check
  CHECK (status = ANY (ARRAY[
    'pending', 'in_progress', 'completed', 'cancelled', 'draft',
    'no_repair', 'diagnostic', 'waiting_parts', 'entrada', 'envios',
    'pendiente_pedido', 'presupuesto', 'en_proceso', 'pendiente_pieza',
    'no_reparado_open', 'en_estudio', 'pendiente_cliente', 'traslado',
    'externa', 'diagnostico', 'prioridad', 'reparado', 'repaired_collected',
    'no_reparado', 'delivered', 'cancelado', 'pre_orden_pendiente'
  ]::text[]));

-- 2. Verificar columnas fiscales existen
ALTER TABLE repair_tickets 
  ADD COLUMN IF NOT EXISTS customer_fiscal_id_ar TEXT,
  ADD COLUMN IF NOT EXISTS customer_iva_condition_ar TEXT;

-- 3. Verificar columnas de pre-orden existen
ALTER TABLE repair_tickets 
  ADD COLUMN IF NOT EXISTS equipo_en_tienda BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS maia_captured_email TEXT,
  ADD COLUMN IF NOT EXISTS maia_captured_name TEXT,
  ADD COLUMN IF NOT EXISTS maia_captured_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_maia BOOLEAN DEFAULT false;

-- 4. Verificar tabla maia_notifications existe
CREATE TABLE IF NOT EXISTS maia_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'pre_order_created',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 5. RLS para maia_notifications
ALTER TABLE maia_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maia_notifications_select" ON maia_notifications;
CREATE POLICY "maia_notifications_select" 
  ON maia_notifications FOR SELECT 
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- 6. Verificar is_active en organizations
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =============================================
-- FIN EMERGENCY FIX
-- =============================================
