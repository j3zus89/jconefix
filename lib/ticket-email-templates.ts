/**
 * Plantillas HTML de correo para tickets — diseño unificado, datos de cliente arriba,
 * bloque de mensaje personalizado y pie con datos del taller.
 */

export type ShopEmailSettings = {
  shop_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  registration_number?: string | null;
  currency_symbol?: string | null;
  country?: string | null;
};

export type TicketEmailContext = {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerOrg?: string | null;
  deviceType: string;
  ticketNumber: string;
  imei?: string | null;
  serial?: string | null;
  total: number;
  paid: number;
  due: number;
  /** Texto del textarea "Nota adicional para el cliente" */
  customMessage?: string;
};

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\r\n|\n|\r/g, '<br/>');
}

function fmtMoney(n: number, sym = '€'): string {
  const formatted = n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sym} ${formatted}`;
}

function companyFooterBlock(shop: ShopEmailSettings): string {
  const name = escapeHtml(shop.shop_name?.trim() || 'Centro de reparaciones');
  const addr = escapeHtml(shop.address?.trim() || '');
  const mail = shop.email?.trim() || '';
  const phone = escapeHtml(shop.phone?.trim() || '');
  const cif = escapeHtml(shop.registration_number?.trim() || '');

  const mailHref = mail ? `mailto:${mail.replace(/[\s<>"']/g, '')}` : '';
  const mailRow = mail
    ? `<a href="${mailHref}" style="color:#F5C518;text-decoration:none;">${escapeHtml(mail)}</a>`
    : '<span style="color:#64748b;">—</span>';
  const phoneRow = phone
    ? `<a href="tel:${phone.replace(/\s/g, '')}" style="color:#e2e8f0;text-decoration:none;">${phone}</a>`
    : '<span style="color:#64748b;">—</span>';

  return `
  <tr>
    <td style="background:linear-gradient(180deg,#0f172a 0%,#020617 100%);padding:28px 36px;border-radius:0 0 16px 16px;border-top:3px solid #F5C518;">
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#F5C518;font-weight:600;">Datos del taller</p>
      <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">${name}</p>
      ${addr ? `<p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#94a3b8;">${addr}</p>` : ''}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;">
        <tr>
          <td style="padding:4px 20px 4px 0;vertical-align:top;">
            <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Email</p>
            <p style="margin:4px 0 0;font-size:14px;">${mailRow}</p>
          </td>
          <td style="padding:4px 0;vertical-align:top;">
            <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Teléfono</p>
            <p style="margin:4px 0 0;font-size:14px;color:#e2e8f0;">${phoneRow}</p>
          </td>
        </tr>
      </table>
      ${cif ? `<p style="margin:14px 0 0;font-size:11px;color:#64748b;">${shop.country === 'AR' ? 'CUIT' : 'N.º registro / CIF'}: ${cif}</p>` : ''}
    </td>
  </tr>`;
}

function customerBlock(ctx: TicketEmailContext): string {
  const lines: string[] = [];
  if (ctx.customerEmail?.trim()) {
    lines.push(
      `<tr><td style="padding:2px 0;font-size:13px;color:#334155;"><span style="color:#64748b;width:72px;display:inline-block;">Email</span> <a href="mailto:${escapeHtml(ctx.customerEmail.trim())}" style="color:#F5C518;text-decoration:none;">${escapeHtml(ctx.customerEmail.trim())}</a></td></tr>`
    );
  }
  if (ctx.customerPhone?.trim()) {
    lines.push(
      `<tr><td style="padding:2px 0;font-size:13px;color:#334155;"><span style="color:#64748b;width:72px;display:inline-block;">Teléfono</span> ${escapeHtml(ctx.customerPhone.trim())}</td></tr>`
    );
  }
  if (ctx.customerAddress?.trim()) {
    lines.push(
      `<tr><td style="padding:2px 0;font-size:13px;color:#334155;line-height:1.5;"><span style="color:#64748b;width:72px;display:inline-block;vertical-align:top;">Dirección</span> ${escapeHtml(ctx.customerAddress.trim())}</td></tr>`
    );
  }
  if (ctx.customerOrg?.trim()) {
    lines.push(
      `<tr><td style="padding:2px 0;font-size:13px;color:#334155;"><span style="color:#64748b;width:72px;display:inline-block;">Empresa</span> ${escapeHtml(ctx.customerOrg.trim())}</td></tr>`
    );
  }

  return `
  <tr>
    <td style="padding:0 36px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(90deg,#F5C518 0%,#D4A915 100%);padding:10px 18px;">
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.9);">Cliente</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px 20px;">
            <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">${escapeHtml(ctx.customerName)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${lines.join('')}</table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function customMessageBlock(ctx: TicketEmailContext): string {
  const raw = ctx.customMessage?.trim();
  if (!raw) {
    return `
  <tr>
    <td style="padding:0 36px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #cbd5e1;border-radius:12px;background:#fafafa;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;">Mensaje del taller</p>
            <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;font-style:italic;">Puedes añadir una nota personalizada desde el panel antes de enviar.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
  }
  return `
  <tr>
    <td style="padding:0 36px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a;border-radius:12px;background:linear-gradient(180deg,#fffbeb 0%,#fff7ed 100%);">
        <tr>
          <td style="padding:16px 18px;border-left:4px solid #f59e0b;border-radius:12px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#b45309;">Mensaje del taller</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#422006;">${nl2br(raw)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function deviceAndTotalsRow(
  ctx: TicketEmailContext,
  statusBadge: { text: string; bg: string; color: string; border: string },
  shop?: ShopEmailSettings
): string {
  const currSym = shop?.currency_symbol || '€';
  const idLine = ctx.imei?.trim()
    ? `IMEI: ${escapeHtml(ctx.imei.trim())}`
    : ctx.serial?.trim()
      ? `N.º serie: ${escapeHtml(ctx.serial.trim())}`
      : '';

  return `
  <tr>
    <td style="padding:8px 36px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${statusBadge.bg};border:1px solid ${statusBadge.border};border-radius:12px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Equipo en taller</p>
            <p style="margin:6px 0 2px;font-size:17px;font-weight:700;color:#0f172a;">${escapeHtml(ctx.deviceType)}</p>
            ${idLine ? `<p style="margin:4px 0 0;font-size:12px;color:#475569;font-family:ui-monospace,monospace;">${idLine}</p>` : ''}
            <p style="margin:10px 0 0;font-size:12px;color:#64748b;">Ticket <strong style="color:#0f172a;">#${escapeHtml(ctx.ticketNumber)}</strong></p>
          </td>
          <td style="padding:16px 20px;text-align:right;vertical-align:middle;width:1%;white-space:nowrap;">
            <span style="display:inline-block;padding:8px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:${statusBadge.bg};color:${statusBadge.color};border:1px solid ${statusBadge.border};">${escapeHtml(statusBadge.text)}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 36px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="right" style="border-collapse:collapse;">
        <tr><td style="padding:6px 16px;font-size:13px;color:#64748b;text-align:right;">Total</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${fmtMoney(ctx.total, currSym)}</td></tr>
        <tr><td style="padding:6px 16px;font-size:13px;color:#64748b;text-align:right;">Pagado</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#059669;text-align:right;">${fmtMoney(ctx.paid, currSym)}</td></tr>
        <tr><td style="padding:6px 16px;font-size:13px;color:#64748b;text-align:right;border-top:1px solid #e2e8f0;">Pendiente</td><td style="padding:6px 0;font-size:14px;font-weight:700;color:#0f172a;text-align:right;border-top:1px solid #e2e8f0;">${fmtMoney(ctx.due, currSym)}</td></tr>
      </table>
    </td>
  </tr>`;
}

function heroRow(
  gradient: string,
  illustration: string,
  eyebrow: string,
  headline: string,
  sub: string
): string {
  return `
  <tr>
    <td style="background:${gradient};padding:36px 32px 32px;text-align:center;border-radius:16px 16px 0 0;position:relative;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding-bottom:20px;">
            ${illustration}
          </td>
        </tr>
        <tr>
          <td align="center">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.75);">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:1.2;">${escapeHtml(headline)}</h1>
            <p style="margin:0;font-size:15px;line-height:1.55;color:rgba(255,255,255,0.9);max-width:440px;margin-left:auto;margin-right:auto;">${escapeHtml(sub)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/** Ilustraciones SVG inline (sin red externa) — una por tono de plantilla */
const ILLU = {
  success: `<svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <circle cx="56" cy="56" r="52" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
    <path d="M36 58l12 12 28-32" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="56" cy="56" r="46" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="6 8" fill="none"/>
  </svg>`,
  regret: `<svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <rect x="16" y="16" width="80" height="80" rx="20" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
    <path d="M42 42l28 28M70 42L42 70" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.12)" stroke-width="1" fill="none"/>
  </svg>`,
  quote: `<svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <rect x="28" y="36" width="40" height="52" rx="8" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
    <path d="M36 48h24M36 58h18M36 68h22" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
    <circle cx="76" cy="76" r="18" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
    <path d="M70 76h12M76 70v12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  work: `<svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <circle cx="56" cy="40" r="22" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
    <path d="M40 52h32v8H40v-8zM44 60v12h24V60" fill="rgba(255,255,255,0.12)" stroke="white" stroke-width="2"/>
    <circle cx="56" cy="40" r="8" fill="none" stroke="white" stroke-width="2.5"/>
    <path d="M32 78h48" stroke="rgba(255,255,255,0.35)" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 6"/>
  </svg>`,
  pickup: `<svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <path d="M36 48h40l8 12v20H28V60l8-12z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M32 80h48" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="44" cy="88" r="4" fill="white"/><circle cx="68" cy="88" r="4" fill="white"/>
    <path d="M48 52h16v10H48V52z" fill="rgba(255,255,255,0.25)"/>
  </svg>`,
  lock: `<svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <rect x="32" y="50" width="48" height="40" rx="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
    <path d="M40 50V38a16 16 0 0128 0v12" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="56" cy="68" r="6" fill="none" stroke="white" stroke-width="2"/>
    <path d="M56 74v6" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
};

function wrapEmail(innerRows: string, shop: ShopEmailSettings): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"></head>
<body style="margin:0;padding:0;background:#e8edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf3;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(15,23,42,0.18);">
          ${innerRows}
          ${companyFooterBlock(shop)}
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">Este mensaje está relacionado con tu reparación. Si no esperabas este correo, puedes ignorarlo.</p>
      </td>
    </tr>
  </table>
</body></html>`;
}

export type EmailTemplateDef = {
  id: string;
  name: string;
  subject: string;
  html: (ctx: TicketEmailContext, shop: ShopEmailSettings) => string;
};

export function buildTicketEmailTemplates(): EmailTemplateDef[] {
  return [
    {
      id: 'reparado',
      name: 'Su dispositivo ha sido reparado con éxito',
      subject: 'Su dispositivo ha sido reparado con éxito',
      html: (ctx, shop) => {
        const inner = `
${heroRow(
          'linear-gradient(145deg, #F5C518 0%, #0e7490 42%, #0369a1 100%)',
          ILLU.success,
          'Buenas noticias',
          `¡Hola, ${ctx.customerName}!`,
          `Tu ${ctx.deviceType} ya está listo. Revisa los datos y, cuando quieras, pasa por el taller con este número de ticket.`
        )}
${customerBlock(ctx)}
${customMessageBlock(ctx)}
${deviceAndTotalsRow(ctx, {
          text: 'Reparado',
          bg: '#ecfdf5',
          color: '#047857',
          border: '#a7f3d0',
        }, shop)}
`;
        return wrapEmail(inner, shop);
      },
    },
    {
      id: 'no_reparacion',
      name: 'Lo sentimos, tu dispositivo no tiene reparación',
      subject: 'Diagnóstico completado: sin reparación posible',
      html: (ctx, shop) => {
        const inner = `
${heroRow(
          'linear-gradient(145deg, #be123c 0%, #9f1239 40%, #4c0519 100%)',
          ILLU.regret,
          'Información importante',
          'Lo sentimos',
          `Tras el diagnóstico, tu ${ctx.deviceType} no admite reparación económica o técnica. Te explicamos los siguientes pasos abajo.`
        )}
${customerBlock(ctx)}
${customMessageBlock(ctx)}
${deviceAndTotalsRow(ctx, {
          text: 'Sin reparación',
          bg: '#fff1f2',
          color: '#be123c',
          border: '#fecdd3',
        }, shop)}
`;
        return wrapEmail(inner, shop);
      },
    },
    {
      id: 'presupuesto',
      name: 'Pendiente de aceptación de presupuesto del dispositivo',
      subject: 'Presupuesto listo para aprobación - Ticket #{{ticket}}',
      html: (ctx, shop) => {
        const inner = `
${heroRow(
          'linear-gradient(145deg, #d97706 0%, #b45309 45%, #78350f 100%)',
          ILLU.quote,
          'Acción requerida',
          'Presupuesto listo',
          `Hemos valorado la reparación de tu ${ctx.deviceType}. Necesitamos tu confirmación para continuar con el trabajo.`
        )}
${customerBlock(ctx)}
${customMessageBlock(ctx)}
${deviceAndTotalsRow(ctx, {
          text: 'Esperando tu OK',
          bg: '#fffbeb',
          color: '#b45309',
          border: '#fde68a',
        }, shop)}
`;
        return wrapEmail(inner, shop);
      },
    },
    {
      id: 'en_proceso',
      name: 'Reparación en progreso',
      subject: 'Tu reparación está en progreso - Ticket #{{ticket}}',
      html: (ctx, shop) => {
        const inner = `
${heroRow(
          'linear-gradient(145deg, #0891b2 0%, #F5C518 50%, #155e75 100%)',
          ILLU.work,
          'Actualización',
          'Tu equipo está en el taller',
          `Nuestro equipo está trabajando en tu ${ctx.deviceType}. Te avisaremos en cuanto haya novedades.`
        )}
${customerBlock(ctx)}
${customMessageBlock(ctx)}
${deviceAndTotalsRow(ctx, {
          text: 'En proceso',
          bg: '#ecfeff',
          color: '#0e7490',
          border: '#a5f3fc',
        }, shop)}
`;
        return wrapEmail(inner, shop);
      },
    },
    {
      id: 'recogida',
      name: 'Recogida reparación',
      subject: 'Tu dispositivo está listo para recoger - Ticket #{{ticket}}',
      html: (ctx, shop) => {
        const inner = `
${heroRow(
          'linear-gradient(145deg, #059669 0%, #047857 45%, #064e3b 100%)',
          ILLU.pickup,
          'Listo',
          'Puedes pasar a recogerlo',
          `Tu ${ctx.deviceType} está preparado para entrega. Recuerda identificarte con el número de ticket.`
        )}
${customerBlock(ctx)}
${customMessageBlock(ctx)}
${deviceAndTotalsRow(ctx, {
          text: 'Listo para recoger',
          bg: '#d1fae5',
          color: '#047857',
          border: '#6ee7b7',
        }, shop)}
`;
        return wrapEmail(inner, shop);
      },
    },
    {
      id: 'codigo_seguridad',
      name: 'Código de seguridad',
      subject: 'Necesitamos el código de acceso de tu dispositivo',
      html: (ctx, shop) => {
        const inner = `
${heroRow(
          'linear-gradient(145deg, #334155 0%, #1e293b 50%, #0f172a 100%)',
          ILLU.lock,
          'Confidencial',
          'Necesitamos tu código',
          `Para avanzar con el diagnóstico de tu ${ctx.deviceType}, indícanos el PIN o patrón de desbloqueo respondiendo a este correo o por teléfono.`
        )}
${customerBlock(ctx)}
${customMessageBlock(ctx)}
${deviceAndTotalsRow(ctx, {
          text: 'Acción requerida',
          bg: '#f1f5f9',
          color: '#334155',
          border: '#cbd5e1',
        }, shop)}
`;
        return wrapEmail(inner, shop);
      },
    },
  ];
}

export function buildTicketEmailContext(
  ticket: {
    customers?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      organization?: string | null;
    } | null;
    device_type?: string | null;
    ticket_number?: string | null;
    imei?: string | null;
    serial_number?: string | null;
    estimated_cost?: number | null;
    final_cost?: number | null;
  },
  payments: { amount: number }[],
  customMessage?: string
): TicketEmailContext {
  const total = ticket.final_cost ?? ticket.estimated_cost ?? 0;
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const due = Math.max(0, total - paid);

  return {
    customerName: ticket.customers?.name?.trim() || 'Cliente',
    customerEmail: ticket.customers?.email,
    customerPhone: ticket.customers?.phone,
    customerAddress: ticket.customers?.address,
    customerOrg: ticket.customers?.organization,
    deviceType: ticket.device_type?.trim() || 'Dispositivo',
    ticketNumber: ticket.ticket_number?.trim() || '—',
    imei: ticket.imei,
    serial: ticket.serial_number,
    total,
    paid,
    due,
    customMessage: customMessage?.trim() || '',
  };
}
