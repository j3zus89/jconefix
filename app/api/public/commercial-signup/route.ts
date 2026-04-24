import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const CommercialSignupSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'El nombre es obligatorio')
    .max(100, 'El nombre es demasiado largo'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email no válido')
    .max(254, 'Email demasiado largo'),
  shop_name: z
    .string()
    .trim()
    .min(2, 'El nombre del taller es obligatorio')
    .max(120, 'El nombre del taller es demasiado largo'),
  billing_interest: z.enum(['mensual', 'anual']).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Lead desde la landing (sin login). El SUPER_ADMIN cobra fuera de la app y da de alta en panel.
 */
export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = CommercialSignupSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Datos no válidos';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const { full_name, email, shop_name, billing_interest = 'mensual', notes = null } = parsed.data;
    const plan_interest = 'profesional';

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin.from('commercial_signup_requests').insert({
      full_name,
      email,
      shop_name,
      plan_interest,
      billing_interest,
      notes,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
