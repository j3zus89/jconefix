-- IVA opcional en ticket: el importe guardado es la base; solo si apply_iva = true se suma 21% al total (Facturación + impreso).
ALTER TABLE public.repair_tickets
ADD COLUMN IF NOT EXISTS apply_iva boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.repair_tickets.apply_iva IS 'Si es true, estimated/final_cost es base imponible y el total incluye IVA 21%. Si es false (por defecto), el total mostrado es ese importe sin sumar IVA.';
