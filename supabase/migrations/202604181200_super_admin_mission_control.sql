-- Logs de fallos de IA (super admin) + agregado de pulidos por org (cuotas mensuales).

CREATE TABLE IF NOT EXISTS public.system_ai_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'improve_diagnosis',
  http_status int,
  provider_message text,
  model text,
  extra jsonb
);

CREATE INDEX IF NOT EXISTS idx_system_ai_error_logs_created
  ON public.system_ai_error_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_ai_error_logs_org_created
  ON public.system_ai_error_logs (organization_id, created_at DESC);

ALTER TABLE public.system_ai_error_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.system_ai_error_logs IS
  'Fallos de llamadas a IA (p. ej. Groq) para diagnóstico del super admin; inserta solo el servidor (service role).';

-- Sin políticas para authenticated: solo service role insert/select desde APIs admin.

CREATE OR REPLACE FUNCTION public.get_polish_counts_by_org_since(p_since timestamptz)
RETURNS TABLE (organization_id uuid, call_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id, COUNT(*)::bigint AS call_count
  FROM public.polish_gemini_calls p
  INNER JOIN public.organization_members om
    ON om.user_id = p.user_id AND om.is_active = true
  WHERE p.created_at >= p_since
  GROUP BY om.organization_id;
$$;

REVOKE ALL ON FUNCTION public.get_polish_counts_by_org_since(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_polish_counts_by_org_since(timestamptz) TO service_role;
