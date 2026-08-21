import nodemailer from 'nodemailer';

const BRAND_NAME = 'TimetablePro';
const BRAND_PRIMARY = '#2563eb';
const BRAND_SECONDARY = '#7c3aed';
const DARK_TEXT = '#0f172a';
const MUTED_TEXT = '#475569';
const SOFT_BG = '#f8fafc';
const BORDER = '#e2e8f0';

function buildEmailLayout({
  title,
  subtitle,
  lead,
  content,
  footerNote,
}: {
  title: string;
  subtitle: string;
  lead: string;
  content: string;
  footerNote?: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background:#eef4ff; font-family: Arial, Helvetica, sans-serif; color:${DARK_TEXT};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${SOFT_BG}; width:100%; margin:0; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid ${BORDER}; border-radius:20px; overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_SECONDARY}); padding:28px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:12px; letter-spacing:1.5px; color:rgba(255,255,255,0.8); text-transform:uppercase; font-weight:700;">
                      ${BRAND_NAME}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:8px; font-size:28px; line-height:1.2; color:#ffffff; font-weight:700;">
                      ${title}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:8px; font-size:14px; line-height:1.5; color:rgba(255,255,255,0.9);">
                      ${subtitle}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px; background:#ffffff;">
                <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:${MUTED_TEXT};">
                  ${lead}
                </p>
                ${content}
                ${footerNote ? `<p style="margin:24px 0 0; font-size:12px; line-height:1.6; color:${MUTED_TEXT};">${footerNote}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px; background:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BORDER};">
                  <tr>
                    <td style="padding-top:20px; font-size:12px; line-height:1.6; color:${MUTED_TEXT}; text-align:center;">
                      © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.<br />
                      Built for smarter school scheduling and classroom management.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

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

  const html = buildEmailLayout({
    title: 'Verify your email',
    subtitle: 'Secure sign-in and account verification',
    lead: 'Hello,',
    content: `
      <p style="margin:0 0 18px; font-size:15px; line-height:1.7; color:${MUTED_TEXT};">
        Use the code below to complete your verification. This code is valid for 10 minutes.
      </p>
      <div style="background:#f8fafc; border:1px solid ${BORDER}; border-radius:16px; padding:24px; text-align:center; margin:20px 0;">
        <div style="font-size:12px; letter-spacing:1.6px; text-transform:uppercase; color:${MUTED_TEXT}; font-weight:700; margin-bottom:12px;">
          Verification code
        </div>
        <div style="font-size:34px; line-height:1; letter-spacing:10px; font-weight:800; color:${DARK_TEXT};">${code}</div>
      </div>
      <p style="margin:0; font-size:14px; line-height:1.7; color:${MUTED_TEXT};">
        If you did not request this, you can safely ignore this email.
      </p>
    `,
    footerNote: 'For your security, never share this code with anyone.'
  });

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

  const html = buildEmailLayout({
    title: 'Welcome to the teacher portal',
    subtitle: `${schoolName} • secure access`,
    lead: `Hello ${name},`,
    content: `
      <p style="margin:0 0 18px; font-size:15px; line-height:1.7; color:${MUTED_TEXT};">
        Your teacher account has been created successfully. Use the details below to log in and begin managing your timetable and classroom workflow.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER}; border-radius:16px; overflow:hidden; background:#f8fafc; margin:20px 0;">
        <tr>
          <td style="padding:14px 16px; border-bottom:1px solid ${BORDER}; font-size:12px; letter-spacing:1.2px; text-transform:uppercase; color:${MUTED_TEXT}; font-weight:700; background:#eef4ff;">
            Account details
          </td>
        </tr>
        <tr>
          <td style="padding:16px; font-size:14px; color:${DARK_TEXT};">
            <div style="margin-bottom:10px;"><strong style="display:inline-block; width:110px; color:${MUTED_TEXT};">Login URL</strong><a href="${loginUrl}" style="color:${BRAND_PRIMARY}; text-decoration:none;">${loginUrl}</a></div>
            <div style="margin-bottom:10px;"><strong style="display:inline-block; width:110px; color:${MUTED_TEXT};">Email</strong>${to}</div>
            <div><strong style="display:inline-block; width:110px; color:${MUTED_TEXT};">Password</strong><code style="background:#ffffff; border:1px solid ${BORDER}; border-radius:8px; padding:6px 10px; font-size:13px; color:${DARK_TEXT};">${password}</code></div>
          </td>
        </tr>
      </table>
      <p style="margin:0; font-size:14px; line-height:1.7; color:${MUTED_TEXT};">
        Please change your password after your first login for security.
      </p>
    `,
    footerNote: 'Need help? Contact your school admin or support team.'
  });

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
