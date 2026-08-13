export function getOpportunityEmailTemplate(params: {
  title: string;
  organization: string;
  type: string;
  location: string;
  deadline: string;
  description: string;
  link: string;
  recipientName: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 24px;">CareerAI</h2>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin-bottom: 24px;" />
      
      <h3 style="color: #333; margin-bottom: 16px;">New Opportunity Available</h3>
      <p style="color: #555; margin-bottom: 20px;">Hello ${params.recipientName},</p>
      
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <h4 style="margin-top: 0; margin-bottom: 12px; color: #111;">${params.title}</h4>
        <p style="margin: 4px 0; color: #444;"><strong>Organization:</strong> ${params.organization}</p>
        <p style="margin: 4px 0; color: #444;"><strong>Type:</strong> ${params.type}</p>
        <p style="margin: 4px 0; color: #444;"><strong>Location:</strong> ${params.location}</p>
        <p style="margin: 4px 0; color: #444;"><strong>Deadline:</strong> ${params.deadline}</p>
      </div>

      <p style="color: #666; line-height: 1.5; margin-bottom: 24px;">
        ${params.description}
      </p>

      <a href="${params.link}" style="display: inline-block; background-color: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold;">
        View Opportunity
      </a>
      
      <div style="margin-top: 40px; color: #888; font-size: 12px;">
        <p>Regards,</p>
        <p>CareerAI Team</p>
      </div>
    </div>
  `;
}

export function getMentorMessageEmailTemplate(params: {
  title: string;
  message: string;
  mentorName: string;
  recipientName: string;
  link: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 24px;">CareerAI</h2>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin-bottom: 24px;" />
      
      <h3 style="color: #333; margin-bottom: 16px;">${params.title}</h3>
      <p style="color: #555; margin-bottom: 20px;">Hello ${params.recipientName},</p>
      
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 24px; color: #444; line-height: 1.5; white-space: pre-wrap;">
        ${params.message}
      </div>

      <p style="color: #666; margin-bottom: 24px;">
        Message from your mentor: <strong>${params.mentorName}</strong>
      </p>

      <a href="${params.link}" style="display: inline-block; background-color: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold;">
        View Dashboard
      </a>
      
      <div style="margin-top: 40px; color: #888; font-size: 12px;">
        <p>Regards,</p>
        <p>CareerAI Team</p>
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 24px;">CareerAI</h2>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin-bottom: 24px;" />
      
      <h3 style="color: #333; margin-bottom: 16px;">New Login to Your Account</h3>
      <p style="color: #555; margin-bottom: 20px;">Hello ${params.recipientName},</p>
      
      <p style="color: #555; margin-bottom: 20px;">
        Your CareerAI account was recently accessed.
      </p>

      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="margin: 4px 0; color: #444;"><strong>Time:</strong> ${params.time}</p>
        ${params.ip ? `<p style="margin: 4px 0; color: #444;"><strong>IP Address:</strong> ${params.ip}</p>` : ''}
        ${params.userAgent ? `<p style="margin: 4px 0; color: #444;"><strong>Device:</strong> ${params.userAgent}</p>` : ''}
      </div>

      <p style="color: #666; line-height: 1.5; margin-bottom: 24px;">
        If this was not you, please secure your account immediately by changing your password.
      </p>
      
      <div style="margin-top: 40px; color: #888; font-size: 12px;">
        <p>Regards,</p>
        <p>CareerAI Team</p>
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
  link: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 24px;">CareerAI</h2>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin-bottom: 24px;" />
      
      <h3 style="color: #333; margin-bottom: 16px;">🔔 ${params.title}</h3>
      <p style="color: #555; margin-bottom: 20px;">Hello ${params.recipientName},</p>
      
      ${params.category ? `<p style="color: #4f46e5; font-weight: bold; margin-bottom: 12px;">Category: ${params.category}</p>` : ''}

      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 24px; color: #444; line-height: 1.5; white-space: pre-wrap;">
        ${params.message}
      </div>

      ${params.dueDate ? `<p style="color: #dc2626; font-weight: bold; margin-bottom: 20px;">Due Date: ${params.dueDate}</p>` : ''}

      <p style="color: #666; margin-bottom: 24px;">
        Reminder from mentor: <strong>${params.mentorName}</strong>
      </p>

      <a href="${params.link}" style="display: inline-block; background-color: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold;">
        Open Dashboard
      </a>
      
      <div style="margin-top: 40px; color: #888; font-size: 12px;">
        <p>Regards,</p>
        <p>CareerAI Team</p>
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 24px;">CareerAI</h2>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin-bottom: 24px;" />
      
      <h3 style="color: #333; margin-bottom: 16px;">Password Reset Request</h3>
      <p style="color: #555; margin-bottom: 20px;">Hello ${params.recipientName},</p>
      
      <p style="color: #555; margin-bottom: 20px;">
        We received a request to reset your password for your CareerAI account.
      </p>

      ${
        params.otp
          ? `
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 14px; color: #666;">Your One-Time Verification Code (OTP):</span>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; margin-top: 8px;">${params.otp}</div>
          </div>
        `
          : ''
      }

      <div style="margin-bottom: 24px;">
        <a href="${params.resetLink}" style="display: inline-block; background-color: #4f46e5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </div>

      <p style="color: #666; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">
        If you did not request a password reset, please ignore this email or contact support if you have concerns.
      </p>
      
      <div style="margin-top: 40px; color: #888; font-size: 12px;">
        <p>Regards,</p>
        <p>CareerAI Team</p>
      </div>
    </div>
  `;
}

