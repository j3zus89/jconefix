/**
 * CRUD de artículos de Wiki del Bot — solo SUPER_ADMIN.
 *
 * GET    /api/admin/support-bot/wiki           → lista todos
 * POST   /api/admin/support-bot/wiki           → crea uno nuevo
 * PATCH  /api/admin/support-bot/wiki?id=<uuid> → actualiza
 * DELETE /api/admin/support-bot/wiki?id=<uuid> → elimina
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function adminDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── GET: listar artículos ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  const admin = adminDb();
  const { data, error } = await admin
    .from('wiki_articles')
    .select('id, title, content, category, created_at, updated_at')
    .order('category', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data ?? [] });
}

// ─── POST: crear artículo ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  let body: { title?: string; content?: string; category?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const title    = String(body.title    ?? '').trim();
  const content  = String(body.content  ?? '').trim();
  const category = String(body.category ?? 'general').trim().toLowerCase();

  if (!title)   return NextResponse.json({ error: 'El título es obligatorio' },   { status: 400 });
  if (!content) return NextResponse.json({ error: 'El contenido es obligatorio' }, { status: 400 });
  if (title.length   > 200)  return NextResponse.json({ error: 'Título demasiado largo (máx. 200 caracteres)' },   { status: 400 });
  if (content.length > 5000) return NextResponse.json({ error: 'Contenido demasiado largo (máx. 5000 caracteres)' }, { status: 400 });

  const admin = adminDb();
  const { data, error } = await admin
    .from('wiki_articles')
    .insert({ title, content, category })
    .select('id, title, content, category, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ article: data }, { status: 201 });
}

// ─── PATCH: actualizar artículo ──────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  let body: { title?: string; content?: string; category?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (body.title    != null) updates.title    = String(body.title).trim();
  if (body.content  != null) updates.content  = String(body.content).trim();
  if (body.category != null) updates.category = String(body.category).trim().toLowerCase();

  if (updates.title    !== undefined && (updates.title.length === 0 || updates.title.length > 200))
    return NextResponse.json({ error: 'Título inválido' }, { status: 400 });
  if (updates.content  !== undefined && (updates.content.length === 0 || updates.content.length > 5000))
    return NextResponse.json({ error: 'Contenido inválido' }, { status: 400 });

  const admin = adminDb();
  const { data, error } = await admin
    .from('wiki_articles')
    .update(updates)
    .eq('id', id)
    .select('id, title, content, category, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ article: data });
}

// ─── DELETE: eliminar artículo ───────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const admin = adminDb();
  const { error } = await admin.from('wiki_articles').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
