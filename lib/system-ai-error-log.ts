import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const MAX_MSG = 2000;

export async function logSystemAiError(params: {
  userId: string;
  organizationId: string | null;
  source: string;
  httpStatus: number | null;
  providerMessage: string | null;
  model?: string | null;
  extra?: Record<string, unknown> | null;
}): Promise<void> {
  if (!SUPABASE_URL.trim() || !SERVICE_KEY.trim()) return;
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const msg = (params.providerMessage ?? '').trim().slice(0, MAX_MSG);
    await admin.from('system_ai_error_logs').insert({
      user_id: params.userId,
      organization_id: params.organizationId,
      source: params.source.slice(0, 120),
      http_status: params.httpStatus,
      provider_message: msg || null,
      model: params.model?.trim()?.slice(0, 120) || null,
      extra: params.extra ?? null,
    });
  } catch (e) {
    console.error('[system-ai-error-log] insert falló:', e);
  }
}
