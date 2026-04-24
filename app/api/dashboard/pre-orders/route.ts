/**
 * API Endpoint for Pre-Orders Management
 * 
 * GET /api/dashboard/pre-orders - List all pre-orders for the organization
 * POST /api/dashboard/pre-orders - Mark equipment as received and convert to full order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const db = adminDb();

  // Fetch pre-orders (status = pre_orden_pendiente AND equipo_en_tienda = false)
  const { data: preOrders, error: preOrdersError } = await db
    .from('repair_tickets')
    .select(`
      *,
      customers(
        id,
        name,
        email,
        phone
      )
    `)
    .eq('organization_id', auth.organizationId)
    .eq('status', 'pre_orden_pendiente')
    .eq('equipo_en_tienda', false)
    .order('created_at', { ascending: false });

  if (preOrdersError) {
    console.error('Error fetching pre-orders:', preOrdersError);
    return NextResponse.json(
      { error: 'Failed to fetch pre-orders' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: preOrders || []
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const body = await req.json();
  const { ticketId, action } = body;

  if (!ticketId || !action) {
    return NextResponse.json(
      { error: 'Missing required fields: ticketId, action' },
      { status: 400 }
    );
  }

  const db = adminDb();

  if (action === 'mark_received') {
    // Mark equipment as received and convert to full order
    const { data: updatedTicket, error: updateError } = await db
      .from('repair_tickets')
      .update({
        equipo_en_tienda: true,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .eq('organization_id', auth.organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Equipment marked as received',
      data: updatedTicket
    });
  }

  if (action === 'cancel') {
    // Cancel the pre-order
    const { data: updatedTicket, error: updateError } = await db
      .from('repair_tickets')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .eq('organization_id', auth.organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling ticket:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pre-order cancelled',
      data: updatedTicket
    });
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  );
}
