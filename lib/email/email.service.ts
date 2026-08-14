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
 * Validates whether an email string has a standard valid email format.
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const clean = email.trim();
  if (!clean || clean.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
    if (!from) {
      console.warn('Cannot send email: SMTP FROM_EMAIL/SMTP_USER is not configured.');
      return { success: false, error: 'Sender email not configured' };
    }

    if (Array.isArray(to)) {
      const validRecipients = to.filter((recipient) => {
        if (!isValidEmail(recipient)) {
          console.warn(`Cannot send email: User does not have a valid email address (${recipient}).`);
          return false;
        }
        return true;
      });

      if (validRecipients.length === 0) {
        console.warn('Cannot send email: No valid recipient email addresses found.');
        return { success: false, count: 0 };
      }

      const results = await Promise.allSettled(
        validRecipients.map(async (recipient) => {
          try {
            const info = await transporter.sendMail({
              from,
              to: recipient.trim(),
              subject,
              html,
              text,
            });
            console.log(`Email sent successfully to ${recipient} (messageId: ${info.messageId})`);
            return info;
          } catch (err: any) {
            console.error(`Email delivery failed for ${recipient}: ${err?.message || err}`);
            throw err;
          }
        })
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`Sent ${successful}/${validRecipients.length} emails for subject "${subject}"`);
      return { success: successful > 0, count: successful };
    }

    if (!isValidEmail(to)) {
      console.warn(`Cannot send email: User does not have a valid email address (${to}).`);
      return { success: false, error: 'Invalid recipient email' };
    }

    try {
      const mailOptions = {
        from,
        to: to.trim(),
        subject,
        html,
        text,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to} (messageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`Email delivery failed for ${to}: ${err?.message || err}`);
      return { success: false, error: err?.message || err };
    }
  } catch (error: any) {
    console.error('Error sending email:', error?.message || error);
    // Don't throw error to avoid crashing caller flow
    return { success: false, error: error?.message || error };
  }
}

