import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/dashboard/repair-labor-catalog/master?category=&brand=
 * Lista el catálogo maestro disponible para importar.
 * Filtrado opcional por categoría y marca.
 */
export async function GET(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: 'Servicio no configurado' },
      { status: 503 }
    );
  }

  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const country = searchParams.get('country') || 'AR';

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let query = db
      .from('service_catalog_master')
      .select('category, brand, model, service_name, price, repair_type_code, pricing_year')
      .eq('is_active', true)
      .eq('country_code', country)
      .order('category')
      .order('brand')
      .order('display_order');

    if (category) {
      query = query.ilike('category', `%${category}%`);
    }
    if (brand) {
      query = query.ilike('brand', `%${brand}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[master-catalog] Error:', error);
      return NextResponse.json(
        { error: error.message, hint: '¿Aplicaste la migración 202604241800?' },
        { status: 500 }
      );
    }

    // Agrupar por categoría y marca para mostrar resumen
    const summary = data.reduce((acc: Record<string, Record<string, number>>, item) => {
      const cat = item.category || 'Sin categoría';
      const br = item.brand || 'Sin marca';
      if (!acc[cat]) acc[cat] = {};
      if (!acc[cat][br]) acc[cat][br] = 0;
      acc[cat][br]++;
      return acc;
    }, {});

    return NextResponse.json({
      ok: true,
      count: data?.length || 0,
      summary,
      services: data || [],
    });
  } catch (e: any) {
    console.error('[master-catalog] Exception:', e);
    return NextResponse.json(
      { error: e?.message || 'Error al obtener catálogo' },
      { status: 500 }
    );
  }
}
