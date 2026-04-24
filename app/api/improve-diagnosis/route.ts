import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClientFromRequest } from '@/lib/supabase/server';
import { logSystemAiError } from '@/lib/system-ai-error-log';
import { readPolishMonthlyLimitFromOrgSettings } from '@/lib/org-polish-quota';

/**
 * «Pulir con IA» vía Groq (OpenAI-compatible). Env:
 *
 * - GROQ_POLISH_API_KEY (obligatoria; clave tipo gsk_… de console.groq.com)
 * - GROQ_POLISH_MODEL (default llama-3.3-70b-versatile)
 * - GROQ_POLISH_FALLBACK_MODEL (default llama-3.1-8b-instant; solo si ≠ principal y no es 429 de cuota)
 *
 * Cuerpo JSON opcional: `style: "whatsapp"` → prompt breve para mensajes al cliente (resto = diagnóstico/taller).
 *
 * Cuotas panel (tabla legacy `polish_gemini_calls`):
 * POLISH_GEMINI_MAX_PER_USER_PER_HOUR (25), POLISH_GEMINI_MAX_PER_USER_PER_DAY (100),
 * POLISH_GEMINI_MIN_INTERVAL_SEC (15), POLISH_GEMINI_MAX_GLOBAL_PER_MINUTE (10); 0 = sin tope en ese eje.
 */

const GROQ_POLISH_API_KEY = process.env.GROQ_POLISH_API_KEY ?? '';
const GROQ_POLISH_MODEL = process.env.GROQ_POLISH_MODEL?.trim() || 'llama-3.3-70b-versatile';
const GROQ_POLISH_FALLBACK_MODEL =
  process.env.GROQ_POLISH_FALLBACK_MODEL?.trim() || 'llama-3.1-8b-instant';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const POLISH_MAX_PER_HOUR = envInt('POLISH_GEMINI_MAX_PER_USER_PER_HOUR', 25);
const POLISH_MAX_PER_DAY = envInt('POLISH_GEMINI_MAX_PER_USER_PER_DAY', 100);
const POLISH_MIN_INTERVAL_MS = envInt('POLISH_GEMINI_MIN_INTERVAL_SEC', 15) * 1000;
const POLISH_MAX_GLOBAL_PER_MINUTE = envInt('POLISH_GEMINI_MAX_GLOBAL_PER_MINUTE', 10);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const SYSTEM_PROMPT = `Eres un Técnico Líder de Taller. Transformas notas breves de un compañero en un texto listo para el cliente o la orden: directo, de taller, sin postureo.

TONO:
- Directo, serio y técnico. Ortografía y tildes impecables.
- Sin palabras «elegantes» ni redacción rebuscada; suena a quien trabaja en el banco, no a folleto comercial.

LENGUAJE DE TALLER (preferir esto frente a frases finas):
- No digas «condición de cortocircuito»; di «corto en la etapa primaria» (solo si el técnico habló de corto / primaria).
- No digas «componente resistivo»; di «resistencia abierta» (solo si aplica a lo que escribió el técnico).
- No digas «sistema de retroiluminación inoperante»; di «falla en el circuito de backlight» (solo si el técnico mencionó backlight / retroiluminación / pantalla sin luz, etc.).
- No digas «intervención técnica»; di «reparación de placa» o lo que encaje con lo que hizo el técnico.
- Conserva las palabras que el técnico use para piezas o zonas (ej. «puesto de carga» no lo cambies por «puerto de carga» ni al revés, salvo error de tecleo evidente y único).

ESTRUCTURA:
- Un solo párrafo corto y conciso: qué se encontró, qué se cambió o hizo y cómo quedó el equipo.
- Sin listas, sin subtítulos, sin saltos de sección, sin emojis ni símbolos decorativos.

EJEMPLO DE SALIDA (solo estilo; no copies hechos si no están en las notas del técnico):
«Se reparó la fuente de alimentación tras encontrar el puente rectificador en corto. Luego de normalizar la entrada, se detectó una resistencia abierta en la línea de backlight que impedía el encendido de los LEDs. Se reemplazaron ambos componentes, se chequearon los voltajes y el equipo quedó funcionando correctamente.»

REGLA DE ORO:
- No inventes herramientas, pruebas, repuestos, marcas ni pasos que el técnico no haya escrito.
- No saludes ni des contexto innecesario.

Devuelve ÚNICAMENTE el párrafo final, sin comillas envolventes ni preámbulo.`;

const SYSTEM_PROMPT_WHATSAPP = `Eres quien redacta mensajes de WhatsApp para un taller de reparación de equipos electrónicos.
El usuario te pasa un borrador; tu salida es el mensaje listo para enviar al cliente por WhatsApp.

TONO:
- Español, cordial y natural, como escribe una persona del taller (no marketing ni frases vacías).
- Ortografía y tildes correctas. Frases cortas; si el borrador ya es breve, no lo alargues sin necesidad.

REGLAS:
- Conserva nombres, número de orden, tipo de equipo, marcas y datos que ya figuren en el borrador.
- No inventes precios, fechas de entrega ni promesas que no estén en el texto de entrada.
- Sin markdown; puedes usar saltos de línea simples si mejoran la lectura en el móvil.
- No añadas emojis si el borrador no los tenía.

Devuelve ÚNICAMENTE el texto del mensaje, sin comillas envolventes ni preámbulo tipo «Aquí tienes».`;

const MAX_INPUT_CHARS = 20_000;
const GROQ_FETCH_TIMEOUT_MS = 38_000;
const MAX_429_RETRY_SLEEP_MS = 4_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ProviderErrorBody = { error?: { message?: string; type?: string } };

function errorMessageFromBody(body: unknown): string {
  return String((body as ProviderErrorBody)?.error?.message ?? '').trim();
}

function isOverloadNoPointRetrying(body: unknown): boolean {
  const low = errorMessageFromBody(body).toLowerCase();
  if (low.includes('high demand')) return true;
  if (low.includes('try again') && low.includes('later') && low.includes('temporary')) return true;
  if ((low.includes('unavailable') || low.includes('overload')) && low.includes('model')) return true;
  return false;
}

function shouldRetryTransientOnce(httpStatus: number, body: unknown): boolean {
  if (isOverloadNoPointRetrying(body)) return false;
  if (httpStatus === 429 || httpStatus === 503 || httpStatus === 529) return true;
  const low = errorMessageFromBody(body).toLowerCase();
  return low.includes('too many requests') || low.includes('rate limit');
}

function extractAssistantText(body: unknown): string {
  const data = body as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  return String(data?.choices?.[0]?.message?.content ?? '').trim();
}

function parseRetrySecondsFromMessage(raw: string): number | null {
  const low = raw.toLowerCase();
  const m1 = low.match(/retry\s*(?:in|after)?\s*([\d.]+)\s*s/);
  if (m1) {
    const n = Math.ceil(Number(m1[1]));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 120) : null;
  }
  const m2 = low.match(/retry\s*delay[:\s]+(\d+)/);
  if (m2) {
    const n = Math.ceil(Number(m2[1]));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 120) : null;
  }
  return null;
}

function clientMessageForProviderFailure(status: number, rawMsg: string): string {
  const m = rawMsg.trim();
  const low = m.toLowerCase();

  if (
    low.includes('high demand') ||
    (low.includes('try again') && low.includes('later') && low.includes('temporary'))
  ) {
    return 'El servicio de IA está muy ocupado. Espera un minuto y vuelve a intentarlo.';
  }

  if ((low.includes('unavailable') || low.includes('overload')) && low.includes('model')) {
    return 'El servicio de IA no está disponible en este momento. Espera un momento y vuelve a intentarlo.';
  }

  if (
    status === 429 ||
    low.includes('quota') ||
    low.includes('rate limit') ||
    low.includes('resource exhausted') ||
    low.includes('too many requests') ||
    low.includes('tokens per') ||
    low.includes('requests per')
  ) {
    return 'Límite de uso del servicio de IA alcanzado. Espera unos minutos y vuelve a intentarlo.';
  }
  if (status === 400 && (low.includes('invalid') || low.includes('api key'))) {
    return 'El servicio de mejora con IA no está disponible.';
  }
  if (status === 401 || status === 403) {
    return 'El servicio de mejora con IA no está disponible.';
  }
  if (status === 404 || low.includes('not found') || low.includes('does not exist')) {
    return 'El servicio de mejora con IA no está disponible.';
  }
  return 'No se pudo mejorar el texto. Inténtalo más tarde.';
}

function logProviderFailure(status: number, rawMsg: string): void {
  console.error('[improve-diagnosis] Groq', { status, message: rawMsg.trim().slice(0, 800) });
}

type PanelSupabase = ReturnType<typeof createSupabaseServerClientFromRequest>;
type PolishThrottleReason = 'hour' | 'day' | 'interval';

function clientMessageForPolishThrottle(reason: PolishThrottleReason): string {
  if (reason === 'interval') {
    return 'Espera unos segundos antes de pulir de nuevo con IA.';
  }
  if (reason === 'hour') {
    return 'Has usado muchas veces la mejora con IA en la última hora. Prueba más tarde.';
  }
  return 'Has alcanzado el límite diario de mejoras con IA. Prueba mañana.';
}

function clientMessageForPolishGlobalCap(): string {
  return 'Muchos técnicos están usando «Pulir con IA» a la vez. Espera un minuto e inténtalo de nuevo.';
}

function clientMessageOrgPolishMonthlyCap(): string {
  return 'Este taller alcanzó el límite mensual de mejoras con IA del plan. Contactá a soporte o esperá al próximo mes.';
}

function utcMonthStart(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function resolvePanelOrgId(supabase: PanelSupabase): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_organization_id');
    if (error || data == null || data === '') return null;
    return String(data);
  } catch {
    return null;
  }
}

async function loadOrgAccessRow(
  orgId: string
): Promise<{ subscription_status: string | null; settings: unknown } | null> {
  if (!SUPABASE_URL.trim() || !SUPABASE_SERVICE_KEY.trim()) return null;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin
    .from('organizations')
    .select('subscription_status, settings')
    .eq('id', orgId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    subscription_status: (data as { subscription_status?: string | null }).subscription_status ?? null,
    settings: (data as { settings?: unknown }).settings ?? null,
  };
}

async function countOrgPolishThisUtcMonth(orgId: string): Promise<number | null> {
  if (!SUPABASE_URL.trim() || !SUPABASE_SERVICE_KEY.trim()) return null;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const since = utcMonthStart().toISOString();
  const { data, error } = await admin.rpc('get_polish_counts_by_org_since', { p_since: since });
  if (error || !Array.isArray(data)) return null;
  const row = (data as { organization_id?: string; call_count?: number | string }[]).find(
    (r) => String(r.organization_id) === orgId
  );
  if (!row) return 0;
  return Number(row.call_count ?? 0);
}

async function countGlobalPolishAttemptsSince(since: Date): Promise<number | null> {
  if (!SUPABASE_URL.trim() || !SUPABASE_SERVICE_KEY.trim()) return null;
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { count, error } = await admin
      .from('polish_gemini_calls')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since.toISOString());
    if (error) return null;
    return typeof count === 'number' ? count : 0;
  } catch {
    return null;
  }
}

async function isGlobalPolishCapReached(): Promise<boolean> {
  if (POLISH_MAX_GLOBAL_PER_MINUTE <= 0) return false;
  const since = new Date(Date.now() - 60_000);
  const n = await countGlobalPolishAttemptsSince(since);
  if (n === null) return false;
  return n >= POLISH_MAX_GLOBAL_PER_MINUTE;
}

async function countPolishCallsSince(
  supabase: PanelSupabase,
  userId: string,
  since: Date,
): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from('polish_gemini_calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since.toISOString());
    if (error) return null;
    return typeof count === 'number' ? count : 0;
  } catch {
    return null;
  }
}

async function getLastPolishCallAt(supabase: PanelSupabase, userId: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('polish_gemini_calls')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.created_at) return null;
    return new Date(String(data.created_at));
  } catch {
    return null;
  }
}

async function recordPolishAttempt(supabase: PanelSupabase, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('polish_gemini_calls').insert({ user_id: userId });
    return !error;
  } catch {
    return false;
  }
}

async function checkPolishThrottle(
  supabase: PanelSupabase,
  userId: string,
): Promise<PolishThrottleReason | null> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

  if (POLISH_MAX_PER_HOUR > 0) {
    const n = await countPolishCallsSince(supabase, userId, hourAgo);
    if (n !== null && n >= POLISH_MAX_PER_HOUR) return 'hour';
  }
  if (POLISH_MAX_PER_DAY > 0) {
    const n = await countPolishCallsSince(supabase, userId, dayAgo);
    if (n !== null && n >= POLISH_MAX_PER_DAY) return 'day';
  }
  if (POLISH_MIN_INTERVAL_MS > 0) {
    const last = await getLastPolishCallAt(supabase, userId);
    if (last && now - last.getTime() < POLISH_MIN_INTERVAL_MS) return 'interval';
  }
  return null;
}

function isLikelyDailyOrHardQuota(body: unknown): boolean {
  const low = errorMessageFromBody(body).toLowerCase();
  return (
    low.includes('perday') ||
    low.includes('per_day') ||
    low.includes('daily') ||
    low.includes('per day') ||
    low.includes('quota exceeded') ||
    low.includes('exceeded your')
  );
}

type ParsedGroq = { ok: boolean; status: number; body: unknown };

function buildGroqBody(model: string, userText: string, systemPrompt: string, maxTokens: number): object {
  return {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ],
    temperature: 0.2,
    max_tokens: maxTokens,
  };
}

async function groqChat(
  model: string,
  userText: string,
  systemPrompt: string,
  maxTokens: number,
): Promise<ParsedGroq | null> {
  const key = GROQ_POLISH_API_KEY.trim();
  if (!key) return null;

  const opts: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(buildGroqBody(model, userText, systemPrompt, maxTokens)),
    signal: AbortSignal.timeout(GROQ_FETCH_TIMEOUT_MS),
  };

  try {
    let res = await fetch(GROQ_CHAT_URL, opts);
    if (res.status === 429) {
      let errBody: unknown = null;
      try {
        errBody = await res.clone().json();
      } catch {
        /* sin JSON */
      }
      if (isLikelyDailyOrHardQuota(errBody)) {
        let body: unknown = errBody;
        try {
          if (body == null) body = await res.json();
        } catch {
          body = null;
        }
        return { ok: false, status: res.status, body: body ?? {} };
      }
      let delay = 2_000;
      const ra = res.headers.get('retry-after');
      if (ra) {
        const sec = Number.parseInt(ra, 10);
        if (Number.isFinite(sec) && sec > 0) {
          delay = Math.min(Math.max(sec, 1) * 1000, MAX_429_RETRY_SLEEP_MS);
        }
      } else {
        const sec = parseRetrySecondsFromMessage(errorMessageFromBody(errBody));
        if (sec != null) {
          delay = Math.min(Math.max(sec, 1) * 1000, MAX_429_RETRY_SLEEP_MS);
        }
      }
      await sleep(delay);
      res = await fetch(GROQ_CHAT_URL, { ...opts, signal: AbortSignal.timeout(GROQ_FETCH_TIMEOUT_MS) });
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* cuerpo no JSON */
    }
    return { ok: res.ok, status: res.status, body };
  } catch {
    return null;
  }
}

async function generateWithRetries(
  model: string,
  userText: string,
  systemPrompt: string,
  maxTokens: number,
): Promise<{ kind: 'ok'; text: string } | { kind: 'fail'; status: number; body: unknown }> {
  let lastFail: { status: number; body: unknown } | null = null;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(900 + attempt * 700);
    }
    const parsed = await groqChat(model, userText, systemPrompt, maxTokens);
    if (!parsed) {
      return { kind: 'fail', status: 502, body: { error: { message: 'network' } } };
    }
    if (parsed.ok) {
      const text = extractAssistantText(parsed.body);
      if (text) return { kind: 'ok', text };
      return { kind: 'fail', status: 502, body: parsed.body };
    }

    lastFail = { status: parsed.status, body: parsed.body };

    if (isOverloadNoPointRetrying(parsed.body)) {
      return { kind: 'fail', status: parsed.status, body: parsed.body };
    }

    if (
      shouldRetryTransientOnce(parsed.status, parsed.body) &&
      attempt < maxAttempts - 1 &&
      !isLikelyDailyOrHardQuota(parsed.body)
    ) {
      continue;
    }

    return { kind: 'fail', status: parsed.status, body: parsed.body };
  }

  return { kind: 'fail', status: lastFail?.status ?? 503, body: lastFail?.body ?? {} };
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const panelOrgId = await resolvePanelOrgId(supabase);
  let orgAccess: { subscription_status: string | null; settings: unknown } | null = null;
  if (panelOrgId) {
    orgAccess = await loadOrgAccessRow(panelOrgId);
  }
  const orgStatus = orgAccess?.subscription_status ?? '';
  if (orgStatus === 'suspended' || orgStatus === 'cancelled') {
    return NextResponse.json(
      { error: 'El acceso al panel de este taller está suspendido.' },
      { status: 403 }
    );
  }

  if (!GROQ_POLISH_API_KEY.trim()) {
    console.error('[improve-diagnosis] Falta GROQ_POLISH_API_KEY en el servidor');
    return NextResponse.json(
      { error: 'El servicio de mejora con IA no está disponible.' },
      { status: 503 }
    );
  }

  let body: { text?: string; style?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const style = String(body.style ?? '').trim().toLowerCase();
  const isWhatsapp = style === 'whatsapp';
  const systemPrompt = isWhatsapp ? SYSTEM_PROMPT_WHATSAPP : SYSTEM_PROMPT;
  const maxOutTokens = isWhatsapp ? 600 : 900;

  const raw = String(body.text ?? '');
  if (!raw.trim()) {
    return NextResponse.json({ error: 'El texto está vacío.' }, { status: 400 });
  }
  if (raw.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `El texto supera el máximo de ${MAX_INPUT_CHARS} caracteres.` },
      { status: 400 }
    );
  }

  const monthlyOrgLimit = orgAccess ? readPolishMonthlyLimitFromOrgSettings(orgAccess.settings) : null;
  if (panelOrgId && monthlyOrgLimit != null) {
    const usedMonth = await countOrgPolishThisUtcMonth(panelOrgId);
    if (usedMonth !== null && usedMonth >= monthlyOrgLimit) {
      void logSystemAiError({
        userId: user.id,
        organizationId: panelOrgId,
        source: 'improve_diagnosis',
        httpStatus: 429,
        providerMessage: `Cuota mensual de pulidos IA (organización, UTC): ${usedMonth}/${monthlyOrgLimit}`,
        model: null,
        extra: { reason: 'org_monthly_cap' },
      });
      return NextResponse.json({ error: clientMessageOrgPolishMonthlyCap() }, { status: 429 });
    }
  }

  if (await isGlobalPolishCapReached()) {
    return NextResponse.json({ error: clientMessageForPolishGlobalCap() }, { status: 429 });
  }

  const polishThrottle = await checkPolishThrottle(supabase, user.id);
  if (polishThrottle) {
    return NextResponse.json(
      { error: clientMessageForPolishThrottle(polishThrottle) },
      { status: 429 },
    );
  }
  const polishRecorded = await recordPolishAttempt(supabase, user.id);
  if (!polishRecorded) {
    console.warn('[improve-diagnosis] polish_gemini_calls: insert falló (¿migración no aplicada?)');
  }

  const primary = await generateWithRetries(GROQ_POLISH_MODEL, raw, systemPrompt, maxOutTokens);
  if (primary.kind === 'ok') {
    return NextResponse.json({ text: primary.text });
  }

  const primaryRaw = errorMessageFromBody(primary.body);
  logProviderFailure(primary.status, primaryRaw);
  let primaryDetail = primaryRaw;
  if (!primaryDetail) {
    try {
      primaryDetail = JSON.stringify(primary.body).slice(0, 2000);
    } catch {
      primaryDetail = '';
    }
  }
  void logSystemAiError({
    userId: user.id,
    organizationId: panelOrgId,
    source: 'improve_diagnosis',
    httpStatus: primary.status,
    providerMessage: primaryDetail || null,
    model: GROQ_POLISH_MODEL,
    extra: { style: isWhatsapp ? 'whatsapp' : 'diagnosis', phase: 'primary' },
  });

  const lowPrimary = primaryRaw.toLowerCase();
  const skipFallbackForQuota =
    primary.status === 429 ||
    isLikelyDailyOrHardQuota(primary.body) ||
    lowPrimary.includes('resource exhausted') ||
    lowPrimary.includes('rate limit');

  if (GROQ_POLISH_FALLBACK_MODEL !== GROQ_POLISH_MODEL && !skipFallbackForQuota) {
    const fb = await generateWithRetries(GROQ_POLISH_FALLBACK_MODEL, raw, systemPrompt, maxOutTokens);
    if (fb.kind === 'ok') {
      return NextResponse.json({ text: fb.text });
    }
    const rawMsg = errorMessageFromBody(fb.body);
    logProviderFailure(fb.status, rawMsg);
    let fbDetail = rawMsg;
    if (!fbDetail) {
      try {
        fbDetail = JSON.stringify(fb.body).slice(0, 2000);
      } catch {
        fbDetail = '';
      }
    }
    void logSystemAiError({
      userId: user.id,
      organizationId: panelOrgId,
      source: 'improve_diagnosis',
      httpStatus: fb.status,
      providerMessage: fbDetail || null,
      model: GROQ_POLISH_FALLBACK_MODEL,
      extra: { style: isWhatsapp ? 'whatsapp' : 'diagnosis', phase: 'fallback' },
    });
    return NextResponse.json(
      { error: clientMessageForProviderFailure(fb.status, rawMsg) },
      { status: fb.status === 429 ? 429 : 502 }
    );
  }

  return NextResponse.json(
    { error: clientMessageForProviderFailure(primary.status, primaryRaw) },
    { status: primary.status === 429 ? 429 : 502 }
  );
}
