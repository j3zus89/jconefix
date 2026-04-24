-- Resolver organización activa desde el cliente aunque RLS oculte filas en organization_members.
-- La función ya es STABLE SECURITY DEFINER; PostgREST solo la expone si authenticated puede ejecutarla.

GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
