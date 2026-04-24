-- Archivos adjuntos en pestaña del ticket (además de fotos pre/post reparación).
ALTER TABLE public.ticket_images
DROP CONSTRAINT IF EXISTS ticket_images_image_type_check;

ALTER TABLE public.ticket_images
ADD CONSTRAINT ticket_images_image_type_check
CHECK (image_type IN ('pre_repair', 'post_repair', 'attachment'));
