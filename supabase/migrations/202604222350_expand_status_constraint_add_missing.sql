/*
  # Expandir constraint de estados - Agregar estados faltantes

  ## Overview
  Agrega los estados faltantes al constraint CHECK de repair_tickets
  que están causando errores al cambiar estados.

  ## Cambios
  - Agrega 'delivered' (Entregado)
  - Agrega 'cancelado' (variante en español de cancelled)
  - Mantiene todos los estados existentes
*/

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
    -- NUEVOS: Estados faltantes
    'delivered', 'cancelado'
  ]::text[]));
