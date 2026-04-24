-- Poder leer al menos la propia fila de membresía (incl. si is_active = false).
-- Antes: EXISTS exigía un miembro *activo* en la org; un usuario desactivado no veía ni su propia fila.

DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
CREATE POLICY "Users can view members of their organizations"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );
