import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from './logger';

/**
 * Transactional mail over SMTP (a Gmail account with an App Password in
 * production). Everything comes from the environment, so a developer without
 * credentials simply gets a logged skip instead of a crash.
 */

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
}

const readSmtpConfig = (): SmtpConfig | null => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;

  if (!host || !user || !rawPass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);

  return {
    host,
    port,
    secure: port === 465,
    // Google displays app passwords in spaced groups; the spaces are not part of the secret.
    auth: { user, pass: rawPass.replace(/\s+/g, '') },
  };
};

let transporter: Transporter | null = null;

export const isMailConfigured = (): boolean => readSmtpConfig() !== null;

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(input: MailInput): Promise<boolean> {
  const config = readSmtpConfig();
  if (!config) {
    logger.warn(`SMTP is not configured; skipped "${input.subject}" email to ${input.to}`);
    return false;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport(config);
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? config.auth.user,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return true;
}

export async function sendEmailVerificationMail(input: {
  to: string;
  displayName?: string | null;
  verifyUrl: string;
}): Promise<boolean> {
  const greeting = input.displayName?.trim() || 'there';

  const text = [
    `Hi ${greeting},`,
    '',
    'Confirm this email address to activate your QVANTA account:',
    input.verifyUrl,
    '',
    'The link expires in 24 hours. If you did not create a QVANTA account, ignore this message.',
  ].join('\n');

  const html = `
    <div style="background:#0c0a0c;padding:32px 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#151114;border:1px solid #2a2226;border-radius:16px;padding:32px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#d8ad96;">QVANTA</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#f5eef0;">Confirm your email address</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#cbbfc4;">
          Hi ${greeting}, confirm this address to activate your account and sign in to the quantum learning lab.
        </p>
        <a href="${input.verifyUrl}" style="display:inline-block;background:#8f102d;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;">
          Verify email address
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#8d8187;">
          The link expires in 24 hours. If the button does not work, paste this into your browser:<br />
          <span style="color:#d8ad96;word-break:break-all;">${input.verifyUrl}</span>
        </p>
      </div>
    </div>
  `;

  return sendMail({
    to: input.to,
    subject: 'Confirm your QVANTA email address',
    text,
    html,
  });
}
