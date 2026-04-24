-- =============================================================================
-- LIMPIEZA MANUAL: organization_members (solo correos indicados conservan filas)
-- =============================================================================
-- Ejecuta en Supabase → SQL Editor cuando quieras vaciar membresías de prueba.
-- NO es migración automática: revisa y ajusta correos antes de lanzar.
--
-- Conserva usuarios:
--   - Super admin (misma lista que lib/auth/super-admin-allowlist.ts)
--   - Erico: por defecto la parte local del email es exactamente "erico"
--     (ej. erico@gmail.com). Si usa otro alias, cambia la condición OR.
--
-- Tras el DELETE, puede quedar organizaciones sin filas en organization_members;
-- revisa organizations y borra or huérfanas si lo necesitas.
-- =============================================================================

BEGIN;

-- 1) Inspección (opcional): cuántas filas se borrarían
-- SELECT om.*, u.email
-- FROM organization_members om
-- JOIN auth.users u ON u.id = om.user_id
-- WHERE om.user_id NOT IN (
--   SELECT id FROM auth.users
--   WHERE lower(trim(email)) IN (
--     'sr.gonzalezcala@gmail.com',
--     'sr.gonzalezcala89@gmail.com'
--   )
--   OR split_part(lower(trim(email)), '@', 1) = 'erico'
-- );

DELETE FROM organization_members om
WHERE user_id NOT IN (
  SELECT id FROM auth.users
  WHERE lower(trim(email)) IN (
    'sr.gonzalezcala@gmail.com',
    'sr.gonzalezcala89@gmail.com'
  )
  OR split_part(lower(trim(email)), '@', 1) = 'erico'
);

COMMIT;

-- Comprobación rápida
-- SELECT u.email, om.organization_id, om.role FROM organization_members om
-- JOIN auth.users u ON u.id = om.user_id;
