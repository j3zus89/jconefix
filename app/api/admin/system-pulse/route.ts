import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_KEY = process.env.GROQ_POLISH_API_KEY?.trim() ?? '';
const GEMINI_KEY = process.env.GEMINI_API_KEY?.trim() ?? '';

const PROBE_TIMEOUT_MS = 6000;

async function timedFetch(url: string, init: RequestInit): Promise<{ ok: boolean; ms: number; status: number; detail?: string }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    const ms = Math.round(performance.now() - t0);
    let detail: string | undefined;
    if (!res.ok) {
      try {
        const j = await res.json();
        detail = typeof j?.error?.message === 'string' ? j.error.message : res.statusText;
      } catch {
        detail = res.statusText;
      }
    }
    return { ok: res.ok, ms, status: res.status, detail };
  } catch (e: unknown) {
    const ms = Math.round(performance.now() - t0);
    const msg = e instanceof Error ? e.message : 'Error de red';
    return { ok: false, ms, status: 0, detail: msg };
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  }

  const groqConfigured = !!GROQ_KEY;
  const geminiConfigured = !!GEMINI_KEY;

  const groqPromise = groqConfigured
    ? timedFetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${GROQ_KEY}` },
      })
    : Promise.resolve({ ok: false, ms: 0, status: 0, detail: 'Sin GROQ_POLISH_API_KEY' });

  const geminiPromise = geminiConfigured
    ? timedFetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(GEMINI_KEY)}`,
        { method: 'GET' }
      )
    : Promise.resolve({ ok: false, ms: 0, status: 0, detail: 'Sin GEMINI_API_KEY' });

  let supabaseProbe: { ok: boolean; ms: number; detail?: string } = { ok: false, ms: 0, detail: 'Sin configuración' };
  let polishCallsToday: number | null = null;

  if (SUPABASE_URL && SERVICE_KEY) {
    const t0 = performance.now();
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.from('organizations').select('id').limit(1);
    supabaseProbe = {
      ok: !error,
      ms: Math.round(performance.now() - t0),
      detail: error?.message,
    };

    const startUtc = new Date();
    startUtc.setUTCHours(0, 0, 0, 0);
    const { count, error: cErr } = await admin
      .from('polish_gemini_calls')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startUtc.toISOString());
    if (!cErr && typeof count === 'number') {
      polishCallsToday = count;
    }
  }

  const [groq, gemini] = await Promise.all([groqPromise, geminiPromise]);

  return NextResponse.json(
    {
      data: {
        groq: {
          configured: groqConfigured,
          ok: groqConfigured ? groq.ok : null,
          ms: groqConfigured ? groq.ms : null,
          status: groqConfigured ? groq.status : null,
          detail: groq.detail,
        },
        gemini: {
          configured: geminiConfigured,
          ok: geminiConfigured ? gemini.ok : null,
          ms: geminiConfigured ? gemini.ms : null,
          status: geminiConfigured ? gemini.status : null,
          detail: gemini.detail,
        },
        supabase: supabaseProbe,
        polish_calls_today: polishCallsToday,
        last_updated: new Date().toISOString(),
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
