-- El titular debe poder leer su fila en organizations aunque no exista fila en organization_members
-- (o mientras se repone la membresía). Evita errores RLS en APIs y en el panel.
DROP POLICY IF EXISTS "orgs_select_member" ON public.organizations;

CREATE POLICY "orgs_select_member" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT public.user_organization_ids())
    OR owner_id = (SELECT auth.uid())
  );
