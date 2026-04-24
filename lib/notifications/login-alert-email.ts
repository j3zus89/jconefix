import { createGmailTransporter, gmailSmtpFromHeader } from '@/lib/notifications/gmail-smtp';
import { NOTIFICATIONS_INBOX_EMAIL } from '@/lib/notifications/notifications-inbox';

function adminAlertInbox(): string {
  const fromEnv = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  return NOTIFICATIONS_INBOX_EMAIL;
}

export interface PanelLoginEmailParams {
  orgNameSubject: string;
  userDisplayName: string;
  email: string;
  orgNameBody: string;
  countryLabel: string;
  /** Ciudad, provincia/región y país según la IP de la conexión (aprox.). */
  connectionLocationLine: string;
  device: string | null;
  at: Date;
  sourceLabel: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(p: PanelLoginEmailParams): string {
  const formattedDate = p.at.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const user = escapeHtml(p.userDisplayName);
  const mail = escapeHtml(p.email);
  const org = escapeHtml(p.orgNameBody);
  const country = escapeHtml(p.countryLabel);
  const connLoc = escapeHtml(p.connectionLocationLine || '—');
  const dev = escapeHtml((p.device || '—').slice(0, 800));
  const src = escapeHtml(p.sourceLabel);

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>Nueva conexión JC ONE FIX</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table width="560" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="background:#F5C518;border-radius:12px 12px 0 0;padding:20px 24px;">
          <p style="margin:0;font-size:12px;color:#F5C518;text-transform:uppercase;letter-spacing:1px;">JC ONE FIX · Alerta de acceso</p>
          <h1 style="margin:6px 0 0;font-size:20px;color:#fff;">Nueva conexión al panel</h1>
        </td></tr>
        <tr><td style="padding:24px;font-size:14px;color:#334155;line-height:1.5;">
          <table width="100%" style="border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;width:120px;">Usuario</td>
                <td style="padding:8px 0;"><strong>${user}</strong><br/><a href="mailto:${mail}" style="color:#F5C518;">${mail}</a></td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Taller</td>
                <td style="padding:8px 0;"><strong>${org}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#64748b;vertical-align:top;">Ubicación de la conexión</td>
                <td style="padding:8px 0;"><strong>${connLoc}</strong><br/><span style="font-size:12px;color:#64748b;">Por IP (ciudad, provincia o región y país cuando la base lo permite; puede variar con VPN o datos móviles).</span></td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">País del taller</td>
                <td style="padding:8px 0;">${country}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Origen</td>
                <td style="padding:8px 0;">${src}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Fecha y hora</td>
                <td style="padding:8px 0;">${escapeHtml(formattedDate)} <span style="color:#94a3b8;">(Madrid)</span></td></tr>
            <tr><td style="padding:8px 0;color:#64748b;vertical-align:top;">Dispositivo</td>
                <td style="padding:8px 0;font-size:12px;word-break:break-word;">${dev}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 24px 20px;text-align:center;font-size:11px;color:#94a3b8;">Notificación automática</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Correo al buzón operativo (mismo SMTP que otros avisos). Devuelve si el envío tuvo éxito.
 */
export async function notifyAdminPanelLogin(params: PanelLoginEmailParams): Promise<boolean> {
  const transporter = createGmailTransporter();
  if (!transporter) {
    console.warn('[login-alert] GMAIL_USER / GMAIL_APP_PASSWORD no configurados — aviso de login omitido');
    return false;
  }

  const to = adminAlertInbox();
  const subject = `🟢 Nueva Conexión Detectada - ${params.orgNameSubject}`;

  try {
    await transporter.sendMail({
      from: gmailSmtpFromHeader(),
      to,
      subject,
      html: buildHtml(params),
    });
    console.info(`[login-alert] Enviado a ${to} — ${params.email}`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[login-alert] Error SMTP:', msg);
    return false;
  }
}
