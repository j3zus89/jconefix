import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const BUCKET = 'support_chat_uploads';
const RETENTION_HOURS = 48;
const BATCH_LIMIT = 400;
const MAX_ROUNDS = 25;

function objectPathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  let path = url.slice(i + marker.length);
  const q = path.indexOf('?');
  if (q >= 0) path = path.slice(0, q);
  const hash = path.indexOf('#');
  if (hash >= 0) path = path.slice(0, hash);
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw */
  }
  const trimmed = path.trim();
  return trimmed || null;
}

/** Ruta guardada en BD o URL pública/sign legacy. */
function objectPathFromStoredAttachment(stored: string): string | null {
  const u = stored.trim();
  if (!u) return null;
  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    return u.replace(/^\//, '') || null;
  }
  return objectPathFromPublicUrl(u);
}

/**
 * Vercel Cron: borra adjuntos del chat de soporte con más de 48 h (storage + limpia `attachment_url`).
 * Cabecera: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
  }
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();

  let messagesCleared = 0;
  let storageObjectsAttempted = 0;
  let rounds = 0;

  for (; rounds < MAX_ROUNDS; rounds++) {
    const { data: rows, error } = await admin
      .from('support_chat_messages')
      .select('id, attachment_url')
      .not('attachment_url', 'is', null)
      .lt('created_at', cutoff)
      .limit(BATCH_LIMIT);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (rows || []) as { id: string; attachment_url: string | null }[];
    if (list.length === 0) break;

    const paths: string[] = [];
    const ids: string[] = [];

    for (const r of list) {
      const u = r.attachment_url?.trim();
      if (!u) continue;
      ids.push(r.id);
      const p = objectPathFromStoredAttachment(u);
      if (p) paths.push(p);
    }

    const uniquePaths = Array.from(new Set(paths));
    storageObjectsAttempted += uniquePaths.length;

    const chunk = 80;
    for (let i = 0; i < uniquePaths.length; i += chunk) {
      const slice = uniquePaths.slice(i, i + chunk);
      const { error: rmErr } = await admin.storage.from(BUCKET).remove(slice);
      if (rmErr) {
        console.warn('[support-chat-attachments-cleanup] storage.remove:', rmErr.message);
      }
    }

    if (ids.length > 0) {
      const { error: upErr } = await admin
        .from('support_chat_messages')
        .update({ attachment_url: null })
        .in('id', ids);
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
      messagesCleared += ids.length;
    }

    if (list.length < BATCH_LIMIT) break;
  }

  return NextResponse.json({
    ok: true,
    cutoff,
    messagesCleared,
    storageObjectsAttempted,
    rounds,
  });
}
