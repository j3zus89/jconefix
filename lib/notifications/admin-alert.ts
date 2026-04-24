import { createGmailTransporter, gmailSmtpFromHeader } from '@/lib/notifications/gmail-smtp';
import { NOTIFICATIONS_INBOX_EMAIL } from '@/lib/notifications/notifications-inbox';

/** Buzón de avisos al equipo (por defecto notificaciones@; Vercel: ADMIN_ALERT_EMAIL para sobrescribir). */
function adminAlertInbox(): string {
  const fromEnv = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  return NOTIFICATIONS_INBOX_EMAIL;
}

export interface NewUserAlertParams {
  shopName: string;
  userName: string;
  email: string;
  country: string;
  planType: string;
  registeredAt?: Date;
}

function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    Argentina: '🇦🇷',
    Mexico: '🇲🇽',
    México: '🇲🇽',
    Colombia: '🇨🇴',
    Chile: '🇨🇱',
    Uruguay: '🇺🇾',
    Peru: '🇵🇪',
    Perú: '🇵🇪',
    Bolivia: '🇧🇴',
    Venezuela: '🇻🇪',
    Ecuador: '🇪🇨',
    Paraguay: '🇵🇾',
  };
  return flags[country] ?? '🌍';
}

function buildHtml(params: Required<NewUserAlertParams>): string {
  const { shopName, userName, email, country, planType, registeredAt } = params;
  const flag = countryFlag(country);

  const formattedDate = registeredAt.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isPaid = !planType.toLowerCase().includes('prueba');
  const planBadgeColor = isPaid ? '#F5C518' : '#F5C518';
  const planBadgeBg = isPaid ? '#F5C518' : '#F5C518';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuevo registro JC ONE FIX</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#F5C518;border-radius:12px 12px 0 0;padding:28px 32px;">
              <p style="margin:0;font-size:13px;color:#F5C518;letter-spacing:2px;text-transform:uppercase;font-weight:600;">JC ONE FIX · Super Admin</p>
              <h1 style="margin:8px 0 0;font-size:24px;color:#ffffff;font-weight:700;">
                🚀 Nuevo Registro
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:32px;">

              <p style="margin:0 0 24px;font-size:15px;color:#334155;">
                ${flag} Un nuevo taller acaba de registrarse en <strong>JC ONE FIX</strong>. Aquí tienes todos los datos:
              </p>

              <!-- Data table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;color:#64748b;font-size:13px;width:130px;">Taller</td>
                  <td style="padding:12px 0;font-weight:700;color:#0f172a;font-size:15px;">${shopName}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;color:#64748b;font-size:13px;">Nombre</td>
                  <td style="padding:12px 0;color:#0f172a;font-size:14px;">${userName}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;color:#64748b;font-size:13px;">Email</td>
                  <td style="padding:12px 0;font-size:14px;">
                    <a href="mailto:${email}" style="color:#F5C518;text-decoration:none;font-weight:600;">${email}</a>
                  </td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;color:#64748b;font-size:13px;">País</td>
                  <td style="padding:12px 0;color:#0f172a;font-size:14px;">${flag} ${country}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;color:#64748b;font-size:13px;">Plan</td>
                  <td style="padding:12px 0;">
                    <span style="background:${planBadgeBg};color:${planBadgeColor};padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700;">${planType}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#64748b;font-size:13px;">Fecha y hora</td>
                  <td style="padding:12px 0;color:#0f172a;font-size:13px;">${formattedDate} (hora Madrid)</td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="margin-top:28px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">
                <a href="mailto:${email}?subject=¡Bienvenido a JC ONE FIX!"
                   style="display:inline-block;background:#F5C518;color:#F5C518;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
                  ✉️ Enviar mensaje de bienvenida
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">JC ONE FIX · Notificación automática para Super Admin</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an instant email alert to the Super Admin whenever a new user registers.
 * Runs fire-and-forget — never throws to the caller.
 */
export async function notifyAdminNewUser(params: NewUserAlertParams): Promise<void> {
  const transporter = createGmailTransporter();
  if (!transporter) {
    console.warn('[admin-alert] GMAIL_USER o GMAIL_APP_PASSWORD no configurados — notificación omitida');
    return;
  }

  const to = adminAlertInbox();
  const registeredAt = params.registeredAt ?? new Date();
  const fullParams: Required<NewUserAlertParams> = { ...params, registeredAt };
  const subject = `🚀 NUEVO REGISTRO: ${params.shopName} - ${params.country}`;

  try {
    await transporter.sendMail({
      from: gmailSmtpFromHeader(),
      to,
      subject,
      html: buildHtml(fullParams),
    });
    console.info(`[admin-alert] Enviado a ${to} — ${params.shopName} (${params.country})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin-alert] Error SMTP (revisa GMAIL_APP_PASSWORD de la cuenta notificaciones):', msg);
  }
}

/** Derive country name from Vercel geo header (ISO 3166-1 alpha-2) or fallback. */
export function countryFromGeoHeader(header: string | null): string {
  if (!header) return 'Argentina';
  const map: Record<string, string> = {
    ES: 'Argentina',
    AR: 'Argentina',
    MX: 'México',
    CO: 'Colombia',
    CL: 'Chile',
    UY: 'Uruguay',
    PE: 'Perú',
    BO: 'Bolivia',
    VE: 'Venezuela',
    EC: 'Ecuador',
    PY: 'Paraguay',
    US: 'Estados Unidos',
    GB: 'Reino Unido',
    FR: 'Francia',
    DE: 'Alemania',
    IT: 'Italia',
    PT: 'Portugal',
  };
  return map[header.toUpperCase()] ?? header;
}

export interface SupportMessageAlertParams {
  userName: string;
  userEmail: string;
  message: string;
  organizationName: string | null;
  sentAt?: Date;
}

function buildSupportAlertHtml(params: Required<SupportMessageAlertParams>): string {
  const { userName, userEmail, message, organizationName, sentAt } = params;
  const formattedDate = sentAt.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const orgInfo = organizationName ? `<span style="color:#64748b;">(${organizationName})</span>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuevo mensaje de soporte - JC ONE FIX</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#F5C518;border-radius:12px 12px 0 0;padding:28px 32px;">
              <p style="margin:0;font-size:13px;color:#F5C518;letter-spacing:2px;text-transform:uppercase;font-weight:600;">JC ONE FIX · Super Admin</p>
              <h1 style="margin:8px 0 0;font-size:24px;color:#ffffff;font-weight:700;">
                Nuevo mensaje de soporte
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:32px;">

              <p style="margin:0 0 24px;font-size:15px;color:#334155;">
                Un cliente ha enviado un mensaje al chat de soporte:
              </p>

              <!-- Data table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;color:#64748b;font-size:13px;width:130px;">Cliente</td>
                  <td style="padding:12px 0;font-weight:700;color:#0f172a;font-size:15px;">${userName}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;color:#64748b;font-size:13px;">Email</td>
                  <td style="padding:12px 0;font-size:14px;">
                    <a href="mailto:${userEmail}" style="color:#F5C518;text-decoration:none;font-weight:600;">${userEmail}</a>
                  </td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;color:#64748b;font-size:13px;">Fecha</td>
                  <td style="padding:12px 0;color:#0f172a;font-size:13px;">${formattedDate} (hora Madrid)</td>
                </tr>
              </table>

              <!-- Message -->
              <div style="margin-top:24px;padding:20px;background:#f8fafc;border-radius:8px;border-left:4px solid #F5C518;">
                <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Mensaje</p>
                <p style="margin:0;font-size:15px;color:#0f172a;line-height:1.5;white-space:pre-wrap;">${message}</p>
              </div>

              <!-- CTA -->
              <div style="margin-top:28px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">
                <a href="https://jconefix.com.ar/admin/app/soporte"
                   style="display:inline-block;background:#F5C518;color:#F5C518;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
                  Ir al panel de soporte
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">JC ONE FIX · Notificación automática para Super Admin</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an email alert to the Super Admin when a customer sends a support message.
 * Runs fire-and-forget — never throws to the caller.
 */
export async function notifyAdminSupportMessage(params: SupportMessageAlertParams): Promise<void> {
  const transporter = createGmailTransporter();
  if (!transporter) {
    console.warn('[admin-alert] GMAIL_USER o GMAIL_APP_PASSWORD no configurados — notificación de soporte omitida');
    return;
  }

  const to = adminAlertInbox();
  const sentAt = params.sentAt ?? new Date();
  const fullParams: Required<SupportMessageAlertParams> = { ...params, sentAt };
  const subject = ` Nuevo mensaje de soporte: ${params.userName}`;

  try {
    await transporter.sendMail({
      from: gmailSmtpFromHeader(),
      to,
      subject,
      html: buildSupportAlertHtml(fullParams),
    });
    console.info(`[admin-alert] Notificación de soporte enviada a ${to} — ${params.userName}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin-alert] Error SMTP al enviar notificación de soporte:', msg);
  }
}
