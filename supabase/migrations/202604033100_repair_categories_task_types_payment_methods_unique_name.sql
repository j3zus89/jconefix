-- Evita duplicados al sembrar listas desde el panel (carreras / doble mount).
-- Conserva la fila con id lexicográficamente menor por (user_id, name).

DELETE FROM public.repair_categories c1
USING public.repair_categories c2
WHERE c1.user_id IS NOT DISTINCT FROM c2.user_id
  AND c1.name = c2.name
  AND c1.id::text > c2.id::text;

DELETE FROM public.task_types t1
USING public.task_types t2
WHERE t1.user_id IS NOT DISTINCT FROM t2.user_id
  AND t1.name = t2.name
  AND t1.id::text > t2.id::text;

DELETE FROM public.payment_methods p1
USING public.payment_methods p2
WHERE p1.user_id IS NOT DISTINCT FROM p2.user_id
  AND p1.name = p2.name
  AND p1.id::text > p2.id::text;

CREATE UNIQUE INDEX IF NOT EXISTS repair_categories_user_id_name_key
  ON public.repair_categories (user_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS task_types_user_id_name_key
  ON public.task_types (user_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_user_id_name_key
  ON public.payment_methods (user_id, name);
