-- =============================================
-- MIGRACIÓN: Soporte para Pre-Órdenes (Turno Online)
-- =============================================

-- 1. Agregar nuevo estado 'pre_orden_pendiente' a repair_tickets
-- Nota: PostgreSQL no permite ALTER TYPE ADD VALUE dentro de una transacción,
-- por eso usamos el enfoque de texto libre con CHECK constraint

-- Primero, normalizar datos existentes - convertir NULL o valores inválidos a 'pending'
UPDATE repair_tickets 
SET status = 'pending' 
WHERE status IS NULL 
   OR status NOT IN ('pending', 'in_progress', 'completed', 'cancelled');

-- Eliminar el constraint existente si es necesario
ALTER TABLE repair_tickets DROP CONSTRAINT IF EXISTS repair_tickets_status_check;

-- Agregar el nuevo constraint con el estado adicional
ALTER TABLE repair_tickets ADD CONSTRAINT repair_tickets_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'pre_orden_pendiente'));

-- 2. Agregar campo equipo_en_tienda para marcar ubicación del equipo
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS equipo_en_tienda BOOLEAN DEFAULT true;

-- 3. Agregar campo para datos de contacto del cliente (capturados por MAIA)
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS maia_captured_email TEXT;
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS maia_captured_name TEXT;
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS maia_captured_details JSONB DEFAULT '{}'::jsonb;

-- 4. Agregar campo para indicar que fue creado por MAIA
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS created_by_maia BOOLEAN DEFAULT false;

-- 5. Crear índice para buscar pre-órdenes rápidamente
CREATE INDEX IF NOT EXISTS idx_repair_tickets_pre_orden 
  ON repair_tickets(status) 
  WHERE status = 'pre_orden_pendiente';

-- 6. Crear tabla de notificaciones para el dashboard (tiempo real)
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

-- Habilitar RLS
ALTER TABLE maia_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notificaciones
DROP POLICY IF EXISTS "maia_notifications_select" ON maia_notifications;
CREATE POLICY "maia_notifications_select" 
  ON maia_notifications FOR SELECT 
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "maia_notifications_insert" ON maia_notifications;
CREATE POLICY "maia_notifications_insert" 
  ON maia_notifications FOR INSERT 
  WITH CHECK (true); -- Permitir inserciones desde el bot

DROP POLICY IF EXISTS "maia_notifications_update" ON maia_notifications;
CREATE POLICY "maia_notifications_update" 
  ON maia_notifications FOR UPDATE 
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- 7. Crear función para generar número de ticket automáticamente para pre-órdenes
CREATE OR REPLACE FUNCTION generate_pre_order_ticket_number()
RETURNS TEXT AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
  ticket_num TEXT;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  -- Buscar el último número de ticket para este año
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(ticket_number, '^PO-' || year_prefix || '-', '', 'g'), '')), 
    '0'
  )::INTEGER + 1
  INTO next_number
  FROM repair_tickets
  WHERE ticket_number LIKE 'PO-' || year_prefix || '-%';
  
  ticket_num := 'PO-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para notificar al dashboard cuando se crea una pre-orden
CREATE OR REPLACE FUNCTION notify_pre_order_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pre_orden_pendiente' AND NEW.created_by_maia = true THEN
    INSERT INTO maia_notifications (
      organization_id,
      ticket_id,
      notification_type,
      title,
      message
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'pre_order_created',
      'Nueva Pre-Orden - ' || COALESCE(NEW.maia_captured_name, 'Cliente'),
      'Dispositivo: ' || COALESCE(NEW.device_type, 'No especificado') || 
      ' ' || COALESCE(NEW.device_model, '') || 
      '. El cliente traerá el equipo pronto.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_notify_pre_order ON repair_tickets;
CREATE TRIGGER trg_notify_pre_order
  AFTER INSERT ON repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_pre_order_created();

-- =============================================
-- FIN MIGRACIÓN
-- =============================================
