import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: port === 587 || port === 25,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendVerificationCode(
  to: string,
  code: string
): Promise<{ sent: boolean; error?: string }> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM ?? process.env.MAIL_FROM ?? 'noreply@school.com';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">School Timetable</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Verification Code</p>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
    <p>Hello,</p>
    <p>Your verification code is:</p>
    <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.2em; margin: 18px 0;">${code}</div>
    <p style="color: #64748b;">Use this code within the next 10 minutes to reset your password.</p>
  </div>
</body>
</html>`;

  if (!transporter) {
    console.warn('[mailer] SMTP not configured — verification email skipped for', to);
    return { sent: false, error: 'SMTP not configured' };
  }

  try {
    await transporter.verify();
  } catch (err) {
    console.error('[mailer] SMTP transporter verification failed:', err);
    return {
      sent: false,
      error: err instanceof Error ? `SMTP verify failed: ${err.message}` : 'SMTP verify failed',
    };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: 'Your verification code',
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send verification code:', err);
    return {
      sent: false,
      error: err instanceof Error ? err.message : 'Send failed',
    };
  }
}

export async function sendTeacherCredentials(
  to: string,
  name: string,
  schoolName: string,
  password: string,
  loginUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM ?? process.env.MAIL_FROM ?? 'noreply@school.com';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${schoolName}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Teacher Portal Access</p>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your teacher account has been created. Use the credentials below to sign in:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 0; color: #64748b;">Login URL</td><td><a href="${loginUrl}">${loginUrl}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td><strong>${to}</strong></td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Temporary password</td><td><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${password}</code></td></tr>
    </table>
    <p style="font-size: 13px; color: #64748b;">Please change your password after your first login.</p>
  </div>
</body>
</html>`;

  if (!transporter) {
    console.warn('[mailer] SMTP not configured — credentials email skipped for', to);
    return { sent: false, error: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `${schoolName} — Your teacher portal credentials`,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send credentials:', err);
    return {
      sent: false,
      error: err instanceof Error ? err.message : 'Send failed',
    };
  }
}
