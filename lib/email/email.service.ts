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

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

    if (Array.isArray(to)) {
      const results = await Promise.allSettled(
        to.map((recipient) =>
          transporter.sendMail({
            from,
            to: recipient,
            subject,
            html,
            text,
          })
        )
      );
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`Sent ${successful}/${to.length} emails for subject "${subject}"`);
      return { success: successful > 0, count: successful };
    }

    const mailOptions = {
      from,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw the error, return failure so main user flow is not interrupted
    return { success: false, error };
  }
}
