/*
  # Expand ticket status constraint

  ## Overview
  Removes the old restrictive status CHECK constraint and replaces it with one
  that allows all the new status values used by the application.

  ## Changes
  - Drops the old `repair_tickets_status_check` constraint (only allowed 4 values)
  - Adds a new constraint that allows all custom status values plus legacy ones
*/

ALTER TABLE repair_tickets DROP CONSTRAINT IF EXISTS repair_tickets_status_check;

ALTER TABLE repair_tickets
  ADD CONSTRAINT repair_tickets_status_check
  CHECK (status = ANY (ARRAY[
    'pending', 'in_progress', 'completed', 'cancelled', 'draft',
    'no_repair', 'diagnostic',
    'waiting_parts', 'entrada', 'envios', 'pendiente_pedido', 'presupuesto',
    'en_proceso', 'pendiente_pieza', 'no_reparado_open',
    'en_estudio', 'pendiente_cliente', 'traslado', 'externa',
    'diagnostico', 'prioridad',
    'reparado', 'repaired_collected', 'no_reparado'
  ]::text[]));
