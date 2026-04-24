import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  computePublicTrialEndsAt,
  licenseDefaultsForPlan,
  mergeOrgFeatures,
  PUBLIC_TRIAL_DAYS,
} from '@/lib/org-plan';
import { notifyAdminNewUser, countryFromGeoHeader } from '@/lib/notifications/admin-alert';
const RegisterSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .regex(/^[\p{L}\p{M}\s'\-\.]+$/u, 'El nombre contiene caracteres no permitidos'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email no válido')
    .max(254, 'Email demasiado largo'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(128, 'La contraseña es demasiado larga'),
  shop_name: z
    .string()
    .trim()
    .min(2, 'El nombre del taller debe tener al menos 2 caracteres')
    .max(120, 'El nombre del taller es demasiado largo')
    .regex(/^[^\<\>\{\}\[\]\\\/\`]+$/, 'El nombre contiene caracteres no permitidos'),
});

/** Registro público solo para mercado Argentina (ARS / org country AR). */
function localeDefaultsArgentina() {
  return {
    orgCountry: 'AR' as const,
    currency: 'ARS',
    currencySymbol: '$',
    taxRate: 21,
    timezone: 'America/Argentina/Buenos_Aires',
    language: 'Spanish',
    countryName: 'Argentina',
    invoicePrefix: 'F-',
    ticketPrefix: '0-',
  };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OWNER_PERMISSIONS = {
  can_create_tickets: true,
  can_edit_tickets: true,
  can_delete_tickets: true,
  can_view_reports: true,
  can_manage_inventory: true,
  can_manage_customers: true,
  can_manage_settings: true,
  can_manage_users: true,
};

function slugFromShop(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 48);
  return `${base || 'taller'}-${Math.floor(Math.random() * 10000)}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Datos no válidos';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const { full_name, email, password, shop_name } = parsed.data;
    const locale = localeDefaultsArgentina();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, shop_name },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered')) {
        return NextResponse.json(
          { error: 'Ya existe una cuenta con este email. Inicia sesión o usa recuperar contraseña.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 });
    }
    const trialEndsAt = computePublicTrialEndsAt();
    const license = licenseDefaultsForPlan('profesional');
    const slug = slugFromShop(shop_name);

    const { data: orgData, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: shop_name,
        slug,
        owner_id: userId,
        subscription_status: 'trial',
        plan_type: license.plan_type,
        billing_cycle: 'mensual',
        subscription_plan: license.subscription_plan,
        license_expires_at: trialEndsAt,
        trial_ends_at: trialEndsAt,
        max_users: license.max_users,
        max_tickets: null,
        features: mergeOrgFeatures({}, license.features),
        country: locale.orgCountry,
        currency: locale.currency,
        settings: {
          currency: locale.currency,
          language: 'es',
          timezone: locale.timezone,
        },
      })
      .select()
      .single();

    if (orgError) {
      await admin.auth.admin.deleteUser(userId);
      console.error('[register-trial] org', orgError);
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Si existe trigger que ya inserta al owner en organization_members, un insert duplicado
    // falla con unique (organization_id, user_id). Upsert alinea permisos y evita el choque.
    const { error: memError } = await admin.from('organization_members').upsert(
      {
        organization_id: orgData.id,
        user_id: userId,
        role: 'owner',
        is_active: true,
        permissions: OWNER_PERMISSIONS,
      },
      { onConflict: 'organization_id,user_id' }
    );

    if (memError) {
      await admin.from('organizations').delete().eq('id', orgData.id);
      await admin.auth.admin.deleteUser(userId);
      console.error('[register-trial] member', memError);
      return NextResponse.json({ error: memError.message }, { status: 500 });
    }

    // Perfil y tienda: solo datos del propio registro; dirección/teléfono/CIF vacíos (LOPD).
    const { error: profileErr } = await admin.from('profiles').upsert(
      {
        id: userId,
        full_name,
        shop_name,
        organization_id: orgData.id,
      },
      { onConflict: 'id' }
    );
    if (profileErr) {
      console.error('[register-trial] profiles', profileErr);
    }

    const { error: shopErr } = await admin.from('shop_settings').insert({
      user_id: userId,
      organization_id: orgData.id,
      shop_name,
      alt_name: '',
      email,
      phone: '',
      phone2: '',
      fax: '',
      address: '',
      city: '',
      postal_code: '',
      state: '',
      country: locale.countryName,
      website: '',
      registration_number: '',
      footer_text: '',
      currency: locale.currency,
      currency_symbol: locale.currencySymbol,
      tax_rate: locale.taxRate,
      tax_included: true,
      accounting_method: 'accrual',
      time_format: '24',
      language: locale.language,
      start_time: '10:00:00',
      end_time: '20:00:00',
      invoice_prefix: locale.invoicePrefix,
      ticket_prefix: locale.ticketPrefix,
      default_warranty: 'Sin garantía',
      receive_emails: true,
      restocking_fee: false,
      deposit_repairs: false,
      screen_timeout: 'Never',
      decimal_places: '2',
      price_format: 'Decimal',
    });
    if (shopErr) {
      // No bloqueamos el alta: el usuario puede guardar ajustes después.
      console.error('[register-trial] shop_settings', shopErr);
    }

    // Copiar catálogo maestro de servicios a la organización (independiente por org)
    try {
      const { data: seedCount, error: seedErr } = await admin.rpc('seed_organization_services', {
        p_organization_id: orgData.id,
        p_user_id: userId,
      });
      if (seedErr) {
        console.error('[register-trial] seed_services', seedErr);
      } else {
        console.log('[register-trial] servicios copiados:', seedCount);
      }
    } catch (e) {
      console.error('[register-trial] seed_services exception', e);
    }

    // En Vercel/serverless, si no haces await el proceso puede cerrarse al enviar el JSON y el SMTP no termina.
    const geoCountry = countryFromGeoHeader(req.headers.get('x-vercel-ip-country'));
    try {
      await notifyAdminNewUser({
        shopName: shop_name,
        userName: full_name,
        email,
        country: `${locale.countryName} (registro AR) · IP: ${geoCountry}`,
        planType: `Prueba gratuita (${PUBLIC_TRIAL_DAYS} días)`,
      });
    } catch (e) {
      console.error('[register-trial] notifyAdminNewUser', e);
    }

    return NextResponse.json({
      ok: true,
      trial_days: PUBLIC_TRIAL_DAYS,
      trial_ends_at: trialEndsAt,
      organization_id: orgData.id,
    });
  } catch (e: any) {
    console.error('[register-trial]', e);
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
