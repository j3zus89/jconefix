import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  requireOrganizationAdminFromRequest,
  requireOrganizationMemberFromRequest,
} from '@/lib/auth/org-admin-server';
import { humanizeOrganizationsSchemaError } from '@/lib/supabase-setup-hints';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_INPUT_CHARS = 12_000;
const GEMINI_MODEL = 'gemini-2.0-flash';

function adminDb() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** GET: indica si el taller tiene clave (sin devolverla). */
export async function GET(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const db = adminDb();
  if (!db) {
    return NextResponse.json({ error: 'Servidor sin configurar' }, { status: 500 });
  }

  const { data, error } = await db
    .from('organizations')
    .select('gemini_api_key')
    .eq('id', auth.organizationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: humanizeOrganizationsSchemaError(error.message) },
      { status: 500 }
    );
  }

  const key = (data as { gemini_api_key?: string | null } | null)?.gemini_api_key;
  const configured = typeof key === 'string' && key.trim().length > 0;

  return NextResponse.json({ configured }, { headers: { 'Cache-Control': 'no-store' } });
}

/** PATCH: guardar o borrar clave (solo admin/owner del taller). */
export async function PATCH(req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Solo un administrador del taller puede guardar la clave de IA.' },
      { status: auth.status }
    );
  }

  const db = adminDb();
  if (!db) {
    return NextResponse.json({ error: 'Servidor sin configurar' }, { status: 500 });
  }

  let body: { apiKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const raw = body.apiKey;
  if (raw !== null && raw !== undefined && typeof raw !== 'string') {
    return NextResponse.json({ error: 'apiKey debe ser texto o null' }, { status: 400 });
  }

  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const valueToStore = trimmed.length > 0 ? trimmed : null;

  const { error } = await db
    .from('organizations')
    .update({
      gemini_api_key: valueToStore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auth.organizationId);

  if (error) {
    return NextResponse.json(
      { error: humanizeOrganizationsSchemaError(error.message) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, configured: !!valueToStore });
}

/** POST: pulir texto con la clave del taller (miembro activo). */
export async function POST(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const db = adminDb();
  if (!db) {
    return NextResponse.json({ error: 'Servidor sin configurar' }, { status: 500 });
  }

  const { data, error } = await db
    .from('organizations')
    .select('gemini_api_key')
    .eq('id', auth.organizationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: humanizeOrganizationsSchemaError(error.message) },
      { status: 500 }
    );
  }

  const apiKey = (data as { gemini_api_key?: string | null } | null)?.gemini_api_key?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Este taller no tiene clave de IA configurada.' },
      { status: 400 }
    );
  }

  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) {
    return NextResponse.json({ error: 'Falta el texto a pulir' }, { status: 400 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `El texto supera el máximo de ${MAX_INPUT_CHARS} caracteres` },
      { status: 400 }
    );
  }

  const prompt = `Eres un experto en reparaciones. Corrige y profesionaliza el siguiente texto técnico de forma breve y seria: ${text}`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const gRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });

  const gJson = await gRes.json().catch(() => null);

  if (!gRes.ok) {
    const rawMsg: string =
      (gJson as { error?: { message?: string } })?.error?.message ?? '';

    // Translate common Gemini API errors to clear Spanish messages
    let friendlyMsg: string;
    if (gRes.status === 429 || rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('rate')) {
      if (rawMsg.includes('limit: 0') || rawMsg.includes('free_tier')) {
        friendlyMsg =
          'Tu clave de Gemini no tiene cuota disponible en el nivel gratuito. ' +
          'Para solucionar esto: ve a console.cloud.google.com, activa la facturación en tu proyecto ' +
          'y vuelve a intentarlo. Si prefieres no pagar, crea una nueva clave en aistudio.google.com ' +
          'desde una cuenta Google diferente.';
      } else {
        const retryMatch = rawMsg.match(/retry in ([\d.]+)s/i);
        const wait = retryMatch ? ` Espera ${Math.ceil(Number(retryMatch[1]))} segundos.` : '';
        friendlyMsg = `Límite de peticiones de Gemini alcanzado.${wait} Inténtalo de nuevo en unos momentos.`;
      }
    } else if (gRes.status === 400 && rawMsg.toLowerCase().includes('api_key')) {
      friendlyMsg = 'Clave de API de Gemini inválida. Ve a Configuración y comprueba que la clave sea correcta.';
    } else if (gRes.status === 403) {
      friendlyMsg = 'Acceso denegado por Gemini. Verifica que la clave tenga permisos para usar la API de Generative Language.';
    } else {
      friendlyMsg = rawMsg || `Error de Gemini (${gRes.status}). Revisa tu clave en Configuración.`;
    }

    return NextResponse.json({ error: friendlyMsg }, { status: 502 });
  }

  const parts = (gJson as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  const out = parts?.map((p) => p.text).filter(Boolean).join('').trim();

  if (!out) {
    return NextResponse.json(
      { error: 'La IA no devolvió texto. Revisa la clave o inténtalo de nuevo.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ text: out }, { headers: { 'Cache-Control': 'no-store' } });
}
