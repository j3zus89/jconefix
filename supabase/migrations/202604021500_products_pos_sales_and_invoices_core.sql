-- Productos / repuestos (UI usa public.products; antes no existía la tabla).
-- Facturación base (por si migraciones anteriores no se aplicaron en el proyecto remoto).
-- Ventas POS mínimas para historial.

-- ---------------------------------------------------------------------------
-- invoices (idempotente)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
    ticket_id UUID REFERENCES repair_tickets(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    ticket_id UUID REFERENCES repair_tickets(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    notes TEXT,
    reference_number VARCHAR(100),
    paid_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_invoices_shop_owner ON invoices(shop_owner_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can only insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can only update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can only delete their own invoices" ON invoices;

CREATE POLICY "Users can only see their own invoices"
    ON invoices FOR SELECT TO authenticated
    USING (shop_owner_id = auth.uid());

CREATE POLICY "Users can only insert their own invoices"
    ON invoices FOR INSERT TO authenticated
    WITH CHECK (shop_owner_id = auth.uid());

CREATE POLICY "Users can only update their own invoices"
    ON invoices FOR UPDATE TO authenticated
    USING (shop_owner_id = auth.uid());

CREATE POLICY "Users can only delete their own invoices"
    ON invoices FOR DELETE TO authenticated
    USING (shop_owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can only see their own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can only insert their own invoice items" ON invoice_items;

CREATE POLICY "Users can only see their own invoice items"
    ON invoice_items FOR SELECT TO authenticated
    USING (invoice_id IN (SELECT id FROM invoices WHERE shop_owner_id = auth.uid()));

CREATE POLICY "Users can only insert their own invoice items"
    ON invoice_items FOR INSERT TO authenticated
    WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE shop_owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can only see their own payments" ON payments;
DROP POLICY IF EXISTS "Users can only insert their own payments" ON payments;

CREATE POLICY "Users can only see their own payments"
    ON payments FOR SELECT TO authenticated
    USING (shop_owner_id = auth.uid());

CREATE POLICY "Users can only insert their own payments"
    ON payments FOR INSERT TO authenticated
    WITH CHECK (shop_owner_id = auth.uid());

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoices;
CREATE TRIGGER trigger_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- ---------------------------------------------------------------------------
-- products (repuestos avanzados en UI)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    product_id TEXT,
    name TEXT NOT NULL,
    sku TEXT DEFAULT '',
    upc TEXT DEFAULT '',
    category TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    condition TEXT DEFAULT 'New',
    quantity INTEGER DEFAULT 0,
    stock_warning INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    price NUMERIC(12, 2) DEFAULT 0,
    unit_cost NUMERIC(12, 2) DEFAULT 0,
    supplier TEXT DEFAULT '',
    imei TEXT DEFAULT '',
    serial TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_own_or_org" ON products;
DROP POLICY IF EXISTS "products_insert_own_or_org" ON products;
DROP POLICY IF EXISTS "products_update_own_or_org" ON products;
DROP POLICY IF EXISTS "products_delete_own_or_org" ON products;

CREATE POLICY "products_select_own_or_org"
    ON products FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "products_insert_own_or_org"
    ON products FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "products_update_own_or_org"
    ON products FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "products_delete_own_or_org"
    ON products FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

-- ---------------------------------------------------------------------------
-- pos_sales (historial de ventas POS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_user ON pos_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created ON pos_sales(created_at DESC);

ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_sales_select" ON pos_sales;
DROP POLICY IF EXISTS "pos_sales_insert" ON pos_sales;

CREATE POLICY "pos_sales_select"
    ON pos_sales FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "pos_sales_insert"
    ON pos_sales FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Proveedores / compras / transferencias (menús del sidebar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers(user_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_mutate" ON suppliers;

CREATE POLICY "suppliers_select"
    ON suppliers FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "suppliers_mutate"
    ON suppliers FOR ALL TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    supplier_name TEXT,
    reference TEXT,
    status TEXT DEFAULT 'abierta',
    notes TEXT,
    total NUMERIC(12, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_user ON purchase_orders(user_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_mutate" ON purchase_orders;

CREATE POLICY "purchase_orders_select"
    ON purchase_orders FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "purchase_orders_mutate"
    ON purchase_orders FOR ALL TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    from_location TEXT,
    to_location TEXT,
    status TEXT DEFAULT 'pendiente',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_user ON inventory_transfers(user_id);

ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_transfers_select" ON inventory_transfers;
DROP POLICY IF EXISTS "inventory_transfers_mutate" ON inventory_transfers;

CREATE POLICY "inventory_transfers_select"
    ON inventory_transfers FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );

CREATE POLICY "inventory_transfers_mutate"
    ON inventory_transfers FOR ALL TO authenticated
    USING (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    );
