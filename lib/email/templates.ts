export function getOpportunityEmailTemplate(params: {
  title: string;
  organization: string;
  type: string;
  location: string;
  deadline: string;
  description: string;
  link?: string;
  recipientName: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: bold;">CareerAI</h2>
        <p style="color: #6b7280; margin: 0; font-size: 13px;">Career Management Platform</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 16px 0 24px 0;" />

      <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">Hello <strong>${params.recipientName}</strong>,</p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 20px 0;">A new opportunity has been posted on CareerAI.</p>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
        <p style="margin: 6px 0; color: #1f2937; font-size: 14px;"><strong>Opportunity:</strong> ${params.title}</p>
        <p style="margin: 6px 0; color: #1f2937; font-size: 14px;"><strong>Organization:</strong> ${params.organization}</p>
        <p style="margin: 6px 0; color: #1f2937; font-size: 14px;"><strong>Type:</strong> ${params.type}</p>
        <p style="margin: 6px 0; color: #1f2937; font-size: 14px;"><strong>Location:</strong> ${params.location || 'Online'}</p>
        <p style="margin: 6px 0; color: #1f2937; font-size: 14px;"><strong>Deadline:</strong> ${params.deadline}</p>
      </div>

      <div style="margin-bottom: 24px;">
        <p style="color: #1f2937; font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">Description:</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${params.description}</p>
      </div>

      <p style="color: #374151; font-size: 14px; margin: 0 0 24px 0;">
        You can view the opportunity and register through the CareerAI platform.
      </p>

      ${
        params.link
          ? `
        <div style="margin-bottom: 30px;">
          <a href="${params.link}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-size: 14px; font-weight: bold;">
            View Opportunity & Register
          </a>
        </div>
      `
          : ''
      }

      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
      <div style="color: #4b5563; font-size: 13px; line-height: 1.5;">
        <p style="margin: 2px 0;">Regards,</p>
        <p style="margin: 2px 0; font-weight: bold; color: #1f2937;">CareerAI</p>
        <p style="margin: 2px 0; color: #6b7280;">Career Management Platform</p>
      </div>
    </div>
  `;
}

export function getMentorMessageEmailTemplate(params: {
  title?: string;
  message: string;
  mentorName: string;
  recipientName: string;
  dueDate?: string;
  link?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: bold;">CareerAI</h2>
        <p style="color: #6b7280; margin: 0; font-size: 13px;">Career Management Platform</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 16px 0 24px 0;" />

      <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">Hello <strong>${params.recipientName}</strong>,</p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 20px 0;">Your mentor <strong>${params.mentorName}</strong> has sent you a message.</p>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
        <p style="color: #1f2937; font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">Message:</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${params.message}</p>
        ${params.dueDate ? `<p style="margin: 12px 0 0 0; color: #dc2626; font-size: 13px; font-weight: bold;">Due Date: ${params.dueDate}</p>` : ''}
      </div>

      <p style="color: #374151; font-size: 14px; margin: 0 0 24px 0;">
        Please check your CareerAI dashboard for more details.
      </p>

      ${
        params.link
          ? `
        <div style="margin-bottom: 30px;">
          <a href="${params.link}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-size: 14px; font-weight: bold;">
            Open Dashboard
          </a>
        </div>
      `
          : ''
      }

      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
      <div style="color: #4b5563; font-size: 13px; line-height: 1.5;">
        <p style="margin: 2px 0;">Regards,</p>
        <p style="margin: 2px 0; font-weight: bold; color: #1f2937;">CareerAI</p>
        <p style="margin: 2px 0; color: #6b7280;">Career Management Platform</p>
      </div>
    </div>
  `;
}

export function getMentorReminderEmailTemplate(params: {
  title: string;
  category?: string;
  message: string;
  dueDate?: string;
  mentorName: string;
  recipientName: string;
  link?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: bold;">CareerAI</h2>
        <p style="color: #6b7280; margin: 0; font-size: 13px;">Career Management Platform</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 16px 0 24px 0;" />

      <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">Hello <strong>${params.recipientName}</strong>,</p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 20px 0;">Your mentor <strong>${params.mentorName}</strong> has sent you a reminder.</p>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
        ${params.category ? `<p style="color: #4f46e5; font-size: 13px; font-weight: bold; margin: 0 0 8px 0;">Category: ${params.category}</p>` : ''}
        <p style="color: #1f2937; font-size: 14px; font-weight: bold; margin: 0 0 6px 0;">Subject: ${params.title}</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 8px 0 0 0; white-space: pre-wrap;">${params.message}</p>
        ${params.dueDate ? `<p style="margin: 12px 0 0 0; color: #dc2626; font-size: 13px; font-weight: bold;">Due Date: ${params.dueDate}</p>` : ''}
      </div>

      <p style="color: #374151; font-size: 14px; margin: 0 0 24px 0;">
        Please check your CareerAI dashboard for more details.
      </p>

      ${
        params.link
          ? `
        <div style="margin-bottom: 30px;">
          <a href="${params.link}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-size: 14px; font-weight: bold;">
            Open Dashboard
          </a>
        </div>
      `
          : ''
      }

      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
      <div style="color: #4b5563; font-size: 13px; line-height: 1.5;">
        <p style="margin: 2px 0;">Regards,</p>
        <p style="margin: 2px 0; font-weight: bold; color: #1f2937;">CareerAI</p>
        <p style="margin: 2px 0; color: #6b7280;">Career Management Platform</p>
      </div>
    </div>
  `;
}

export function getHODAnnouncementEmailTemplate(params: {
  title: string;
  message: string;
  senderName: string;
  recipientName: string;
  link?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: bold;">CareerAI</h2>
        <p style="color: #6b7280; margin: 0; font-size: 13px;">Career Management Platform</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 16px 0 24px 0;" />

      <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">Hello <strong>${params.recipientName}</strong>,</p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 20px 0;">Announcement from Head of Department: <strong>${params.senderName}</strong></p>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #111827; font-size: 15px;">📢 ${params.title}</h4>
        <div style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${params.message}</div>
      </div>

      <p style="color: #374151; font-size: 14px; margin: 0 0 24px 0;">
        You can view this announcement and further updates in your CareerAI dashboard.
      </p>

      ${
        params.link
          ? `
        <div style="margin-bottom: 30px;">
          <a href="${params.link}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-size: 14px; font-weight: bold;">
            Open CareerAI
          </a>
        </div>
      `
          : ''
      }

      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
      <div style="color: #4b5563; font-size: 13px; line-height: 1.5;">
        <p style="margin: 2px 0;">Regards,</p>
        <p style="margin: 2px 0; font-weight: bold; color: #1f2937;">CareerAI</p>
        <p style="margin: 2px 0; color: #6b7280;">Career Management Platform</p>
      </div>
    </div>
  `;
}

export function getLoginAlertEmailTemplate(params: {
  recipientName: string;
  time: string;
  userAgent?: string;
  ip?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: bold;">CareerAI</h2>
        <p style="color: #6b7280; margin: 0; font-size: 13px;">Career Management Platform</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 16px 0 24px 0;" />

      <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">New Login to Your Account</h3>
      <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">Hello <strong>${params.recipientName}</strong>,</p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 20px 0;">Your CareerAI account was recently accessed.</p>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 18px; border-radius: 6px; margin-bottom: 24px;">
        <p style="margin: 4px 0; color: #1f2937; font-size: 13px;"><strong>Time:</strong> ${params.time}</p>
        ${params.ip ? `<p style="margin: 4px 0; color: #1f2937; font-size: 13px;"><strong>IP Address:</strong> ${params.ip}</p>` : ''}
        ${params.userAgent ? `<p style="margin: 4px 0; color: #1f2937; font-size: 13px;"><strong>Device:</strong> ${params.userAgent}</p>` : ''}
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 24px 0;">
        If this was not you, please secure your account immediately by changing your password.
      </p>

      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
      <div style="color: #4b5563; font-size: 13px; line-height: 1.5;">
        <p style="margin: 2px 0;">Regards,</p>
        <p style="margin: 2px 0; font-weight: bold; color: #1f2937;">CareerAI</p>
        <p style="margin: 2px 0; color: #6b7280;">Career Management Platform</p>
      </div>
    </div>
  `;
}

export function getPasswordResetEmailTemplate(params: {
  recipientName: string;
  resetLink: string;
  otp?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: bold;">CareerAI</h2>
        <p style="color: #6b7280; margin: 0; font-size: 13px;">Career Management Platform</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 16px 0 24px 0;" />

      <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Password Reset Request</h3>
      <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">Hello <strong>${params.recipientName}</strong>,</p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 20px 0;">
        We received a request to reset your password for your CareerAI account.
      </p>

      ${
        params.otp
          ? `
          <div style="background-color: #f3f4f6; padding: 18px; border-radius: 6px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 13px; color: #6b7280;">Your One-Time Verification Code (OTP):</span>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; margin-top: 8px;">${params.otp}</div>
          </div>
        `
          : ''
      }

      <div style="margin-bottom: 24px;">
        <a href="${params.resetLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: bold;">
          Reset Password
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 24px 0;">
        If you did not request a password reset, please ignore this email or contact support if you have concerns.
      </p>

      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
      <div style="color: #4b5563; font-size: 13px; line-height: 1.5;">
        <p style="margin: 2px 0;">Regards,</p>
        <p style="margin: 2px 0; font-weight: bold; color: #1f2937;">CareerAI</p>
        <p style="margin: 2px 0; color: #6b7280;">Career Management Platform</p>
      </div>
    </div>
  `;
}



