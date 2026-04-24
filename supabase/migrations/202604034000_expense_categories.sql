-- Categorías de gastos por organización + columna organization_id en expenses (alineada con RLS org).

-- ─── expenses.organization_id ────────────────────────────────────────────────
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_organization_id
  ON public.expenses (organization_id)
  WHERE organization_id IS NOT NULL;

UPDATE public.expenses e
SET organization_id = p.organization_id
FROM public.profiles p
WHERE e.user_id = p.id
  AND p.organization_id IS NOT NULL
  AND e.organization_id IS NULL;

COMMENT ON COLUMN public.expenses.organization_id IS 'Organización del gasto; RLS por user_organization_ids().';

-- ─── expense_categories ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expense_categories_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_org_sort
  ON public.expense_categories (organization_id, sort_order, name);

COMMENT ON TABLE public.expense_categories IS 'Categorías editables para gastos del taller (por organización).';

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_categories_select" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_insert" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_update" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_delete" ON public.expense_categories;

CREATE POLICY "expense_categories_select"
  ON public.expense_categories FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "expense_categories_insert"
  ON public.expense_categories FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "expense_categories_update"
  ON public.expense_categories FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  )
  WITH CHECK (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "expense_categories_delete"
  ON public.expense_categories FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
