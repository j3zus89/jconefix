-- Las políticas de 20260401002 / 202604025610 siguen en la BD si se aplicó
-- 202604031000 después: 031000 solo hace DROP de members_* y NO elimina
-- "Users can view members of their organizations" ni las de Owners/admins.
-- Esa política antigua hace EXISTS(SELECT … organization_members) y provoca
-- recursión infinita aunque user_organization_ids() tenga row_security off.
--
-- Requiere que existan las políticas members_* de 202604031000.

DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON public.organization_members;
