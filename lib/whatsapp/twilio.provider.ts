import { WhatsAppProvider, SendWhatsAppOptions, SendWhatsAppResult } from './types';

/**
 * Normalizes phone numbers to standard E.164 format.
 * Supports Indian mobile numbers (10 digits, with or without +91 / 0 prefix)
 * and international standard E.164 formats.
 */
export function normalizePhoneNumber(rawPhone: string): { valid: boolean; e164?: string; formattedWhatsApp?: string; error?: string } {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Phone number is empty or not provided.' };
  }

  // Remove whitespace, dashes, parentheses, dots
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Strip leading "whatsapp:" if passed in
  if (cleaned.toLowerCase().startsWith('whatsapp:')) {
    cleaned = cleaned.substring(9);
  }

  // Handle Indian Numbers (10 digits)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+91${cleaned}`;
  } else if (/^0[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+91${cleaned.substring(1)}`;
  } else if (/^91[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+${cleaned}`;
  } else if (!cleaned.startsWith('+')) {
    // If not starting with +, but has international digits, prepend +
    if (/^\d{10,15}$/.test(cleaned)) {
      cleaned = `+${cleaned}`;
    }
  }

  // Final E.164 check (+ followed by 10-15 digits)
  if (!/^\+[1-9]\d{9,14}$/.test(cleaned)) {
    return {
      valid: false,
      error: `Invalid phone number format: "${rawPhone.replace(/\d(?=\d{4})/g, '*')}". Expected a valid 10-digit Indian number or international E.164 format.`,
    };
  }

  return {
    valid: true,
    e164: cleaned,
    formattedWhatsApp: `whatsapp:${cleaned}`,
  };
}

export class TwilioWhatsAppProvider implements WhatsAppProvider {
  public readonly name = 'twilio' as const;

  public validateConfiguration(): { valid: boolean; missingVariables: string[]; message?: string } {
    const missing: string[] = [];

    const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const apiKeySid = (process.env.TWILIO_API_KEY_SID || '').trim();
    const apiKeySecret = (process.env.TWILIO_API_KEY_SECRET || '').trim();
    const whatsappFrom = (process.env.TWILIO_WHATSAPP_FROM || '').trim();

    if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
    if (!apiKeySid) missing.push('TWILIO_API_KEY_SID');
    if (!apiKeySecret) missing.push('TWILIO_API_KEY_SECRET');
    if (!whatsappFrom) missing.push('TWILIO_WHATSAPP_FROM');

    if (missing.length > 0) {
      return {
        valid: false,
        missingVariables: missing,
        message: `Missing required Twilio configuration: ${missing.join(', ')}`,
      };
    }

    return {
      valid: true,
      missingVariables: [],
      message: 'Twilio WhatsApp API Key configuration is valid.',
    };
  }

  public async sendMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
    const { to, message, notificationType, userId } = options;

    // 1. Validate configuration
    const configCheck = this.validateConfiguration();
    if (!configCheck.valid) {
      console.error(`[TwilioWhatsAppProvider] Configuration error: ${configCheck.message}`);
      return {
        success: false,
        status: 'FAILED',
        provider: 'twilio',
        error: configCheck.message,
      };
    }

    // 2. Validate and normalize recipient phone
    const normalized = normalizePhoneNumber(to);
    if (!normalized.valid || !normalized.formattedWhatsApp) {
      console.warn(`[TwilioWhatsAppProvider] Invalid recipient phone for user ${userId || 'unknown'}: ${normalized.error}`);
      return {
        success: false,
        status: 'FAILED',
        provider: 'twilio',
        error: normalized.error,
      };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID!.trim();
    const apiKeySid = process.env.TWILIO_API_KEY_SID!.trim();
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!.trim();
    let fromNumber = process.env.TWILIO_WHATSAPP_FROM!.trim();

    const normalizedFrom = normalizePhoneNumber(fromNumber);
    if (normalizedFrom.valid && normalizedFrom.formattedWhatsApp) {
      fromNumber = normalizedFrom.formattedWhatsApp;
    } else if (!fromNumber.startsWith('whatsapp:')) {
      fromNumber = `whatsapp:${fromNumber.replace(/[\s\-\(\)\.]/g, '')}`;
    }

    // 3. Prepare Twilio REST API Request with API Key Basic Auth
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64');

    const params = new URLSearchParams();
    params.append('From', fromNumber);
    params.append('To', normalized.formattedWhatsApp);
    params.append('Body', message);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const twilioErrorCode = data.code;
        const twilioErrorMessage = data.message || response.statusText;

        let userSafeError = `Twilio API Error (${response.status}): ${twilioErrorMessage}`;

        // Specialized Sandbox & Template Guidance
        if (twilioErrorCode === 21608 || twilioErrorCode === 63016) {
          userSafeError = `Sandbox restriction (Error ${twilioErrorCode}): Recipient has not joined the Twilio WhatsApp Sandbox. Recipient must send the Sandbox join code to ${fromNumber}.`;
        } else if (twilioErrorCode === 21654) {
          userSafeError = `Session Window / Template Required (Error 21654): To send a freeform message, the recipient (+917358095641) must first send a WhatsApp message to ${fromNumber} to open an active 24-hour session, or a pre-approved Twilio Content Template (ContentSid) is required.`;
        } else if (twilioErrorCode === 21211) {
          userSafeError = `Twilio invalid phone number (Error 21211): ${normalized.e164} is not a valid WhatsApp-enabled number.`;
        } else if (twilioErrorCode === 20003) {
          userSafeError = `Twilio authentication failed (Error 20003): Invalid API Key SID, Secret, or Auth Token.`;
        }

        console.error(`[TwilioWhatsAppProvider] Delivery failed: code=${twilioErrorCode || 'N/A'}, reason="${userSafeError}"`);

        return {
          success: false,
          status: 'FAILED',
          provider: 'twilio',
          error: userSafeError,
          recipientPhone: normalized.e164,
        };
      }

      const messageSid = data.sid;
      console.log(`[TwilioWhatsAppProvider] WhatsApp sent successfully. SID=${messageSid}, To=${normalized.e164}, Type=${notificationType || 'TEST'}`);

      return {
        success: true,
        status: 'SENT',
        provider: 'twilio',
        messageId: messageSid,
        recipientPhone: normalized.e164,
      };
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError';
      const safeErrorMsg = isTimeout
        ? 'Twilio API request timed out after 15 seconds.'
        : `Network error connecting to Twilio: ${err.message || 'Unknown network error'}`;

      console.error(`[TwilioWhatsAppProvider] Exception during send: ${safeErrorMsg}`);

      return {
        success: false,
        status: 'FAILED',
        provider: 'twilio',
        error: safeErrorMsg,
        recipientPhone: normalized.e164,
      };
    }
  }
}

export const twilioWhatsAppProvider = new TwilioWhatsAppProvider();
