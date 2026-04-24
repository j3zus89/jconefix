-- ============================================
-- TABLAS DE FACTURACIÓN - JC ONE FIX
-- Fecha: 31 Marzo 2026
-- ============================================

-- Tabla de facturas
CREATE TABLE IF NOT EXISTS invoices (
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
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, sent, paid, cancelled
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, partial, paid
    payment_method VARCHAR(50), -- cash, card, transfer
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de líneas de factura
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    ticket_id UUID REFERENCES repair_tickets(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- cash, card, transfer
    notes TEXT,
    reference_number VARCHAR(100),
    paid_by VARCHAR(255)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoices_shop_owner ON invoices(shop_owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_ticket ON invoices(ticket_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- RLS Policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can only insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can only update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can only delete their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can only see their own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can only insert their own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can only see their own payments" ON payments;
DROP POLICY IF EXISTS "Users can only insert their own payments" ON payments;

CREATE POLICY "Users can only see their own invoices"
    ON invoices FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only insert their own invoices"
    ON invoices FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "Users can only update their own invoices"
    ON invoices FOR UPDATE USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only delete their own invoices"
    ON invoices FOR DELETE USING (shop_owner_id = auth.uid());

CREATE POLICY "Users can only see their own invoice items"
    ON invoice_items FOR SELECT USING (invoice_id IN (SELECT id FROM invoices WHERE shop_owner_id = auth.uid()));
CREATE POLICY "Users can only insert their own invoice items"
    ON invoice_items FOR INSERT WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE shop_owner_id = auth.uid()));

CREATE POLICY "Users can only see their own payments"
    ON payments FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only insert their own payments"
    ON payments FOR INSERT WITH CHECK (shop_owner_id = auth.uid());

-- Función para generar número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-generar número de factura
DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoices;
CREATE TRIGGER trigger_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();
