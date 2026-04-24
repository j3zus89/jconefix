-- =============================================================================
-- MASIVO: ENABLE + FORCE RLS en todas las tablas base de public + política default
-- =============================================================================
-- ⚠️  LÉEME ANTES DE EJECUTAR EN PRODUCCIÓN
-- 1) Este script NO sustituye el modelo multi‑usuario por organización de JC ONE FIX.
--    Muchas tablas usan organization_id + user_belongs_to_org(); otras ya tienen
--    políticas en migraciones (p. ej. 202604031000_security_hardening_rls_audit.sql).
-- 2) Para cada tabla: ENABLE RLS + FORCE RLS siempre.
-- 3) Política FOR ALL solo si la tabla NO tiene ya ninguna policy en pg_policies
--    (así no pisamos lo que ya definiste en migraciones).
-- 4) Si no hay policies previas, se intenta una columna “dueño” en este orden:
--      organization_id → organization_id IN (SELECT public.user_organization_ids())
--      user_id         → auth.uid() = user_id
--      shop_owner_id   → auth.uid() = shop_owner_id
--      owner_id        → auth.uid() = owner_id   (solo si no hay organization_id)
--    Si no aplica ninguna: se emite RAISE WARNING y NO se crea política (la tabla
--    quedaría bloqueada para authenticated hasta que agregues policies a mano).
-- 5) Requiere que exista public.user_organization_ids() (migración de hardening).
-- 6) service_role en Supabase suele ignorar RLS; el panel admin con service key sigue.
-- =============================================================================

DO $$
DECLARE
  r record;
  v_has_policies boolean;
  v_col text;
  v_using text;
  v_check text;
  v_policy text := 'zzz_mass_rls_default_all_authenticated';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'user_organization_ids'
  ) THEN
    RAISE EXCEPTION 'Falta public.user_organization_ids(). Aplicá antes la migración de security hardening (202604031000_...).';
  END IF;

  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname NOT LIKE 'pg\_%' ESCAPE '\'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tbl);

    SELECT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = r.tbl
    ) INTO v_has_policies;

    IF v_has_policies THEN
      RAISE NOTICE '[skip policy] % ya tiene policies existentes', r.tbl;
      CONTINUE;
    END IF;

    v_col := NULL;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'organization_id'
    ) THEN
      v_col := 'organization_id';
      v_using := 'organization_id IN (SELECT public.user_organization_ids())';
      v_check := v_using;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'user_id'
    ) THEN
      v_col := 'user_id';
      v_using := 'auth.uid() = user_id';
      v_check := v_using;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'shop_owner_id'
    ) THEN
      v_col := 'shop_owner_id';
      v_using := 'auth.uid() = shop_owner_id';
      v_check := v_using;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'owner_id'
    )
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'organization_id'
      )
    THEN
      v_col := 'owner_id';
      v_using := 'auth.uid() = owner_id';
      v_check := v_using;
    END IF;

    IF v_col IS NULL THEN
      RAISE WARNING '[sin política auto] %: sin organization_id / user_id / shop_owner_id / owner_id usable. Añadí policies manualmente.', r.tbl;
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, r.tbl);
    EXECUTE format(
      $f$
        CREATE POLICY %I ON public.%I
        FOR ALL
        TO authenticated
        USING (%s)
        WITH CHECK (%s)
      $f$,
      v_policy,
      r.tbl,
      v_using,
      v_check
    );

    RAISE NOTICE '[policy] % → columna % → expr: %', r.tbl, v_col, v_using;
  END LOOP;
END $$;
