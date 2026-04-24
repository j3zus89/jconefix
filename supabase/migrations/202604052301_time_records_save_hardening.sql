-- Refuerzo: que los fichajes se guarden siempre vía clock_punch y consultas rápidas por técnico/fecha.
-- Ejecutar después de 202604052300_time_records_clock_pin.sql

-- El insert dentro de clock_punch no debe chocar con RLS (PG15+).
DO $do$
BEGIN
    ALTER FUNCTION public.clock_punch(UUID, TEXT, TEXT, TEXT) SET row_security = off;
EXCEPTION
    WHEN undefined_function THEN
        RAISE NOTICE 'clock_punch no existe aún: aplica antes 202604052300_time_records_clock_pin.sql';
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo SET row_security en clock_punch: %', SQLERRM;
END $do$;

-- Consultas del reloj: últimos registros por empleado y momento
CREATE INDEX IF NOT EXISTS idx_time_records_tech_ts_desc
    ON public.time_records (technician_id, "timestamp" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_time_records_ts_desc
    ON public.time_records ("timestamp" DESC);

-- Garantizar columna hora del evento siempre rellena
UPDATE public.time_records SET "timestamp" = NOW() WHERE "timestamp" IS NULL;

DO $do$
BEGIN
    ALTER TABLE public.time_records ALTER COLUMN "timestamp" SET DEFAULT NOW();
EXCEPTION WHEN undefined_column THEN
    RAISE NOTICE 'Columna timestamp ausente: ejecuta 202604052300 primero';
END $do$;

DO $do$
BEGIN
    ALTER TABLE public.time_records ALTER COLUMN "timestamp" SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'timestamp NOT NULL omitido: %', SQLERRM;
END $do$;

-- Permitir corregir nota / correcciones menores desde el panel
DROP POLICY IF EXISTS "time_records_update_org" ON public.time_records;

CREATE POLICY "time_records_update_org"
    ON public.time_records FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    );
