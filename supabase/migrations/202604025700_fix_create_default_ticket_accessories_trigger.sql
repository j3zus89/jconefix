-- Trigger create_default_ticket_accessories: repair_tickets solo tiene user_id (dueño legado),
-- nunca tuvo shop_owner_id. NEW.shop_owner_id fallaba al crear ticket.

CREATE OR REPLACE FUNCTION public.create_default_ticket_accessories()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.ticket_accessories (ticket_id, shop_owner_id)
  VALUES (NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$;
