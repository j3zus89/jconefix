import {
  pickBillingPreExpiryEmailReminder,
  type OrgBillingSnapshot,
} from '@/lib/billing-expiry-warning';
import { createGmailTransporter, gmailSmtpFromHeader } from '@/lib/notifications/gmail-smtp';
import { DEFAULT_PUBLIC_SITE_URL } from '@/lib/site-canonical';

function formatEsDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function buildOwnerReminderHtml(params: {
  shopName: string;
  periodEndsLabel: string;
  daysPhrase: string;
  kindLabel: string;
  checkoutUrl: string;
}): string {
  const { shopName, periodEndsLabel, daysPhrase, kindLabel, checkoutUrl } = params;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#F5C518;border-radius:12px 12px 0 0;padding:20px 28px;">
            <p style="margin:0;font-size:12px;color:#F5C518;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">JC ONE FIX · Renovación</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Recordatorio: ${daysPhrase} para renovar</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.55;">
              Hola,<br/><br/>
              En el taller <strong>${shopName}</strong> tu <strong>${kindLabel}</strong> <strong>vence el ${periodEndsLabel}</strong>.
              Quedan <strong>${daysPhrase}</strong> para renovar y seguir sin interrupciones.
            </p>
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.5;">
              En esa fecha y hora el acceso al panel se pausa hasta que renueves con <strong>Mercado Pago</strong>. Verás un aviso en el panel los últimos días antes del vencimiento.
              Tus datos se conservan al menos 12 meses.
            </p>
            <div style="text-align:center;margin-top:24px;">
              <a href="${checkoutUrl}" style="display:inline-block;background:#F5C518;color:#F5C518;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
                Renovar / Contratar ahora
              </a>
            </div>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
              Si el botón no funciona, copia este enlace en el navegador:<br/>
              <span style="word-break:break-all;color:#64748b;">${checkoutUrl}</span>
            </p>
          </td>
        </tr>
        <tr><td style="padding:16px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">JC ONE FIX · Mensaje automático</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendBillingReminderToOwner(params: {
  toEmail: string;
  shopName: string;
  org: OrgBillingSnapshot & {
    billing_reminder_sent_for_trial_end?: string | null;
    billing_reminder_sent_for_license_end?: string | null;
  };
}): Promise<{ sent: boolean; reason?: string; deadlineIso?: string; kind?: 'trial' | 'license' }> {
  const transporter = createGmailTransporter();
  if (!transporter) {
    return { sent: false, reason: 'no_smtp' };
  }

  const snap: OrgBillingSnapshot = {
    subscription_status: params.org.subscription_status,
    trial_ends_at: params.org.trial_ends_at,
    license_expires_at: params.org.license_expires_at,
    license_unlimited: params.org.license_unlimited,
  };

  const reminder = pickBillingPreExpiryEmailReminder([snap]);
  if (!reminder) {
    return { sent: false, reason: 'not_in_window' };
  }

  if (reminder.kind === 'trial') {
    const sentFor = params.org.billing_reminder_sent_for_trial_end;
    if (sentFor && params.org.trial_ends_at && sentFor === params.org.trial_ends_at) {
      return { sent: false, reason: 'already_sent_trial' };
    }
  } else {
    const sentFor = params.org.billing_reminder_sent_for_license_end;
    if (sentFor && params.org.license_expires_at && sentFor === params.org.license_expires_at) {
      return { sent: false, reason: 'already_sent_license' };
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '').trim();
  const origin = baseUrl.startsWith('http')
    ? baseUrl
    : baseUrl
      ? `https://${baseUrl}`
      : DEFAULT_PUBLIC_SITE_URL;
  const checkoutUrl = `${origin}${reminder.ctaHref}`;

  const periodEndMs = new Date(reminder.periodEndsAt).getTime();
  const nowMs = Date.now();
  const msLeft = Math.max(0, periodEndMs - nowMs);
  const hoursTotal = Math.max(1, Math.ceil(msLeft / (60 * 60 * 1000)));
  const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
  const hoursRemainder = Math.ceil((msLeft - days * 24 * 60 * 60 * 1000) / (60 * 60 * 1000));

  let daysPhrase: string;
  if (days >= 1) {
    daysPhrase =
      hoursRemainder > 0 && days < 3
        ? `${days} día${days > 1 ? 's' : ''} y unas ${hoursRemainder} h`
        : `${days} día${days > 1 ? 's' : ''}`;
  } else {
    daysPhrase = hoursTotal === 1 ? 'menos de 2 horas' : `unas ${hoursTotal} horas`;
  }

  const periodEndsLabel = formatEsDate(reminder.periodEndsAt);
  const kindLabel = reminder.kind === 'trial' ? 'periodo de prueba' : 'licencia pagada';

  const html = buildOwnerReminderHtml({
    shopName: params.shopName,
    periodEndsLabel,
    daysPhrase,
    kindLabel,
    checkoutUrl,
  });

  try {
    await transporter.sendMail({
      from: gmailSmtpFromHeader(),
      to: params.toEmail,
      subject: `JC ONE FIX — Quedan ${daysPhrase} para renovar (${params.shopName})`,
      html,
    });
    return { sent: true, deadlineIso: reminder.periodEndsAt, kind: reminder.kind };
  } catch (e) {
    console.error('[billing-reminder-email]', e);
    return { sent: false, reason: 'send_failed' };
  }
}
