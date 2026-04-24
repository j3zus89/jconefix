-- Cobros de reparación: visibilidad por organization_id en la propia fila.
-- Sin esto, un usuario del taller que no sea shop_owner_id del pago depende de
-- EXISTS (factura/ticket). Con invoice_id NULL (cobro antes de enlazar factura) y
-- subconsulta sobre repair_tickets sujeta a otra RLS, el agregado del dashboard puede quedar en 0
-- aunque los tickets se vean en la lista.

UPDATE public.payments p
SET organization_id = t.organization_id
FROM public.repair_tickets t
WHERE p.ticket_id = t.id
  AND p.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can only see their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can only insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can only update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can only delete their own payments" ON public.payments;

CREATE POLICY "Users can only see their own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (
      payments.organization_id IS NOT NULL
      AND user_belongs_to_org(payments.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND (
          i.shop_owner_id = auth.uid()
          OR (i.organization_id IS NOT NULL AND user_belongs_to_org(i.organization_id))
        )
    )
    OR (
      payments.ticket_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.repair_tickets t
        WHERE t.id = payments.ticket_id
          AND (
            (t.organization_id IS NOT NULL AND user_belongs_to_org(t.organization_id))
            OR t.user_id = auth.uid()
          )
      )
    )
  );

CREATE POLICY "Users can only insert their own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (
      payments.organization_id IS NOT NULL
      AND user_belongs_to_org(payments.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND (
          i.shop_owner_id = auth.uid()
          OR (i.organization_id IS NOT NULL AND user_belongs_to_org(i.organization_id))
        )
    )
    OR (
      payments.ticket_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.repair_tickets t
        WHERE t.id = payments.ticket_id
          AND (
            (t.organization_id IS NOT NULL AND user_belongs_to_org(t.organization_id))
            OR t.user_id = auth.uid()
          )
      )
    )
  );

CREATE POLICY "Users can only update their own payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (
      payments.organization_id IS NOT NULL
      AND user_belongs_to_org(payments.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND (
          i.shop_owner_id = auth.uid()
          OR (i.organization_id IS NOT NULL AND user_belongs_to_org(i.organization_id))
        )
    )
    OR (
      payments.ticket_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.repair_tickets t
        WHERE t.id = payments.ticket_id
          AND (
            (t.organization_id IS NOT NULL AND user_belongs_to_org(t.organization_id))
            OR t.user_id = auth.uid()
          )
      )
    )
  )
  WITH CHECK (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (
      payments.organization_id IS NOT NULL
      AND user_belongs_to_org(payments.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND (
          i.shop_owner_id = auth.uid()
          OR (i.organization_id IS NOT NULL AND user_belongs_to_org(i.organization_id))
        )
    )
    OR (
      payments.ticket_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.repair_tickets t
        WHERE t.id = payments.ticket_id
          AND (
            (t.organization_id IS NOT NULL AND user_belongs_to_org(t.organization_id))
            OR t.user_id = auth.uid()
          )
      )
    )
  );

CREATE POLICY "Users can only delete their own payments"
  ON public.payments FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR shop_owner_id = auth.uid()
    OR (
      payments.organization_id IS NOT NULL
      AND user_belongs_to_org(payments.organization_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND (
          i.shop_owner_id = auth.uid()
          OR (i.organization_id IS NOT NULL AND user_belongs_to_org(i.organization_id))
        )
    )
    OR (
      payments.ticket_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.repair_tickets t
        WHERE t.id = payments.ticket_id
          AND (
            (t.organization_id IS NOT NULL AND user_belongs_to_org(t.organization_id))
            OR t.user_id = auth.uid()
          )
      )
    )
  );

COMMENT ON TABLE public.payments IS 'Cobros (taller/POS). RLS: dueño del pago, organization_id del cobro, factura visible, o ticket de reparación en alcance.';
