-- Nombre y descripción personalizados por organización para los roles predefinidos del panel
-- (admin, tech_1, tech_2, tech_3, receptionist, technician). La clave interna no cambia.

CREATE TABLE IF NOT EXISTS public.organization_role_label_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_role_label_overrides_org_role_key UNIQUE (organization_id, role_key),
  CONSTRAINT organization_role_label_overrides_role_key_check CHECK (
    role_key IN (
      'admin',
      'tech_3',
      'tech_2',
      'tech_1',
      'receptionist',
      'technician'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_organization_role_label_overrides_org
  ON public.organization_role_label_overrides (organization_id);

COMMENT ON TABLE public.organization_role_label_overrides IS
  'Sobrescribe nombre/descripción/color mostrado para roles predefinidos; role_key sigue siendo el guardado en technicians / members.';

ALTER TABLE public.organization_role_label_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_role_label_overrides_select" ON public.organization_role_label_overrides;
DROP POLICY IF EXISTS "org_role_label_overrides_insert" ON public.organization_role_label_overrides;
DROP POLICY IF EXISTS "org_role_label_overrides_update" ON public.organization_role_label_overrides;
DROP POLICY IF EXISTS "org_role_label_overrides_delete" ON public.organization_role_label_overrides;

CREATE POLICY "org_role_label_overrides_select" ON public.organization_role_label_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_role_label_overrides.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
  );

CREATE POLICY "org_role_label_overrides_insert" ON public.organization_role_label_overrides
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_role_label_overrides.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_role_label_overrides_update" ON public.organization_role_label_overrides
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_role_label_overrides.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_role_label_overrides.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_role_label_overrides_delete" ON public.organization_role_label_overrides
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_role_label_overrides.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin')
    )
  );
