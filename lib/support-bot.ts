/**
 * Bot de soporte con Gemini. Cuotas y ahorro de API vía env (ver abajo).
 *
 * Env opcionales:
 * - SUPPORT_BOT_GEMINI_DISABLED=true → no llama a Gemini; el mensaje queda para el equipo.
 * - SUPPORT_BOT_GEMINI_MODEL → default gemini-2.5-flash (p. ej. gemini-2.0-flash).
 * - SUPPORT_BOT_GEMINI_MAX_PER_USER_PER_HOUR → default 10 (0 = sin límite por hora).
 * - SUPPORT_BOT_GEMINI_MAX_PER_USER_PER_DAY → default 35 (0 = sin límite por día).
 * - SUPPORT_BOT_GEMINI_MIN_INTERVAL_SEC → default 18 segundos entre respuestas IA del mismo usuario.
 *
 * Requiere migración `support_bot_gemini_calls` para que los límites por hora/día/intervalo apliquen;
 * si la tabla no existe, solo aplican trivial/off y modelo sin contar en BD.
 *
 * Handoff automático (mensaje que simula al agente tras [TRANSFERIR]): foto y nombre en BD usan el perfil
 * del usuario con email OWNER_SUPER_ADMIN_EMAIL, salvo que definas SUPPORT_HANDOFF_AGENT_USER_ID o
 * SUPPORT_HANDOFF_AGENT_EMAIL (+ opcional SUPPORT_HANDOFF_DISPLAY_NAME).
 *
 * Gemini: SUPPORT_BOT_GEMINI_TIMEOUT_MS (default 18000), SUPPORT_BOT_GEMINI_FALLBACK_MODEL (default gemini-2.0-flash).
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { OWNER_SUPER_ADMIN_EMAIL } from '@/lib/auth/super-admin-allowlist';
import { isAnySuperAdminPanelOnline } from '@/lib/super-admin-presence';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL =
  process.env.SUPPORT_BOT_GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

const GEMINI_FALLBACK_MODEL =
  process.env.SUPPORT_BOT_GEMINI_FALLBACK_MODEL?.trim() || 'gemini-2.0-flash';

const GEMINI_DISABLED =
  process.env.SUPPORT_BOT_GEMINI_DISABLED === '1' ||
  process.env.SUPPORT_BOT_GEMINI_DISABLED === 'true';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** 0 = sin tope en ese eje */
const MAX_GEMINI_PER_HOUR = envInt('SUPPORT_BOT_GEMINI_MAX_PER_USER_PER_HOUR', 10);
const MAX_GEMINI_PER_DAY = envInt('SUPPORT_BOT_GEMINI_MAX_PER_USER_PER_DAY', 35);
const MIN_INTERVAL_MS = envInt('SUPPORT_BOT_GEMINI_MIN_INTERVAL_SEC', 18) * 1000;
const GEMINI_TIMEOUT_MS = envInt('SUPPORT_BOT_GEMINI_TIMEOUT_MS', 18_000);

/** Mensaje automático enviado cuando la IA decide transferir. */
const TRANSFER_MESSAGE =
  'Entiendo. Te estoy transfiriendo con Jesús para ayudarte personalmente.';

/** Texto exacto que la IA debe devolver para disparar la transferencia. */
const TRANSFER_MARKER = '[TRANSFERIR]';

const SYSTEM_PROMPT = `Te llamas **MARI** y eres el asistente virtual de soporte de **JC ONE FIX**, software de gestión para talleres de reparación (tickets, inventario, punto de venta, facturación, clientes).
Hablas con clientes que pueden ser completamente nuevos, así que explica los pasos con detalle y claridad.
Responde siempre en español.

TONO (obligatorio):
- Sé muy amable, cercano y servicial: muestra que te encanta ayudar ("con mucho gusto", "estaré encantado de orientarte", "cuenta conmigo").
- Nunca seas seco, frío ni borde. Ni una sola respuesta cortante.

GUÍA COMPLETA EN EL PANEL (muy importante):
- En JC ONE FIX existe una guía de usuario completa, integrada en el propio panel.
- Cómo llegar: abre el menú **Configuración** (en la barra superior del panel) y elige **Guía de usuario** (📖). Ahí está el manual detallado con temas, pasos y capturas conceptuales (incluye modo de panel sencillo vs completo).
- Modo de panel: si preguntan por menú reducido, "panel simple", menos opciones o pantalla de inicio distinta: **Configuración → Configuración general** → sección **Experiencia del panel**; al elegir una opción se guarda al instante. La guía lo explica en **Primeros pasos → Modo sencillo y modo completo**.
- Si el usuario pregunta por guía, manual, tutorial, ayuda escrita, documentación, "cómo aprender el programa", etc.: responde de inmediato que **sí**, que tienen una guía completa y dile exactamente que está en **Configuración → Guía de usuario**. Puedes añadir una frase cordial ofreciendo ayuda concreta si quieren algo puntual.
- Si la pregunta **no** tiene que ver con JC ONE FIX (tema ajeno al programa): responde con una explicación **muy breve** y cordial si aporta valor; en la misma respuesta, recuerda siempre con amabilidad que para todo lo del programa tienen la **guía completa en Configuración → Guía de usuario**, y que con mucho gusto puedes ayudarles con dudas del taller en este chat.
- Si la pregunta **sí** es sobre JC ONE FIX: además de ayudar con la Wiki y tus conocimientos, puedes cerrar con una línea amable invitando a revisar la **Guía de usuario** en Configuración para profundizar (sin repetirlo en cada mensaje si ya lo dijiste hace un turno).

REGLAS:
1. Si la Wiki incluye información relevante, úsala para dar instrucciones paso a paso (dónde ir, qué pulsar, qué rellenar).
2. Si la Wiki no tiene el artículo exacto pero el tema es sobre JC ONE FIX, responde con tu conocimiento general del software de forma útil.
3. Da siempre pasos concretos. Nunca respondas de forma vaga como "ve al menú" — di exactamente cuál menú (p. ej. Configuración, Reparaciones, etc.).
4. Máximo 6 pasos o frases cortas por mensaje, salvo cuando expliques la guía (puedes usar 1–2 frases extra si hace falta).
5. Sé conciso: prioriza brevedad y claridad. Si los pasos son largos, resúmelos o divide la respuesta en mensajes más cortos. Evita textos extensos que puedan cortarse.
6. Responde EXACTAMENTE [TRANSFERIR] SOLO en estos casos: el usuario pide hablar con una persona, hay un problema de pago o facturación grave, o el error es técnico y está fuera de tu alcance.
7. NUNCA transfieras solo porque la Wiki no tenga el artículo. Intenta ayudar siempre primero.`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function adminDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type AdminClient = SupabaseClient;

async function fetchGeminiGenerate(
  model: string,
  apiKey: string,
  body: object,
  timeoutMs: number,
): Promise<Response> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Snapshot para mensajes `is_bot_message: false` generados en servidor (handoff simulado). */
type HandoffHumanSnapshot = {
  admin_sender_avatar_url: string | null;
  admin_sender_display_name: string;
};

let handoffAgentUserIdCache: { key: string; id: string | null; at: number } | null = null;
let handoffProfileCache: { userId: string; snap: HandoffHumanSnapshot; at: number } | null = null;

async function resolveHandoffAgentUserId(admin: AdminClient): Promise<string | null> {
  const fromEnv = process.env.SUPPORT_HANDOFF_AGENT_USER_ID?.trim();
  if (fromEnv && /^[0-9a-f-]{36}$/i.test(fromEnv)) return fromEnv;

  const email = (
    process.env.SUPPORT_HANDOFF_AGENT_EMAIL?.trim() || OWNER_SUPER_ADMIN_EMAIL
  ).toLowerCase();
  if (!email) return null;

  const cacheKey = email;
  if (
    handoffAgentUserIdCache &&
    handoffAgentUserIdCache.key === cacheKey &&
    Date.now() - handoffAgentUserIdCache.at < 10 * 60_000
  ) {
    return handoffAgentUserIdCache.id;
  }

  let found: string | null = null;
  let page = 1;
  for (let n = 0; n < 8 && !found; n++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) found = u.id;
    if (data.users.length < 200) break;
    page += 1;
  }

  handoffAgentUserIdCache = { key: cacheKey, id: found, at: Date.now() };
  return found;
}

/** Foto y nombre del agente del mensaje automático de transferencia (mismo criterio que el POST admin). */
async function getHandoffHumanSnapshot(admin: AdminClient): Promise<HandoffHumanSnapshot | null> {
  const uid = await resolveHandoffAgentUserId(admin);
  if (!uid) return null;

  if (
    handoffProfileCache &&
    handoffProfileCache.userId === uid &&
    Date.now() - handoffProfileCache.at < 5 * 60_000
  ) {
    return handoffProfileCache.snap;
  }

  const { data } = await admin
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', uid)
    .maybeSingle();
  const p = data as {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
  const nameFromProfile = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
  const envName = process.env.SUPPORT_HANDOFF_DISPLAY_NAME?.trim();
  const displayName = nameFromProfile || envName || 'Jesús';
  const url = (p?.avatar_url ?? '').trim();
  const snap: HandoffHumanSnapshot = {
    admin_sender_avatar_url: url.length > 0 ? url.slice(0, 2000) : null,
    admin_sender_display_name:
      displayName.length > 120 ? `${displayName.slice(0, 119)}…` : displayName,
  };
  handoffProfileCache = { userId: uid, snap, at: Date.now() };
  return snap;
}

async function insertSupportChatAdminMessage(
  admin: AdminClient,
  userId: string,
  organizationId: string | null,
  body: string,
  isBotMessage: boolean,
  humanSnapshot: HandoffHumanSnapshot | null = null,
) {
  const row: Record<string, unknown> = {
    user_id: userId,
    organization_id: organizationId,
    sender: 'admin',
    body,
    is_bot_message: isBotMessage,
  };
  if (!isBotMessage && humanSnapshot) {
    row.admin_sender_avatar_url = humanSnapshot.admin_sender_avatar_url;
    row.admin_sender_display_name = humanSnapshot.admin_sender_display_name;
  }

  let { error } = await admin.from('support_chat_messages').insert(row as never);
  if (
    error &&
    !isBotMessage &&
    humanSnapshot &&
    (error.message.includes('admin_sender') || error.message.includes('column'))
  ) {
    const fallback = {
      user_id: userId,
      organization_id: organizationId,
      sender: 'admin',
      body,
      is_bot_message: isBotMessage,
    };
    ({ error } = await admin.from('support_chat_messages').insert(fallback as never));
  }
  if (error && (error.message.includes('is_bot_message') || error.message.includes('column'))) {
    await admin.from('support_chat_messages').insert({
      user_id: userId,
      organization_id: organizationId,
      sender: 'admin',
      body,
    });
  }
}

/** Saludos / agradecimientos: respuesta fija sin gastar Gemini. */
function isTrivialUserMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length > 48) return false;
  return /^(hola+|hey+|hi+|buen[oa]s?(?:\s+d[ií]as?|\s+tardes?|\s+noches?)?|buenas|qu[eé]\s+tal\??|gracias|muchas\s+gracias|ok+|vale|perfecto|genial|listo|👋|🙏)\.?$/i.test(
    t,
  );
}

/**
 * Detecta si el mensaje está relacionado con JC ONE FIX (panel, tickets, reparaciones, etc.)
 * Si no lo está, no se usa Gemini para ahorrar tokens.
 */
function isRelatedToPanel(message: string): boolean {
  const t = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Palabras clave del sistema JC ONE FIX
  const panelKeywords = [
    /\bjc\s*one\s*fix\b/,
    /\b(panel|sistema|software|programa|app|aplicacion)\b/,
    /\b(ticket|tickets|orden|ordenes|reparacion|reparaciones)\b/,
    /\b(cliente|clientes|proveedor|proveedores)\b/,
    /\b(inventario|stock|producto|productos|repuesto|repuestos)\b/,
    /\b(factura|facturas|facturacion|cobro|cobros|pago|pagos|presupuesto|presupuestos)\b/,
    /\b(caja|pos|punto\s+de\s+venta|venta|ventas|compra|compras)\b/,
    /\b(usuario|usuarios|cuenta|cuentas|login|acceso|contraseña|password)\b/,
    /\b(configuracion|ajuste|ajustes|preferencias|menu)\b/,
    /\b(taller|workshop|servicio|servicios|tecnico|tecnicos)\b/,
    /\b(impresora|imprimir|etiqueta|codigo|qr|barra)\b/,
    /\b(whatsapp|mensaje|notificacion|email|correo)\b/,
    /\b(reporte|reportes|estadistica|estadisticas|kpi|metrica)\b/,
    /\b(guia|manual|tutorial|ayuda|soporte|duda|pregunta|problema|error|falla)\b/,
    /\b(backup|respaldo|exportar|importar|excel|csv)\b/,
    /\b(arca|afip|factura\s+[a-z]|monotributo|iva|cuit|dni)\b/,
    /\b(crear|agregar|nuevo|editar|modificar|actualizar|eliminar|borrar|buscar|filtrar)\b/,
    /\b(como|donde|que| cual|cuando|por\s+que|no\s+puedo|no\s+funciona|como\s+hago)\b/,
  ];

  return panelKeywords.some((re) => re.test(t));
}

const MSG_UNRELATED_TOPIC =
  'Entiendo tu consulta, pero estoy especializado exclusivamente en **JC ONE FIX** (gestión de talleres de reparación).\n\nSi tenés alguna duda sobre:\n• Tickets y órdenes de reparación\n• Clientes y facturación\n• Inventario y stock\n• Configuración del panel\n\n**¡Con mucho gusto te ayudo!** 💪\n\nPara otros temas, te sugiero consultar fuentes especializadas. También podés escribirle al equipo humano si preferís.';

/**
 * Pide explícitamente hablar con una persona (p. ej. «pasame con un agente»).
 * No dispara con menciones colaterales de «agente» en otro contexto.
 */
function userRequestsHumanAgent(text: string): boolean {
  const raw = text.trim();
  if (raw.length < 8 || raw.length > 320) return false;
  const t = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const s = t.replace(/\s+/g, ' ');
  return [
    /(pasame|pasarme|conectame|conectarme|transferime|transferirme|comunicame|comunicarme)\b[\s\S]{0,55}\b(agente|humano|operador|persona|alguien)\b/,
    /\b(puedo|podria|quisiera)\s+(habl\w*r|habalr)\s+con\s+(un\s+)?(agente|humano|operador|alguien|persona(\s+real)?)\b/,
    /\bhabl\w*r\s+con\s+(un\s+)?(agente|humano|operador|alguien|persona(\s+real)?)\b/,
    /\b(quiero|necesito)\s+(hablar\s+con\s+|habl\w*r\s+con\s+)?(un\s+)?(agente|humano|operador|persona|alguien)\b/,
    /\b(quiero|necesito)\s+.+\bcon\s+(un\s+)?(agente|humano|operador|alguien|persona)\b/,
    /\b(agente|operador)\s+humano\b/,
    /\bponeme\s+con\s+(un\s+)?(agente|humano|operador|alguien)\b/,
    /\bderivame\s+con\s+(un\s+)?(agente|humano|operador)\b/,
  ].some((re) => re.test(s));
}

const MSG_AGENT_ONLINE =
  '¡Por supuesto! **En seguida te transfiero con un agente humano** del equipo de soporte. **En un momento** te responden por este mismo chat. Si querés, contanos ya tu consulta con detalle para agilizar la atención.';

const MSG_AGENT_OFFLINE =
  'Gracias por escribirnos. En este momento **no hay un agente disponible en línea** en el panel, pero tu solicitud **quedó registrada**. Por favor **dejanos tu mensaje** con el detalle de lo que necesitás: en cuanto un agente esté disponible **te responderá por aquí** a la brevedad. Apreciamos tu paciencia.';

async function countGeminiCallsSince(admin: AdminClient, userId: string, since: Date): Promise<number | null> {
  try {
    const { count, error } = await admin
      .from('support_bot_gemini_calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since.toISOString());
    if (error) return null;
    return typeof count === 'number' ? count : 0;
  } catch {
    return null;
  }
}

async function getLastGeminiCallAt(admin: AdminClient, userId: string): Promise<Date | null> {
  try {
    const { data, error } = await admin
      .from('support_bot_gemini_calls')
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

async function recordSuccessfulGeminiCall(admin: AdminClient, userId: string): Promise<void> {
  try {
    await admin.from('support_bot_gemini_calls').insert({ user_id: userId });
  } catch {
    /* tabla ausente o error: no bloquear el chat */
  }
}

type ThrottleReason = 'hour' | 'day' | 'interval' | null;

async function checkGeminiThrottle(admin: AdminClient, userId: string): Promise<ThrottleReason> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

  if (MAX_GEMINI_PER_HOUR > 0) {
    const n = await countGeminiCallsSince(admin, userId, hourAgo);
    if (n !== null && n >= MAX_GEMINI_PER_HOUR) return 'hour';
  }
  if (MAX_GEMINI_PER_DAY > 0) {
    const n = await countGeminiCallsSince(admin, userId, dayAgo);
    if (n !== null && n >= MAX_GEMINI_PER_DAY) return 'day';
  }
  if (MIN_INTERVAL_MS > 0) {
    const last = await getLastGeminiCallAt(admin, userId);
    if (last && now - last.getTime() < MIN_INTERVAL_MS) return 'interval';
  }
  return null;
}

type WikiArticle = { title: string; content: string; category: string };

// Palabras vacías en español que no sirven para buscar
const STOP_WORDS = new Set([
  'como','hago','puedo','para','quiero','tengo','hacer','donde','cuando',
  'cual','este','esta','esos','esas','crear','desde','hasta','sobre','entre',
  'pero','pues','bien','solo','esto','eso','aqui','alla','cada','todo','toda',
]);

async function searchWiki(message: string): Promise<WikiArticle[]> {
  const admin = adminDb();

  // Extraer palabras clave significativas (≥4 chars, sin stop words)
  const keywords = message
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  // Buscar con cada keyword hasta encontrar resultados
  for (const kw of keywords) {
    const { data } = await admin.rpc('search_wiki_articles', {
      q: kw,
      max_results: 3,
    });
    if (Array.isArray(data) && data.length > 0) return data as WikiArticle[];
  }

  // Fallback: los 3 artículos más recientes para dar contexto general
  const { data: fallback } = await admin
    .from('wiki_articles')
    .select('title, content, category')
    .order('created_at', { ascending: false })
    .limit(3);
  return (fallback as WikiArticle[]) ?? [];
}

async function getThread(userId: string): Promise<{ bot_active: boolean; priority: string } | null> {
  try {
    const admin = adminDb();
    const { data, error } = await admin
      .from('support_chat_threads')
      .select('bot_active, priority')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    return data as { bot_active: boolean; priority: string } | null;
  } catch {
    return null;
  }
}

async function upsertThread(
  userId: string,
  fields: { bot_active?: boolean; priority?: string; status?: string },
) {
  try {
    const admin = adminDb();
    await admin.from('support_chat_threads').upsert(
      { user_id: userId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  } catch {
    /* silencioso — la tabla puede no existir todavía */
  }
}

type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] }[];

/** Carga los últimos N mensajes para mantener contexto de conversación */
async function getRecentHistory(userId: string, limit = 4): Promise<ChatHistory> {
  try {
    const admin = adminDb();
    const { data } = await admin
      .from('support_chat_messages')
      .select('sender, body, is_bot_message')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!Array.isArray(data) || data.length === 0) return [];

    // Revertir para orden cronológico y convertir al formato de Gemini
    return data
      .reverse()
      .map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: String(m.body ?? '') }],
      }));
  } catch {
    return [];
  }
}

// ─── Export principal ────────────────────────────────────────────────────────

/**
 * Procesa la respuesta del bot tras un mensaje del cliente.
 * Se llama desde el endpoint POST /api/dashboard/support-chat.
 * Falla silenciosamente para no interrumpir la experiencia del usuario.
 */
const MSG_NO_GEMINI_KEY =
  'Tu mensaje **llegó al equipo**. La respuesta automática no está disponible ahora (falta configurar la IA en el servidor). Te responden en breve. Para **tickets, reparaciones y el panel**: abrí **Configuración → Guía de usuario**; ahí está el paso a paso.';

const MSG_GEMINI_HTTP_FAIL =
  'Tuve un inconveniente técnico al generar la respuesta automática. Tu mensaje **ya quedó registrado** y el equipo humano te responde pronto. Mientras tanto: **Configuración → Guía de usuario**.';

const MSG_GEMINI_EMPTY_OR_CATCH =
  'No pude generar una respuesta en este momento. Tu mensaje **quedó en el chat** para el equipo. Consultá **Configuración → Guía de usuario** si necesitás guía paso a paso.';

export async function processBotResponse(
  userId: string,
  userMessage: string,
  organizationId: string | null = null,
): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;

  try {
    // 1. Comprobar si el bot está activo para este hilo
    const thread = await getThread(userId);
    const botActive = thread ? thread.bot_active : true;
    if (!botActive) return;

    if (!thread) {
      await upsertThread(userId, { bot_active: true, priority: 'normal', status: 'open' });
    }

    const admin = adminDb();

    if (userRequestsHumanAgent(userMessage)) {
      const agentOnline = await isAnySuperAdminPanelOnline(admin);
      await insertSupportChatAdminMessage(
        admin,
        userId,
        organizationId,
        agentOnline ? MSG_AGENT_ONLINE : MSG_AGENT_OFFLINE,
        true,
      );
      await upsertThread(userId, { bot_active: false, priority: 'high', status: 'pending' });
      return;
    }

    if (GEMINI_DISABLED) {
      await insertSupportChatAdminMessage(
        admin,
        userId,
        organizationId,
        'El asistente automático está pausado. Tu mensaje **llegó al equipo**; te responden pronto. La guía del sistema está en **Configuración → Guía de usuario**.',
        true,
      );
      return;
    }

    if (isTrivialUserMessage(userMessage)) {
      await insertSupportChatAdminMessage(
        admin,
        userId,
        organizationId,
        '¡Hola! Decime en una oración qué necesitás en el panel y te oriento. También tenés el manual en **Configuración → Guía de usuario**.',
        true,
      );
      return;
    }

    // No gastar tokens Gemini en temas ajenos al panel
    if (!isRelatedToPanel(userMessage)) {
      await insertSupportChatAdminMessage(admin, userId, organizationId, MSG_UNRELATED_TOPIC, true);
      return;
    }

    if (!GEMINI_API_KEY.trim()) {
      await insertSupportChatAdminMessage(admin, userId, organizationId, MSG_NO_GEMINI_KEY, true);
      return;
    }

    const throttle = await checkGeminiThrottle(admin, userId);
    if (throttle) {
      const body =
        throttle === 'interval'
          ? 'Dame unos segundos entre mensaje y mensaje del asistente automático, así ahorramos cupo. Si ya escribiste, tu mensaje **quedó registrado** para el equipo.'
          : 'Ahora no puedo generar más respuestas automáticas en esta franja (límite de uso del asistente). Tu mensaje **ya quedó registrado** y el equipo te responde en breve. Mientras tanto: **Configuración → Guía de usuario**.';
      await insertSupportChatAdminMessage(admin, userId, organizationId, body, true);
      return;
    }

    // 2. Buscar artículos relevantes de la Wiki + historial reciente en paralelo
    const [articles, history] = await Promise.all([
      searchWiki(userMessage),
      getRecentHistory(userId, 4),
    ]);

    const wikiContext =
      articles.length > 0
        ? articles
            .map((a) => `[${a.category.toUpperCase()}] ${a.title}:\n${a.content}`)
            .join('\n\n')
        : '(Sin artículos relevantes en la Wiki para esta consulta.)';

    // 3. Construir contents con historial completo para conversación fluida
    // El system prompt va en el primer turno de usuario
    const systemTurn = {
      role: 'user' as const,
      parts: [{
        text: `${SYSTEM_PROMPT}\n\n--- WIKI DE REFERENCIA ---\n${wikiContext}\n\n---\nAhora responde a la conversación que sigue, manteniendo el contexto de mensajes anteriores.`,
      }],
    };
    const systemAck = {
      role: 'model' as const,
      parts: [{
        text: 'Entendido. Ayudaré con mucho gusto sobre JC ONE FIX, usando la Wiki y el historial; recordaré la Guía de usuario en Configuración cuando convenga y mantendré un tono siempre amable.',
      }],
    };

    // Historial de mensajes previos (excluir el último que es el mensaje actual)
    const previousHistory = history.slice(0, -1);

    // Mensaje actual del usuario
    const currentMessage = {
      role: 'user' as const,
      parts: [{ text: userMessage }],
    };

    const contents = [systemTurn, systemAck, ...previousHistory, currentMessage];

    const requestBody = {
      contents,
      generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
    };

    const runGemini = (model: string) =>
      fetchGeminiGenerate(model, GEMINI_API_KEY, requestBody, GEMINI_TIMEOUT_MS);

    let gRes = await runGemini(GEMINI_MODEL);

    if (!gRes.ok && gRes.status === 404 && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL) {
      gRes = await runGemini(GEMINI_FALLBACK_MODEL);
    }

    if (!gRes.ok && [500, 502, 503, 429].includes(gRes.status)) {
      await new Promise((r) => setTimeout(r, 650));
      gRes = await runGemini(GEMINI_MODEL);
      if (!gRes.ok && gRes.status === 404 && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL) {
        gRes = await runGemini(GEMINI_FALLBACK_MODEL);
      }
    }

    if (!gRes.ok) {
      const raw = await gRes.text().catch(() => '');
      let errorBody: { error?: { code?: number; message?: string } } = {};
      try {
        errorBody = JSON.parse(raw) as typeof errorBody;
      } catch {
        /* cuerpo no JSON */
      }
      const hint = errorBody?.error?.message || raw.slice(0, 320);
      console.warn('[support-bot] Gemini HTTP', gRes.status, hint);

      const isQuota = gRes.status === 429 || errorBody?.error?.code === 429;
      if (isQuota) {
        await insertSupportChatAdminMessage(
          admin,
          userId,
          organizationId,
          'Entiendo. Te estoy transfiriendo con Jesús para ayudarte personalmente.',
          true,
        );
        await upsertThread(userId, { bot_active: false, priority: 'high', status: 'pending' });
      } else {
        await insertSupportChatAdminMessage(admin, userId, organizationId, MSG_GEMINI_HTTP_FAIL, true);
      }
      return;
    }

    const gJson = (await gRes.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    } | null;

    const botReply = gJson?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();

    if (!botReply) {
      await insertSupportChatAdminMessage(admin, userId, organizationId, MSG_GEMINI_EMPTY_OR_CATCH, true);
      return;
    }

    const shouldTransfer = botReply.includes(TRANSFER_MARKER);
    await recordSuccessfulGeminiCall(admin, userId);

    if (shouldTransfer) {
      const agentOnline = await isAnySuperAdminPanelOnline(admin);
      if (agentOnline) {
        await insertSupportChatAdminMessage(admin, userId, organizationId, TRANSFER_MESSAGE, true);
        await upsertThread(userId, { bot_active: false, priority: 'high', status: 'pending' });

        // 2 segundos de pausa → simula que el agente humano tomó el mensaje (solo si hay super admin en panel)
        await new Promise((r) => setTimeout(r, 2000));

        const handoffSnap = await getHandoffHumanSnapshot(admin);
        const who = handoffSnap?.admin_sender_display_name?.trim() || 'Jesús';
        await insertSupportChatAdminMessage(
          admin,
          userId,
          organizationId,
          `¡Hola! Buen día, soy ${who} 👋 Ya tomé tu caso personalmente. Cuéntame con más detalle qué está pasando y te ayudo ahora mismo.`,
          false,
          handoffSnap,
        );
      } else {
        await insertSupportChatAdminMessage(admin, userId, organizationId, MSG_AGENT_OFFLINE, true);
        await upsertThread(userId, { bot_active: false, priority: 'high', status: 'pending' });
      }
    } else {
      await insertSupportChatAdminMessage(admin, userId, organizationId, botReply, true);
    }
  } catch (e: unknown) {
    const name = e instanceof Error ? e.name : '';
    const msg = e instanceof Error ? e.message : String(e);
    if (name === 'AbortError') {
      console.warn('[support-bot] Gemini abort / timeout', GEMINI_TIMEOUT_MS, 'ms');
    } else {
      console.warn('[support-bot] Gemini exception', msg);
    }
    try {
      const admin = adminDb();
      await insertSupportChatAdminMessage(admin, userId, organizationId, MSG_GEMINI_EMPTY_OR_CATCH, true);
    } catch {
      /* último recurso */
    }
  }
}

/**
 * Desactiva el bot para un hilo concreto.
 * Se llama cuando el admin responde manualmente.
 */
export async function disableBotForUser(userId: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await upsertThread(userId, { bot_active: false });
  } catch {
    /* silencioso */
  }
}

/** Borra todos los mensajes de soporte del usuario (service role: RLS no permite DELETE al cliente). */
export async function deleteSupportChatMessagesForUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!SUPABASE_URL || !SERVICE_KEY) return { ok: false, error: 'Falta configuración del servidor' };
  try {
    const admin = adminDb();
    const { error } = await admin.from('support_chat_messages').delete().eq('user_id', userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error' };
  }
}

/**
 * Activa el bot para un hilo (usado desde el panel admin).
 */
export async function enableBotForUser(userId: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await upsertThread(userId, { bot_active: true, status: 'open', priority: 'normal' });
  } catch {
    /* silencioso */
  }
}
