-- Añade los permisos can_collect_payment y can_open_drawer a los registros
-- existentes de organization_members según su rol.
--
-- Regla:
--   owner, admin, manager, receptionist → true (cobro = parte de su trabajo)
--   tech_1, tech_2, tech_3, technician  → false (por defecto; el owner puede activarlo)

-- Para los registros que ya existen y NO tienen todavía la clave en su JSONB:
UPDATE organization_members
SET permissions = permissions
  || jsonb_build_object(
       'can_collect_payment',
       CASE
         WHEN role IN ('owner', 'admin', 'manager', 'receptionist') THEN true
         ELSE false
       END,
       'can_open_drawer',
       CASE
         WHEN role IN ('owner', 'admin', 'manager', 'receptionist') THEN true
         ELSE false
       END
     )
WHERE
  -- Solo si todavía no tienen esas claves (no sobreescribe overrides manuales)
  (permissions->>'can_collect_payment') IS NULL
  OR (permissions->>'can_open_drawer') IS NULL;

-- Actualizar el DEFAULT de la columna para los registros futuros.
-- Usamos un default genérico mínimo; el código de la app asigna el valor
-- correcto según el rol al crear el miembro.
ALTER TABLE organization_members
  ALTER COLUMN permissions
  SET DEFAULT '{
    "can_create_tickets": true,
    "can_edit_tickets": true,
    "can_delete_tickets": false,
    "can_view_reports": false,
    "can_manage_inventory": true,
    "can_manage_customers": true,
    "can_manage_settings": false,
    "can_manage_users": false,
    "can_create_invoices": true,
    "can_view_all_tickets": true,
    "can_manage_pos": false,
    "can_manage_expenses": false,
    "can_export_data": false,
    "can_collect_payment": false,
    "can_open_drawer": false
  }'::jsonb;
