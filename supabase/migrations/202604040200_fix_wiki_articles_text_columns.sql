-- ─────────────────────────────────────────────────────────────────────────────
-- Corrige wiki_articles si title/content/category quedaron como json/jsonb
-- (INSERT con texto plano falla con: invalid input syntax for type json)
-- Ejecuta ESTO en Supabase ANTES del seed_wiki_articles.sql si te salió ese error.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  dt text;
BEGIN
  -- title
  SELECT c.data_type INTO dt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'wiki_articles' AND c.column_name = 'title';
  IF dt IN ('jsonb', 'json') THEN
    EXECUTE $sql$
      ALTER TABLE public.wiki_articles
        ALTER COLUMN title TYPE text USING (
          CASE
            WHEN title IS NULL THEN NULL
            WHEN jsonb_typeof(title::jsonb) = 'string' THEN (title::jsonb) #>> '{}'
            ELSE (title::jsonb)::text
          END
        );
    $sql$;
  END IF;

  -- content
  SELECT c.data_type INTO dt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'wiki_articles' AND c.column_name = 'content';
  IF dt IN ('jsonb', 'json') THEN
    EXECUTE $sql$
      ALTER TABLE public.wiki_articles
        ALTER COLUMN content TYPE text USING (
          CASE
            WHEN content IS NULL THEN NULL
            WHEN jsonb_typeof(content::jsonb) = 'string' THEN (content::jsonb) #>> '{}'
            ELSE (content::jsonb)::text
          END
        );
    $sql$;
  END IF;

  -- category
  SELECT c.data_type INTO dt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'wiki_articles' AND c.column_name = 'category';
  IF dt IN ('jsonb', 'json') THEN
    EXECUTE $sql$
      ALTER TABLE public.wiki_articles
        ALTER COLUMN category TYPE text USING (
          CASE
            WHEN category IS NULL THEN 'general'
            WHEN jsonb_typeof(category::jsonb) = 'string' THEN (category::jsonb) #>> '{}'
            ELSE COALESCE((category::jsonb)::text, 'general')
          END
        );
    $sql$;
  END IF;
END $$;

COMMENT ON TABLE public.wiki_articles IS
  'Artículos de conocimiento que el bot IA usa como contexto para responder soporte.';
