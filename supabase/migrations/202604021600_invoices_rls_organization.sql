-- Facturas: mismo modelo dual que repair_tickets (legacy shop_owner_id + organization_id).
-- Miembros activos de la organización ven y gestionan facturas de su org.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id
  ON public.invoices(organization_id)
  WHERE organization_id IS NOT NULL;

COMMENT ON COLUMN public.invoices.organization_id IS 'Organización del taller; RLS compartido con el equipo (user_belongs_to_org).';

-- Rellenar org desde ticket vinculado (preferente) o perfil del shop_owner.
UPDATE public.invoices i
SET organization_id = rt.organization_id
FROM public.repair_tickets rt
WHERE i.ticket_id = rt.id
  AND rt.organization_id IS NOT NULL
  AND i.organization_id IS NULL;

UPDATE public.invoices i
SET organization_id = p.organization_id
FROM public.profiles p
WHERE i.shop_owner_id = p.id
  AND p.organization_id IS NOT NULL
  AND i.organization_id IS NULL;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can only see their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can only insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can only update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can only delete their own invoices" ON public.invoices;

CREATE POLICY "Users can only see their own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

CREATE POLICY "Users can only insert their own invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

CREATE POLICY "Users can only update their own invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  )
  WITH CHECK (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

CREATE POLICY "Users can only delete their own invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- ---------------------------------------------------------------------------
-- invoice_items (acceso vía factura padre)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can only see their own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can only insert their own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can only update their own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can only delete their own invoice items" ON public.invoice_items;

CREATE POLICY "Users can only see their own invoice items"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (
          is_super_admin()
          OR inv.shop_owner_id = auth.uid()
          OR (inv.organization_id IS NOT NULL AND user_belongs_to_org(inv.organization_id))
        )
    )
  );

CREATE POLICY "Users can only insert their own invoice items"
  ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (
          is_super_admin()
          OR inv.shop_owner_id = auth.uid()
          OR (inv.organization_id IS NOT NULL AND user_belongs_to_org(inv.organization_id))
        )
    )
  );

CREATE POLICY "Users can only update their own invoice items"
  ON public.invoice_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (
          is_super_admin()
          OR inv.shop_owner_id = auth.uid()
          OR (inv.organization_id IS NOT NULL AND user_belongs_to_org(inv.organization_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (
          is_super_admin()
          OR inv.shop_owner_id = auth.uid()
          OR (inv.organization_id IS NOT NULL AND user_belongs_to_org(inv.organization_id))
        )
    )
  );

CREATE POLICY "Users can only delete their own invoice items"
  ON public.invoice_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (
          is_super_admin()
          OR inv.shop_owner_id = auth.uid()
          OR (inv.organization_id IS NOT NULL AND user_belongs_to_org(inv.organization_id))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- payments (visibilidad alineada con la factura)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can only see their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can only insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can only update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can only delete their own payments" ON public.payments;

CREATE POLICY "Users can only see their own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND i.organization_id IS NOT NULL
        AND user_belongs_to_org(i.organization_id)
    )
  );

CREATE POLICY "Users can only insert their own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND i.organization_id IS NOT NULL
        AND user_belongs_to_org(i.organization_id)
    )
  );

CREATE POLICY "Users can only update their own payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND i.organization_id IS NOT NULL
        AND user_belongs_to_org(i.organization_id)
    )
  )
  WITH CHECK (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND i.organization_id IS NOT NULL
        AND user_belongs_to_org(i.organization_id)
    )
  );

CREATE POLICY "Users can only delete their own payments"
  ON public.payments FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND i.organization_id IS NOT NULL
        AND user_belongs_to_org(i.organization_id)
    )
  );
