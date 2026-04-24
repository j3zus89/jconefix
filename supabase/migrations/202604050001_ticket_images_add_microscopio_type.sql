-- Allow 'microscopio' as a valid image_type for microscope captures.
-- The original CHECK only permitted 'pre_repair' and 'post_repair'.
-- A later migration already added 'attachment'; we add 'microscopio' here.

ALTER TABLE public.ticket_images
  DROP CONSTRAINT IF EXISTS ticket_images_image_type_check;

ALTER TABLE public.ticket_images
  ADD CONSTRAINT ticket_images_image_type_check
    CHECK (image_type IN ('pre_repair', 'post_repair', 'attachment', 'microscopio'));

COMMENT ON COLUMN public.ticket_images.image_type IS
  'Tipo de imagen: pre_repair | post_repair | attachment | microscopio';
