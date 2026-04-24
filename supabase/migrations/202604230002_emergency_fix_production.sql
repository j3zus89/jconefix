-- EMERGENCY FIX - PARTE 1: Constraint de estados
ALTER TABLE repair_tickets DROP CONSTRAINT IF EXISTS repair_tickets_status_check;

ALTER TABLE repair_tickets
  ADD CONSTRAINT repair_tickets_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'draft', 'no_repair', 'diagnostic', 'waiting_parts', 'entrada', 'envios', 'pendiente_pedido', 'presupuesto', 'en_proceso', 'pendiente_pieza', 'no_reparado_open', 'en_estudio', 'pendiente_cliente', 'traslado', 'externa', 'diagnostico', 'prioridad', 'reparado', 'repaired_collected', 'no_reparado', 'delivered', 'cancelado', 'pre_orden_pendiente'));
