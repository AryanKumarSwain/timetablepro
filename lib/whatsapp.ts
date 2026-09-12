/**
 * WhatsApp Cloud API Integration
 * Sends teacher credentials via WhatsApp (using template or text fallback).
 * Note: OTP and verification codes are strictly sent via email only.
 */

export interface SendWhatsAppCredentialsParams {
  toPhone: string;
  teacherName: string;
  schoolName: string;
  email: string;
  password: string;
  loginUrl: string;
}

export interface WhatsAppSendResult {
  sent: boolean;
  messageId?: string;
  method?: 'template' | 'text';
  error?: string;
}

/**
 * Normalizes a phone number into WhatsApp international E.164-compatible format without '+' or spaces.
 * Example: '9876543210' -> '919876543210'
 * Example: '+91 98765 43210' -> '919876543210'
 * Example: '09876543210' -> '919876543210'
 */
export function formatPhoneNumberForWhatsApp(
  phone: string,
  defaultCountryCode = '91'
): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');

  if (!digits) return '';

  // 10-digit Indian standard mobile number
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }

  // 11 digits starting with 0 (e.g. trunk prefix 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  // Already includes country code or international format (11 to 15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return digits;
}

export async function sendWhatsAppTeacherCredentials(
  params: SendWhatsAppCredentialsParams
): Promise<WhatsAppSendResult> {
  const { toPhone, teacherName, schoolName, email, password, loginUrl } = params;

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim() || 'teacher_credentials';
  const configuredLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'en_US';

  if (!accessToken || !phoneId) {
    console.warn('[whatsapp] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured — skipping WhatsApp delivery for', toPhone);
    return { sent: false, error: 'WhatsApp credentials not configured' };
  }

  const formattedTo = formatPhoneNumberForWhatsApp(toPhone);
  if (!formattedTo || formattedTo.length < 10) {
    console.warn('[whatsapp] Invalid phone number provided:', toPhone);
    return { sent: false, error: `Invalid recipient phone number: "${toPhone}"` };
  }

  const safeLoginUrl = loginUrl.includes('localhost')
    ? loginUrl.replace(/http:\/\/localhost(:\d+)?/g, 'https://timetablepro.webncode.in')
    : loginUrl;

  const apiUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  // 1. Attempt template message first if templateName is configured
  if (templateName) {
    const candidateLangs = [configuredLang];
    if (configuredLang === 'en_US') candidateLangs.push('en');
    else if (configuredLang === 'en') candidateLangs.push('en_US');

    for (const lang of candidateLangs) {
      try {
        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: lang,
            },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: teacherName },
                  { type: 'text', text: `${schoolName} - TimeTablePro` },
                  { type: 'text', text: email },
                  { type: 'text', text: password },
                  { type: 'text', text: safeLoginUrl },
                ],
              },
            ],
          },
        };

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.messages?.[0]?.id) {
          const messageId = data.messages[0].id;
          console.log(`[whatsapp] Credentials template "${templateName}" sent to ${formattedTo} (ID: ${messageId})`);
          return { sent: true, messageId, method: 'template' };
        }

        const details = data?.error?.error_data?.details || data?.error?.message;
        console.warn(`[whatsapp] Template "${templateName}" (${lang}) send returned error:`, details);

        // If error is NOT about translation/template nonexistence, don't keep retrying other languages
        if (!details?.toLowerCase()?.includes('does not exist')) {
          break;
        }
      } catch (templateErr) {
        console.error(`[whatsapp] Error calling WhatsApp template endpoint (${lang}):`, templateErr);
      }
    }
  }

  // 2. Fallback to direct formatted WhatsApp text message
  try {
    const messageText =
      `*Welcome to ${schoolName} - TimeTablePro*\n\n` +
      `Hello *${teacherName}*,\n` +
      `Your teacher portal account has been created successfully. Use the details below to log in:\n\n` +
      `🔗 *Portal Login:* ${safeLoginUrl}\n` +
      `📧 *Email:* ${email}\n` +
      `🔑 *Password:* ${password}\n\n` +
      `_Note: Please change your password after your first login for account security._`;


    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText,
      },
    };

    const textRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(textPayload),
    });

    const textData = await textRes.json();

    if (textRes.ok && textData.messages?.[0]?.id) {
      const messageId = textData.messages[0].id;
      console.log(`[whatsapp] Credentials text message sent to ${formattedTo} (ID: ${messageId})`);
      return { sent: true, messageId, method: 'text' };
    }

    const errorMsg =
      textData?.error?.error_data?.details ||
      textData?.error?.message ||
      'WhatsApp API request failed';
    console.error(`[whatsapp] Failed to send credentials to ${formattedTo}:`, errorMsg);
    return { sent: false, error: errorMsg };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown WhatsApp dispatch error';
    console.error('[whatsapp] Exception during WhatsApp dispatch:', errorMsg);
    return { sent: false, error: errorMsg };
  }
}
