-- Pagos de reparación: la política anterior solo exponía filas vía factura con organization_id NOT NULL.
-- Eso excluía cobros con factura solo en shop_owner_id, o pagos insertados antes de enlazar factura,
-- y rompía el agregado del dashboard para el equipo / dueño del taller.

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

COMMENT ON TABLE public.payments IS 'Cobros (taller/POS). RLS: dueño del pago, factura visible, o ticket de reparación en el alcance del usuario.';
