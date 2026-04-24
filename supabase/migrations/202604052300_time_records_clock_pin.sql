-- Fichaje: registros por técnico, PIN, descansos y notas.
-- UI: /dashboard/clock

ALTER TABLE public.technicians
    ADD COLUMN IF NOT EXISTS clock_pin TEXT;

COMMENT ON COLUMN public.technicians.clock_pin IS
    'PIN numérico/texto para fichar en el reloj del taller; NULL o vacío = no exige PIN.';

CREATE TABLE IF NOT EXISTS public.time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'break_start', 'break_end')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_time_records_user_created
    ON public.time_records (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_records_org_created
    ON public.time_records (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_records_technician_created
    ON public.time_records (technician_id, created_at DESC);

-- Si time_records ya existía en el proyecto con menos columnas:
ALTER TABLE public.time_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.time_records ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL;
ALTER TABLE public.time_records ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.time_records ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ DEFAULT NOW();

UPDATE public.time_records
SET "timestamp" = COALESCE("timestamp", created_at)
WHERE "timestamp" IS NULL AND created_at IS NOT NULL;

-- Ampliar tipos de fichaje si la tabla ya existía solo con entrada/salida:
ALTER TABLE public.time_records DROP CONSTRAINT IF EXISTS time_records_type_check;
ALTER TABLE public.time_records
    ADD CONSTRAINT time_records_type_check CHECK (type IN ('in', 'out', 'break_start', 'break_end'));

ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_records_select_org" ON public.time_records;
DROP POLICY IF EXISTS "time_records_insert_org" ON public.time_records;
DROP POLICY IF EXISTS "time_records_delete_org" ON public.time_records;

CREATE POLICY "time_records_select_org"
    ON public.time_records FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    );

CREATE POLICY "time_records_insert_org"
    ON public.time_records FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND (
            organization_id IS NULL
            OR public.user_belongs_to_org(organization_id)
        )
    );

CREATE POLICY "time_records_delete_org"
    ON public.time_records FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    );

-- Fichaje con validación de PIN en servidor (no exponer clock_pin al cliente).
CREATE OR REPLACE FUNCTION public.clock_punch(
    p_technician_id UUID,
    p_type TEXT,
    p_pin TEXT DEFAULT '',
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tech RECORD;
    v_uid UUID := auth.uid();
    v_pin_ok BOOLEAN;
    v_org UUID;
    v_new_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
    END IF;

    IF p_type NOT IN ('in', 'out', 'break_start', 'break_end') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_type');
    END IF;

    IF p_technician_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'technician_required');
    END IF;

    SELECT t.* INTO v_tech
    FROM public.technicians t
    WHERE t.id = p_technician_id
      AND t.is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'technician_not_found');
    END IF;

    IF NOT (
        v_uid = v_tech.shop_owner_id
        OR (v_tech.organization_id IS NOT NULL AND public.user_belongs_to_org(v_tech.organization_id))
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
    END IF;

    v_pin_ok :=
        v_tech.clock_pin IS NULL
        OR trim(v_tech.clock_pin) = ''
        OR trim(v_tech.clock_pin) = trim(coalesce(p_pin, ''));

    IF NOT v_pin_ok THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bad_pin');
    END IF;

    v_org := v_tech.organization_id;

    INSERT INTO public.time_records (
        user_id,
        organization_id,
        technician_id,
        type,
        timestamp,
        note
    ) VALUES (
        v_uid,
        v_org,
        p_technician_id,
        p_type,
        NOW(),
        NULLIF(trim(p_note), '')
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('ok', true, 'id', v_new_id::text);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.clock_punch(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clock_punch(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.clock_punch IS
    'Registra fichaje (entrada/salida/descanso) validando PIN del técnico sin exponerlo al cliente.';
