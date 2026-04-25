-- Tabla de categorías de productos para inventario
-- Permite organizar productos por categorías personalizables

CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_categories_user_id ON product_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_organization_id ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON product_categories(sort_order);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_categories_updated_at ON product_categories;
CREATE TRIGGER trigger_update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_product_categories_updated_at();

-- RLS (Row Level Security)
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_select" ON product_categories;
DROP POLICY IF EXISTS "product_categories_insert" ON product_categories;
DROP POLICY IF EXISTS "product_categories_update" ON product_categories;
DROP POLICY IF EXISTS "product_categories_delete" ON product_categories;

CREATE POLICY "product_categories_select"
    ON product_categories FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "product_categories_insert"
    ON product_categories FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "product_categories_update"
    ON product_categories FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "product_categories_delete"
    ON product_categories FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

-- Datos iniciales por defecto (solo si la tabla está vacía)
INSERT INTO public.product_categories (name, description, sort_order)
SELECT * FROM (VALUES
    ('Smartphones', 'Teléfonos móviles y smartphones', 1),
    ('Tablets', 'Tablets e iPads', 2),
    ('Laptops', 'Computadoras portátiles', 3),
    ('Accesorios', 'Accesorios generales', 4),
    ('Repuestos', 'Repuestos y piezas de repuesto', 5),
    ('Cables', 'Cables y conectores', 6),
    ('Fundas', 'Fundas y protectores', 7),
    ('Cargadores', 'Cargadores y adaptadores', 8)
) AS v(name, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.product_categories LIMIT 1);
