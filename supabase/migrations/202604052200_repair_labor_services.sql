-- Precios de mano de obra por tipo de reparación (por categoría / marca / modelo).
-- Panel: Inventario → Servicio de reparación
--
-- Si ves "Could not find the table repair_labor_services": ejecuta este archivo en
-- Supabase → SQL Editor, o `supabase db push` desde la carpeta del proyecto.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.repair_labor_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT '',
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    service_name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    show_in_widget BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_repair_labor_services_org_created
    ON public.repair_labor_services (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_repair_labor_services_user_created
    ON public.repair_labor_services (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_repair_labor_services_org_category
    ON public.repair_labor_services (organization_id, lower(category));

CREATE INDEX IF NOT EXISTS idx_repair_labor_services_org_brand
    ON public.repair_labor_services (organization_id, lower(brand));

COMMENT ON TABLE public.repair_labor_services IS
    'Precios de mano de obra por servicio de reparación (taller).';

ALTER TABLE public.repair_labor_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repair_labor_services_select" ON public.repair_labor_services;
DROP POLICY IF EXISTS "repair_labor_services_mutate" ON public.repair_labor_services;

CREATE POLICY "repair_labor_services_select"
    ON public.repair_labor_services FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    );

CREATE POLICY "repair_labor_services_mutate"
    ON public.repair_labor_services FOR ALL TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    );

DROP TRIGGER IF EXISTS update_repair_labor_services_updated_at ON public.repair_labor_services;
CREATE TRIGGER update_repair_labor_services_updated_at
    BEFORE UPDATE ON public.repair_labor_services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column ();
