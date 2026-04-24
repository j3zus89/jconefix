-- Al borrar una organización, no bloquear por filas en super_admin_audit_log que apuntan a ella.
-- La columna target_organization_id es nullable: al eliminar la org pasa a NULL y se conserva el resto del registro.

ALTER TABLE public.super_admin_audit_log
  DROP CONSTRAINT IF EXISTS super_admin_audit_log_target_organization_id_fkey;

ALTER TABLE public.super_admin_audit_log
  ADD CONSTRAINT super_admin_audit_log_target_organization_id_fkey
  FOREIGN KEY (target_organization_id)
  REFERENCES public.organizations(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT super_admin_audit_log_target_organization_id_fkey ON public.super_admin_audit_log IS
  'Si se elimina la organización, la referencia en auditoría queda en NULL (no se pierde la fila de log).';
