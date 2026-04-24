/**
 * API Endpoint for Dashboard Notifications
 * 
 * GET /api/dashboard/notifications - Get unread notifications
 * POST /api/dashboard/notifications - Mark notifications as read
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

  // Fetch unread notifications
  const { data: notifications, error: notificationsError } = await db
    .from('maia_notifications')
    .select(`
      *,
      repair_tickets(
        ticket_number,
        device_type,
        device_model,
        status
      )
    `)
    .eq('organization_id', auth.organizationId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (notificationsError) {
    console.error('Error fetching notifications:', notificationsError);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: notifications || []
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const body = await req.json();
  const { notificationIds, markAllRead } = body;

  const db = adminDb();

  if (markAllRead) {
    // Mark all notifications as read
    const { error: updateError } = await db
      .from('maia_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('organization_id', auth.organizationId)
      .eq('is_read', false);

    if (updateError) {
      console.error('Error marking all notifications as read:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    });
  }

  if (notificationIds && notificationIds.length > 0) {
    // Mark specific notifications as read
    const { error: updateError } = await db
      .from('maia_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', notificationIds)
      .eq('organization_id', auth.organizationId);

    if (updateError) {
      console.error('Error marking notifications as read:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read'
    });
  }

  return NextResponse.json(
    { error: 'No notification IDs provided' },
    { status: 400 }
  );
}
