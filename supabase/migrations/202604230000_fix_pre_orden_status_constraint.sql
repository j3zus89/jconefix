-- =============================================
-- FIX: Agregar estado pre_orden_pendiente al constraint
-- =============================================
-- La migración 202604222350_expand_status_constraint_add_missing.sql
-- reemplazó el constraint sin incluir pre_orden_pendiente

ALTER TABLE repair_tickets DROP CONSTRAINT IF EXISTS repair_tickets_status_check;

ALTER TABLE repair_tickets
  ADD CONSTRAINT repair_tickets_status_check
  CHECK (status = ANY (ARRAY[
    -- Estados legacy básicos
    'pending', 'in_progress', 'completed', 'cancelled', 'draft',
    'no_repair', 'diagnostic',
    -- Estados en espera
    'waiting_parts', 'entrada', 'envios', 'pendiente_pedido', 'presupuesto',
    -- Estados abiertos
    'en_proceso', 'pendiente_pieza', 'no_reparado_open',
    'en_estudio', 'pendiente_cliente', 'traslado', 'externa',
    'diagnostico', 'prioridad',
    -- Estados cerrados
    'reparado', 'repaired_collected', 'no_reparado',
    -- Estados faltantes
    'delivered', 'cancelado',
    -- Pre-ordenes (MAIA)
    'pre_orden_pendiente'
  ]::text[]));

-- =============================================
-- FIN FIX
-- =============================================
