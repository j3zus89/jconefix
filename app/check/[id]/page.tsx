/**
 * Página pública de seguimiento de ticket: /check/[id]
 *
 * SEGURIDAD:
 *  - Solo se consultan campos públicos (NO notas internas, NO técnico asignado,
 *    NO historial de cambios con horas, NO datos personales del cliente).
 *  - La página está marcada con noindex/nofollow para no aparecer en Google.
 *  - Los estados internos se mapean a mensajes neutros para el cliente.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CheckTracker } from './CheckTracker';
import { isArgentinaCurrency } from '@/lib/currency-region';

/* ─── Meta tags: nunca indexar esta página ──────────────────────────────── */
export const metadata: Metadata = {
  title: 'Estado de tu reparación — JC ONE FIX',
  description: 'Consulta el estado de tu equipo en JC ONE FIX.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

/* ─── Tipos públicos (NUNCA exponer notas internas) ─────────────────────── */
export type PublicTicket = {
  ticket_number: string;
  status: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  /** Solo la fecha de creación — sin horas exactas para no revelar tiempos de trabajo */
  created_date: string;
  /** Nombre del taller (organizations.name) — nunca datos del técnico */
  shop_name: string | null;
  /** Emoji del logo del taller si existe */
  shop_logo_url: string | null;
  /** Moneda del taller (ARS → etiquetas «orden»). */
  region_is_argentina: boolean;
};

/* ─── Consulta segura vía service-role (RLS saltado, pero solo campos públicos) */
async function fetchPublicTicket(id: string): Promise<PublicTicket | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Usamos anon key; el registro de tickets debe ser legible públicamente
    // (o configura una política SELECT pública en repair_tickets)
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Busca por ticket UUID o por ticket_number (el código del QR puede ser cualquiera)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const query = supabase
    .from('repair_tickets')
    .select(
      // ⚠️ SOLO campos públicos — JAMÁS: notes, internal_notes, assigned_to, diagnostic_notes
      `ticket_number,
       status,
       device_type,
       device_brand,
       device_model,
       created_at,
       organization_id`
    )
    .limit(1);

  const { data, error } = isUuid
    ? await query.eq('id', id).maybeSingle()
    : await query.eq('ticket_number', id).maybeSingle();

  if (error || !data) return null;

  // Carga el nombre del taller y moneda (sin datos sensibles)
  let shopName: string | null = null;
  let shopLogoUrl: string | null = null;
  let regionIsArgentina = false;
  if (data.organization_id) {
    const [{ data: org }, { data: shop }] = await Promise.all([
      supabase
        .from('organizations')
        .select('name, logo_url, currency')
        .eq('id', data.organization_id)
        .maybeSingle(),
      supabase
        .from('shop_settings')
        .select('currency')
        .eq('organization_id', data.organization_id)
        .maybeSingle(),
    ]);
    shopName = org?.name ?? null;
    shopLogoUrl = org?.logo_url ?? null;
    const cur = String(org?.currency || shop?.currency || 'ARS').toUpperCase();
    regionIsArgentina = isArgentinaCurrency(cur);
  }

  // Formatea fecha como DD/MM/YYYY sin hora exacta
  const d = new Date(data.created_at);
  const created_date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  return {
    ticket_number: data.ticket_number,
    status: data.status,
    device_type: data.device_type,
    device_brand: data.device_brand,
    device_model: data.device_model,
    created_date,
    shop_name: shopName,
    shop_logo_url: shopLogoUrl,
    region_is_argentina: regionIsArgentina,
  };
}

/* ─── Página ─────────────────────────────────────────────────────────────── */
export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await fetchPublicTicket(id);
  if (!ticket) notFound();
  return <CheckTracker ticket={ticket} />;
}
