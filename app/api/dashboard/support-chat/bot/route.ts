/**
 * Endpoint separado para el bot IA.
 * Se llama desde el cliente después de guardar el mensaje del usuario.
 * Al estar separado, no bloquea la respuesta al cliente ni sufre el límite de 10s
 * de la función principal.
 */
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { processBotResponse } from '@/lib/support-bot';

export const dynamic = 'force-dynamic';
// Aumentar el límite de duración al máximo permitido (60s en hobby, 300s en pro)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    let body: { message?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const message = String(body.message ?? '').trim();
    if (!message) return NextResponse.json({ ok: true }); // nada que procesar

    // Misma resolución que get_user_organization_id() / panel: nunca confiar en organizationId del cliente.
    let organizationId: string | null = null;
    const { data: rpcOrgId, error: rpcErr } = await supabase.rpc('get_user_organization_id');
    if (!rpcErr && rpcOrgId != null && String(rpcOrgId).length > 0) {
      organizationId = String(rpcOrgId);
    } else {
      const { data: rows } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1);
      organizationId =
        (rows?.[0] as { organization_id?: string } | undefined)?.organization_id ?? null;
    }

    await processBotResponse(user.id, message, organizationId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // silencioso — no romper la UX
  }
}
