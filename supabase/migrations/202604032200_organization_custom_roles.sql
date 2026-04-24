-- Roles personalizados por organización (además de los predefinidos en el panel).
-- `role_key` se guarda en `technicians.role` y `organization_members.role`; la etiqueta
-- visible está en `name` / `description`.

CREATE TABLE IF NOT EXISTS public.organization_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#6b7280',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_custom_roles_org_role_key UNIQUE (organization_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_organization_custom_roles_org
  ON public.organization_custom_roles (organization_id);

COMMENT ON TABLE public.organization_custom_roles IS
  'Roles de empleado definidos por el taller; role_key único por organización.';

ALTER TABLE public.organization_custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_custom_roles_select_org"
  ON public.organization_custom_roles;
DROP POLICY IF EXISTS "organization_custom_roles_insert_admin"
  ON public.organization_custom_roles;
DROP POLICY IF EXISTS "organization_custom_roles_update_admin"
  ON public.organization_custom_roles;
DROP POLICY IF EXISTS "organization_custom_roles_delete_admin"
  ON public.organization_custom_roles;

-- No usa user_organization_ids() para que este script funcione aunque no exista esa función
-- (p. ej. si no se aplicó aún 202604031000_security_hardening_rls_audit.sql).
CREATE POLICY "organization_custom_roles_select_org"
  ON public.organization_custom_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_custom_roles.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

CREATE POLICY "organization_custom_roles_insert_admin"
  ON public.organization_custom_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_custom_roles.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "organization_custom_roles_update_admin"
  ON public.organization_custom_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_custom_roles.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_custom_roles.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "organization_custom_roles_delete_admin"
  ON public.organization_custom_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_custom_roles.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin')
    )
  );

-- Permitir guardar `organization_members.role` = role_key de roles personalizados (además de los fijos).
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

COMMENT ON COLUMN public.organization_members.role IS
  'owner, admin, manager, technician, receptionist o role_key de organization_custom_roles.';
