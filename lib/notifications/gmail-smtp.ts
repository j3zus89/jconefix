import nodemailer from 'nodemailer';

/** Transport Gmail con GMAIL_USER + GMAIL_APP_PASSWORD (misma cuenta para todos los envíos del proyecto). */
export function createGmailTransporter(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

/**
 * Cabecera From. Por defecto nombre de marca + GMAIL_USER.
 * Opcional: SMTP_FROM completo si tu proveedor lo permite (alias verificado, etc.).
 */
export function gmailSmtpFromHeader(): string {
  const explicit = process.env.SMTP_FROM?.trim();
  if (explicit) return explicit;
  const user = process.env.GMAIL_USER ?? '';
  return `"JC ONE FIX" <${user}>`;
}
