import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Known demo, placeholder, or unroutable test domains that should not receive real SMTP emails.
 */
export const DEMO_OR_UNROUTABLE_DOMAINS = [
  'student.careerai.edu',
  'careerai.edu',
  'demo.com',
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'invalid.com',
  'invalid',
  'local',
  'localhost',
];

/**
 * Checks if a domain is a known demo or unroutable domain.
 */
export function isDemoDomain(domain: string): boolean {
  if (!domain) return true;
  const d = domain.trim().toLowerCase();
  return (
    DEMO_OR_UNROUTABLE_DOMAINS.includes(d) ||
    d.endsWith('.careerai.edu') ||
    d.endsWith('.example') ||
    d.endsWith('.test') ||
    d.endsWith('.invalid') ||
    d.endsWith('.localhost') ||
    d.endsWith('.local')
  );
}

/**
 * Validates whether an email string has a standard valid email format.
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const clean = email.trim();
  if (!clean || clean.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

/**
 * Checks if an email is deliverable (valid syntax and NOT a demo/unroutable domain).
 */
export function isDeliverableEmail(email: unknown): boolean {
  if (!isValidEmail(email)) return false;
  const clean = (email as string).trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = clean.slice(atIndex + 1);
  return !isDemoDomain(domain);
}

/**
 * Detailed validation result for recipient emails.
 */
export function validateRecipientEmail(email: unknown): {
  valid: boolean;
  deliverable: boolean;
  cleanEmail?: string;
  reason?: 'EMPTY' | 'INVALID_FORMAT' | 'DEMO_DOMAIN';
  message?: string;
} {
  if (typeof email !== 'string' || !email.trim()) {
    return { valid: false, deliverable: false, reason: 'EMPTY', message: 'No recipient email provided' };
  }
  const clean = email.trim();
  if (!isValidEmail(clean)) {
    return { valid: false, deliverable: false, cleanEmail: clean, reason: 'INVALID_FORMAT', message: `Invalid email format (${clean})` };
  }
  const domain = clean.slice(clean.lastIndexOf('@') + 1).toLowerCase();
  if (isDemoDomain(domain)) {
    return {
      valid: true,
      deliverable: false,
      cleanEmail: clean,
      reason: 'DEMO_DOMAIN',
      message: `Recipient email belongs to demo/fake domain (${domain})`
    };
  }
  return { valid: true, deliverable: true, cleanEmail: clean };
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
    if (!from) {
      console.warn('Cannot send email: SMTP FROM_EMAIL/SMTP_USER is not configured.');
      return { success: false, error: 'Sender email not configured' };
    }

    if (Array.isArray(to)) {
      const deliverableRecipients: string[] = [];
      const skippedRecipients: { email: string; reason: string }[] = [];

      for (const recipient of to) {
        const validation = validateRecipientEmail(recipient);
        if (validation.deliverable && validation.cleanEmail) {
          deliverableRecipients.push(validation.cleanEmail);
        } else {
          skippedRecipients.push({
            email: String(recipient),
            reason: validation.message || 'Invalid or demo email address',
          });
          console.warn(`[EmailService] Cannot send email: ${validation.message || 'No valid recipient email'} (${recipient}). Delivery skipped.`);
        }
      }

      if (deliverableRecipients.length === 0) {
        console.warn(`[EmailService] Cannot send email: No valid deliverable recipient email addresses found (${skippedRecipients.length} demo/invalid addresses skipped).`);
        return {
          success: false,
          count: 0,
          skippedCount: skippedRecipients.length,
          error: 'No valid recipient email (all addresses are demo or invalid)',
        };
      }

      const results = await Promise.allSettled(
        deliverableRecipients.map(async (recipient) => {
          try {
            const info = await transporter.sendMail({
              from,
              to: recipient.trim(),
              subject,
              html,
              text,
            });
            console.log(`[EmailService] Email sent successfully to ${recipient} (messageId: ${info.messageId})`);
            return info;
          } catch (err: any) {
            console.error(`[EmailService] Email delivery failed for ${recipient}: ${err?.message || err}`);
            throw err;
          }
        })
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`[EmailService] Sent ${successful}/${deliverableRecipients.length} emails for subject "${subject}" (${skippedRecipients.length} demo addresses skipped)`);
      return {
        success: successful > 0,
        count: successful,
        skippedCount: skippedRecipients.length,
      };
    }

    const validation = validateRecipientEmail(to);

    if (!validation.deliverable) {
      if (validation.reason === 'DEMO_DOMAIN') {
        console.warn(`[EmailService] Cannot send email: ${to} belongs to demo/fake domain. Delivery skipped gracefully.`);
        return {
          success: false,
          skipped: true,
          error: `No valid recipient email (demo/fake domain: ${to})`,
        };
      }
      console.warn(`[EmailService] Cannot send email: User does not have a valid email address (${to}).`);
      return { success: false, error: 'No valid recipient email' };
    }

    try {
      const mailOptions = {
        from,
        to: validation.cleanEmail!,
        subject,
        html,
        text,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent successfully to ${validation.cleanEmail} (messageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService] Email delivery failed for ${to}: ${err?.message || err}`);
      return { success: false, error: err?.message || err };
    }
  } catch (error: any) {
    console.error('[EmailService] Error sending email:', error?.message || error);
    // Don't throw error to avoid crashing caller flow
    return { success: false, error: error?.message || error };
  }
}
